/**
 * D4 — Shared dashboard summary contracts.
 *
 * Operational sales = stored order totals for the business day (not audited accounting).
 * Table-service metrics = reservations + live floor + waitlist (stored data only).
 * System health is restricted to technical/authorized roles.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchReadinessService } from "../branches/readiness.js";
import type { ReservationsService } from "../reservations/management.js";
import type { TableServiceOperations } from "../dine-in/table-service.js";
import type { OutboxWorker } from "../notifications/outbox-worker.js";

export type DashboardActorScope = {
  userId: string;
  isSuperAdmin: boolean;
  roles: string[];
  branchIds: string[];
  permissions: string[];
};

export type TableServiceDashboardSummary = {
  generatedAt: string;
  branchId: string;
  branchCode: string | null;
  branchStatus: string;
  definitions: Record<string, string>;
  reservations: {
    todayTotal: number;
    confirmed: number;
    pending: number;
    arrived: number;
    noShows: number;
    cancellations: number;
    seatedCovers: number;
    coversBooked: number;
  };
  floor: {
    availableTables: number;
    occupiedTables: number;
    cleaningTables: number;
    totalActiveTables: number;
    seatedCovers: number;
    billRequests: number;
    paymentPending: number;
    activeSessions: number;
    waitlistCount: number;
    seatingConflicts: number;
    upcomingArrivals: number;
  };
  averages: {
    averageWaitMinutes: number | null;
    averageTableTurnMinutes: number | null;
    note: string;
  };
  occupancyByBranch: Array<{
    branchId: string;
    branchCode: string | null;
    occupiedTables: number;
    availableTables: number;
    waitlistCount: number;
  }> | null;
};

export type SystemHealthSummary = {
  generatedAt: string;
  api: { status: "ok" | "degraded"; supabaseConfigured: boolean };
  database: { status: "ready" | "unavailable"; note: string };
  notifications: {
    emailMode: string;
    workerReachable: boolean;
    pendingOutboxSample: number | null;
  };
  configurationWarnings: string[];
  correlationHint: string;
};

function todayKarachiDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function canReadTableService(scope: DashboardActorScope): boolean {
  return (
    scope.isSuperAdmin ||
    scope.permissions.includes("reservation.read") ||
    scope.permissions.includes("reservation.manage") ||
    scope.permissions.includes("dinein.manage")
  );
}

/**
 * System health is platform-technical only.
 * Ordinary branch_manager / cashier / host / waiter / kitchen / delivery / staff
 * (including those with only `admin.access`) must not read system health.
 */
function canReadSystemHealth(scope: DashboardActorScope): boolean {
  return (
    scope.isSuperAdmin ||
    scope.roles.includes("super-admin") ||
    scope.permissions.includes("platform.health.read")
  );
}

function canReadOpeningReadiness(scope: DashboardActorScope): boolean {
  return (
    scope.isSuperAdmin ||
    scope.permissions.includes("branch.manage") ||
    scope.permissions.includes("admin.access") ||
    scope.permissions.includes("reservation.manage")
  );
}

export function createDashboardSummariesService(deps: {
  envStatus: EnvironmentStatus;
  reservations: ReservationsService;
  tableService: TableServiceOperations;
  branchReadiness: BranchReadinessService;
  outboxWorker: OutboxWorker;
}) {
  function getClient(): SupabaseClient {
    if (!deps.envStatus.isReady) {
      throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
    }
    return createClient(deps.envStatus.config.supabaseUrl, deps.envStatus.config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return {
    async getTableServiceSummary(
      scope: DashboardActorScope,
      branchId: string,
      options?: { includeOccupancyComparison?: boolean },
    ): Promise<TableServiceDashboardSummary> {
      if (!canReadTableService(scope)) {
        throw new ApiError(403, "DASHBOARD_ACCESS_DENIED", "Table-service dashboard requires reservation access.");
      }
      assertBranchMembership(
        { isSuperAdmin: scope.isSuperAdmin, branchIds: scope.branchIds },
        branchId,
      );

      const branch = await loadBranchRow(getClient(), branchId);
      const date = todayKarachiDate();
      const actor = {
        userId: scope.userId,
        isSuperAdmin: scope.isSuperAdmin,
        roles: scope.roles,
        branchIds: scope.branchIds,
      };
      const [reportRaw, floor] = await Promise.all([
        deps.reservations.getDailyReport(actor, branchId, date),
        deps.tableService.getLiveFloorState(actor, branchId),
      ]);
      const report = reportRaw as unknown as {
        totalReservations: number;
        byStatus: Record<string, number>;
        covers: number;
        seatedCovers: number;
        noShows: number;
        cancellations: number;
      };

      const tables = (floor.tables ?? []) as Array<{
        is_active?: boolean;
        operational_status?: string | null;
        session?: { partySize?: number | null; serviceStatus?: string | null } | null;
      }>;
      const activeTables = tables.filter((t) => t.is_active !== false);
      const occupied = activeTables.filter((t) => t.session != null);
      const cleaning = activeTables.filter(
        (t) => t.session == null && String(t.operational_status ?? "").toLowerCase() === "cleaning",
      );
      const available = activeTables.filter(
        (t) =>
          t.session == null && String(t.operational_status ?? "").toLowerCase() !== "cleaning",
      );
      const sessions = (floor.activeSessions ?? []) as Array<{
        serviceStatus?: string;
        partySize?: number | null;
        guestCount?: number | null;
      }>;
      const billRequests = sessions.filter((s) => s.serviceStatus === "bill_requested").length;
      const paymentPending = sessions.filter((s) => s.serviceStatus === "payment_pending").length;
      const seatedCovers = sessions.reduce(
        (sum, s) => sum + Number(s.partySize ?? s.guestCount ?? 0),
        0,
      );

      let occupancyByBranch: TableServiceDashboardSummary["occupancyByBranch"] = null;
      const wantComparison =
        options?.includeOccupancyComparison === true &&
        (scope.isSuperAdmin || new Set(scope.branchIds).size > 1);
      if (wantComparison) {
        const ids = scope.isSuperAdmin
          ? (
              await getClient().from("branches").select("id, branch_code").limit(50)
            ).data?.map((b) => ({ id: (b as { id: string }).id, code: (b as { branch_code: string }).branch_code })) ??
            []
          : scope.branchIds.map((id) => ({ id, code: null as string | null }));

        occupancyByBranch = [];
        for (const entry of ids.slice(0, 20)) {
          if (!scope.isSuperAdmin && !scope.branchIds.includes(entry.id)) continue;
          try {
            const f = await deps.tableService.getLiveFloorState(scope, entry.id);
            const t = (f.tables ?? []) as Array<{
              is_active?: boolean;
              operational_status?: string | null;
              session?: unknown;
            }>;
            const active = t.filter((row) => row.is_active !== false);
            const occ = active.filter((row) => row.session != null).length;
            const avail = active.filter(
              (row) =>
                row.session == null &&
                String(row.operational_status ?? "").toLowerCase() !== "cleaning",
            ).length;
            occupancyByBranch.push({
              branchId: entry.id,
              branchCode: entry.code,
              occupiedTables: occ,
              availableTables: avail,
              waitlistCount: f.waitlistCount ?? 0,
            });
          } catch {
            // Skip unauthorized/failed branch rows; do not invent zeros for failures.
          }
        }
      }

      return {
        generatedAt: new Date().toISOString(),
        branchId,
        branchCode: branch.branch_code,
        branchStatus: String(branch.status),
        definitions: {
          todayTotal: "Reservations with reservation_date = today (branch timezone calendar).",
          confirmed: "reservation_status = confirmed.",
          seatedCovers: "Party size on open dine-in sessions (seated through payment_pending).",
          availableTables: "Active tables without an open session and not cleaning.",
          occupiedTables: "Active tables with an open dine-in session.",
          billRequests: "Open sessions in service_status = bill_requested.",
          paymentPending: "Open sessions in service_status = payment_pending.",
          averageWaitMinutes: "Not yet derived from stored waitlist timestamps — null until measured.",
          averageTableTurnMinutes: "Not yet derived from session close durations — null until measured.",
          operationalGrossSales: "Order totals for the business day; not audited accounting revenue.",
        },
        reservations: {
          todayTotal: report.totalReservations,
          confirmed: report.byStatus["confirmed"] ?? 0,
          pending: report.byStatus["pending"] ?? 0,
          arrived: report.byStatus["arrived"] ?? 0,
          noShows: report.noShows,
          cancellations: report.cancellations,
          seatedCovers: report.seatedCovers,
          coversBooked: report.covers,
        },
        floor: {
          availableTables: available.length,
          occupiedTables: occupied.length,
          cleaningTables: cleaning.length,
          totalActiveTables: activeTables.length,
          seatedCovers,
          billRequests,
          paymentPending,
          activeSessions: sessions.length,
          waitlistCount: floor.waitlistCount ?? 0,
          seatingConflicts: (floor.conflicts ?? []).length,
          upcomingArrivals: (floor.upcomingReservations ?? []).length,
        },
        averages: {
          averageWaitMinutes: null,
          averageTableTurnMinutes: null,
          note: "Averages remain null until measured from stored timestamps; never fabricated.",
        },
        occupancyByBranch,
      };
    },

    async getSystemHealth(scope: DashboardActorScope): Promise<SystemHealthSummary> {
      if (!canReadSystemHealth(scope)) {
        throw new ApiError(403, "DASHBOARD_ACCESS_DENIED", "System health is restricted to technical roles.");
      }

      const warnings: string[] = [];
      const configured = deps.envStatus.isReady;
      if (!configured) warnings.push("Supabase environment is not fully configured.");

      let pendingOutbox: number | null = null;
      let workerReachable = false;
      if (configured) {
        try {
          const supabase = getClient();
          const { count, error } = await supabase
            .from("reservation_communications")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "queued", "failed"]);
          if (error) throw error;
          workerReachable = true;
          pendingOutbox = count ?? 0;
        } catch {
          workerReachable = false;
          warnings.push("Notification outbox could not be counted.");
        }
      }

      if (deps.envStatus.config.emailMode === "disabled" || deps.envStatus.config.emailMode === "mock") {
        warnings.push(
          `Email mode is ${deps.envStatus.config.emailMode}; guest notifications are not delivered externally.`,
        );
      }

      // Keep outboxWorker referenced so DI wiring stays intentional for future probes.
      void deps.outboxWorker;

      return {
        generatedAt: new Date().toISOString(),
        api: {
          status: configured ? "ok" : "degraded",
          supabaseConfigured: configured,
        },
        database: {
          status: configured ? "ready" : "unavailable",
          note: configured
            ? "Service-role client configured; readiness probes use stored configuration only."
            : "Database client unavailable.",
        },
        notifications: {
          emailMode: deps.envStatus.config.emailMode,
          workerReachable,
          pendingOutboxSample: pendingOutbox,
        },
        configurationWarnings: warnings,
        correlationHint: "Pass X-Correlation-Id on dashboard reads; responses echo request IDs when present.",
      };
    },

    async getOpeningReadiness(scope: DashboardActorScope, branchId: string) {
      if (!canReadOpeningReadiness(scope)) {
        throw new ApiError(
          403,
          "DASHBOARD_ACCESS_DENIED",
          "Opening readiness requires branch.manage, admin.access, or reservation.manage.",
        );
      }
      // Membership is re-asserted inside branch readiness.
      return deps.branchReadiness.getBranchReadiness(
        { isSuperAdmin: scope.isSuperAdmin, branchIds: scope.branchIds },
        branchId,
      );
    },
  };
}

export type DashboardSummariesService = ReturnType<typeof createDashboardSummariesService>;

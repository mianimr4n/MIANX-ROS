import {
  PREP_TARGET_MINUTES,
  elapsedMinutes,
  ticketTimerStartIso,
} from "@/lib/admin-kitchen";
import { isDispatchWaitingForRider } from "@/lib/operational-truth";
import type { AdminOperationsDashboard } from "@/lib/admin-api";
import type { OperationalState } from "@/lib/op-status";
import type {
  ExceptionCenterResult,
  ExceptionFreshness,
  ExceptionSeverity,
  ExceptionSourceStatus,
  OwnerException,
} from "@/lib/exception-center/types";

export type { ExceptionCenterResult, OwnerException } from "@/lib/exception-center/types";

export type KitchenTicketLike = {
  id: string;
  status: string;
  startedAt?: string | null;
  queuedAt?: string | null;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type DeliveryAssignmentLike = {
  id: string;
  status: string;
  orderStatus?: string | null;
  createdAt?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
};

export type ExceptionCenterInput = {
  branchId: string | null;
  branchName: string;
  nowMs?: number;
  ops: {
    data: AdminOperationsDashboard | null;
    state: OperationalState;
  };
  kitchen: {
    tickets: KitchenTicketLike[] | null;
    state: OperationalState;
  };
  delivery: {
    assignments: DeliveryAssignmentLike[] | null;
    state: OperationalState;
  };
  finance: {
    /** False when the principal cannot load finance attention (not a source failure). */
    enabled: boolean;
    unresolvedCashVariance: number | null;
    unavailable: boolean;
    state: OperationalState;
  };
};

const SEVERITY_RANK: Record<ExceptionSeverity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFORMATION: 2,
};

function mapFreshness(state: OperationalState, hasData: boolean): ExceptionFreshness {
  if (state === "ERROR" || state === "OFFLINE" || state === "UNAVAILABLE") return "UNAVAILABLE";
  if (state === "STALE") return "STALE";
  if (state === "LIVE") return "LIVE";
  if (hasData) return "FRESH";
  if (state === "LOADING") return "FRESH";
  return "UNAVAILABLE";
}

function sourceFailed(state: OperationalState, hasData: boolean): boolean {
  if (state === "ERROR" || state === "OFFLINE" || state === "UNAVAILABLE") return true;
  // Successful empty payloads use EMPTY/LIVE with [] — not failure.
  if (!hasData && state !== "LOADING" && state !== "EMPTY" && state !== "LIVE" && state !== "DERIVED" && state !== "FOUNDATION") {
    return true;
  }
  return false;
}

function sourceLoading(state: OperationalState, hasData: boolean): boolean {
  return state === "LOADING" && !hasData;
}

function mapAlertSeverity(raw: string): ExceptionSeverity {
  if (raw === "critical") return "CRITICAL";
  if (raw === "info") return "INFORMATION";
  return "WARNING";
}

function appendQuery(path: string, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const encoded = qs.toString();
  return encoded ? `${path}?${encoded}` : path;
}

/**
 * Build read-only Exception Center cards from already-fetched Owner dashboard sources.
 * Does not fetch, mutate, or invent records.
 */
export function buildExceptionCenter(input: ExceptionCenterInput): ExceptionCenterResult {
  const nowMs = input.nowMs ?? Date.now();
  const generatedAt = new Date(nowMs).toISOString();
  const exceptions: OwnerException[] = [];

  const opsHasData = input.ops.data != null;
  const kitchenHasData = input.kitchen.tickets != null;
  const deliveryHasData = input.delivery.assignments != null;
  const financeHasData =
    input.finance.enabled &&
    !input.finance.unavailable &&
    input.finance.unresolvedCashVariance != null;

  const sources: ExceptionSourceStatus[] = [
    {
      id: "ops-dashboard",
      label: "Operations dashboard",
      domain: "orders",
      failed: sourceFailed(input.ops.state, opsHasData),
      loading: sourceLoading(input.ops.state, opsHasData),
      stale: input.ops.state === "STALE",
    },
    {
      id: "kitchen-tickets",
      label: "Kitchen tickets",
      domain: "kitchen",
      failed: sourceFailed(input.kitchen.state, kitchenHasData),
      loading: sourceLoading(input.kitchen.state, kitchenHasData),
      stale: input.kitchen.state === "STALE",
    },
    {
      id: "delivery-assignments",
      label: "Delivery assignments",
      domain: "delivery",
      failed: sourceFailed(input.delivery.state, deliveryHasData),
      loading: sourceLoading(input.delivery.state, deliveryHasData),
      stale: input.delivery.state === "STALE",
    },
  ];

  if (input.finance.enabled) {
    sources.push({
      id: "finance-attention",
      label: "Finance attention",
      domain: "cash",
      failed: input.finance.unavailable || sourceFailed(input.finance.state, financeHasData),
      loading: sourceLoading(input.finance.state, financeHasData),
      stale: input.finance.state === "STALE",
    });
  }

  // --- EXC-KDS-DELAY: prefer live kitchen tickets; fall back to ops PREPARING_TOO_LONG ---
  if (kitchenHasData && input.kitchen.tickets) {
    const delayed = input.kitchen.tickets.filter((ticket) => {
      const status = String(ticket.status).toLowerCase();
      if (!["queued", "accepted", "preparing", "ready"].includes(status)) return false;
      return elapsedMinutes(
        ticketTimerStartIso({
          startedAt: ticket.startedAt ?? null,
          acceptedAt: ticket.acceptedAt ?? null,
          createdAt: ticket.createdAt,
        }),
        nowMs,
      ) >= PREP_TARGET_MINUTES;
    });
    if (delayed.length > 0) {
      const oldestMs = Math.min(
        ...delayed
          .map((t) =>
            new Date(
              ticketTimerStartIso({
                startedAt: t.startedAt ?? null,
                acceptedAt: t.acceptedAt ?? null,
                createdAt: t.createdAt,
              }),
            ).getTime(),
          )
          .filter(Number.isFinite),
      );
      exceptions.push({
        id: "EXC-KDS-DELAY",
        type: "EXC-KDS-DELAY",
        domain: "kitchen",
        severity: delayed.length >= 5 ? "CRITICAL" : "WARNING",
        title: "Delayed kitchen tickets",
        summary: `${delayed.length} open ticket${delayed.length === 1 ? "" : "s"} past the ${PREP_TARGET_MINUTES}-minute prep guide.`,
        count: delayed.length,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Kitchen tickets API",
        trustState: "DERIVED",
        observedAt: generatedAt,
        freshnessState: mapFreshness(input.kitchen.state, true),
        oldestAt: Number.isFinite(oldestMs) ? new Date(oldestMs).toISOString() : null,
        drillDown: {
          href: appendQuery("/admin/kitchen-dashboard", { view: "delayed" }),
          label: "Open delayed kitchen view",
        },
        limitation: `Prep guide is ${PREP_TARGET_MINUTES} minutes (operational guidance, not a contractual SLA).`,
      });
    }
  } else if (opsHasData && input.ops.data) {
    const preparingAlerts = input.ops.data.alerts.filter((a) => a.code === "PREPARING_TOO_LONG");
    if (preparingAlerts.length > 0) {
      const critical = preparingAlerts.some((a) => a.severity === "critical");
      exceptions.push({
        id: "EXC-KDS-DELAY",
        type: "EXC-KDS-DELAY",
        domain: "kitchen",
        severity: critical ? "CRITICAL" : "WARNING",
        title: "Delayed preparing orders",
        summary: `${preparingAlerts.length} order${preparingAlerts.length === 1 ? "" : "s"} preparing longer than the operations threshold.`,
        count: preparingAlerts.length,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Operations dashboard alerts",
        trustState: "DERIVED",
        observedAt: input.ops.data.generatedAt,
        freshnessState: mapFreshness(input.ops.state, true),
        oldestAt: null,
        drillDown: {
          href: appendQuery("/admin/orders", { status: "preparing" }),
          label: "Open preparing orders",
          limitation: "Kitchen tickets unavailable — showing order-status fallback.",
        },
        limitation: "Derived from order status age when kitchen tickets cannot be loaded.",
      });
    }
  }

  // --- EXC-DEL-UNASSIGNED: prefer delivery assignments waiting for rider ---
  if (deliveryHasData && input.delivery.assignments) {
    const waiting = input.delivery.assignments.filter((row) =>
      isDispatchWaitingForRider({
        deliveryStatus: row.status,
        orderStatus: String(row.orderStatus ?? ""),
      }),
    );
    if (waiting.length > 0) {
      const oldestMs = Math.min(
        ...waiting
          .map((row) => new Date(String(row.createdAt ?? "")).getTime())
          .filter(Number.isFinite),
      );
      exceptions.push({
        id: "EXC-DEL-UNASSIGNED",
        type: "EXC-DEL-UNASSIGNED",
        domain: "delivery",
        severity: waiting.length >= 5 ? "CRITICAL" : "WARNING",
        title: "Ready orders waiting for rider",
        summary: `${waiting.length} ready deliver${waiting.length === 1 ? "y" : "ies"} pending rider assignment.`,
        count: waiting.length,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Delivery assignments API",
        trustState: "PARTIAL_LIVE",
        observedAt: generatedAt,
        freshnessState: mapFreshness(input.delivery.state, true),
        oldestAt: Number.isFinite(oldestMs) ? new Date(oldestMs).toISOString() : null,
        drillDown: {
          href: appendQuery("/admin/delivery", { status: "pending" }),
          label: "Open delivery dispatch queue",
        },
      });
    }
  } else if (opsHasData && input.ops.data) {
    const readyAlerts = input.ops.data.alerts.filter((a) => a.code === "READY_AWAITING_DISPATCH");
    if (readyAlerts.length > 0) {
      exceptions.push({
        id: "EXC-DEL-UNASSIGNED",
        type: "EXC-DEL-UNASSIGNED",
        domain: "delivery",
        severity: mapAlertSeverity(readyAlerts[0]?.severity ?? "warning"),
        title: "Ready orders awaiting dispatch",
        summary: `${readyAlerts.length} ready order${readyAlerts.length === 1 ? "" : "s"} waiting longer than the dispatch threshold.`,
        count: readyAlerts.length,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Operations dashboard alerts",
        trustState: "DERIVED",
        observedAt: input.ops.data.generatedAt,
        freshnessState: mapFreshness(input.ops.state, true),
        oldestAt: null,
        drillDown: {
          href: "/admin/delivery",
          label: "Open delivery",
          limitation: "Delivery assignment list unavailable — destination opens without a status filter.",
        },
        limitation: "Derived from order age alerts when delivery assignments cannot be loaded.",
      });
    }
  }

  // --- EXC-STOCK-LOW: ops KPI lowStockCount ---
  if (opsHasData && input.ops.data) {
    const low = input.ops.data.kpis.lowStockCount ?? 0;
    if (low > 0) {
      exceptions.push({
        id: "EXC-STOCK-LOW",
        type: "EXC-STOCK-LOW",
        domain: "inventory",
        severity: low >= 10 ? "CRITICAL" : "WARNING",
        title: "Low stock items",
        summary: `${low} inventory item${low === 1 ? "" : "s"} at or below minimum stock.`,
        count: low,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Operations dashboard inventory KPI",
        trustState: "PARTIAL_LIVE",
        observedAt: input.ops.data.generatedAt,
        freshnessState: mapFreshness(input.ops.state, true),
        oldestAt: null,
        drillDown: {
          href: appendQuery("/admin/inventory", { lowStock: "1" }),
          label: "Open low-stock inventory",
        },
      });
    }
  }

  // --- EXC-CASH-VAR: finance attention unresolved variance ---
  if (input.finance.enabled && !input.finance.unavailable && input.finance.unresolvedCashVariance != null) {
    const variance = input.finance.unresolvedCashVariance;
    if (variance > 0) {
      exceptions.push({
        id: "EXC-CASH-VAR",
        type: "EXC-CASH-VAR",
        domain: "cash",
        severity: variance >= 3 ? "CRITICAL" : "WARNING",
        title: "Unresolved cash variance",
        summary: `${variance} cash close${variance === 1 ? "" : "s"} with unresolved variance.`,
        count: variance,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Finance attention API",
        trustState: "PARTIAL_LIVE",
        observedAt: generatedAt,
        freshnessState: mapFreshness(input.finance.state, true),
        oldestAt: null,
        drillDown: {
          href: "/admin/finance",
          label: "Open finance cash closes",
          limitation: "Finance page has no dedicated variance-only URL filter yet.",
        },
      });
    }
  }

  // --- EXC-ORD-PENDING: ops PENDING_TOO_LONG ---
  if (opsHasData && input.ops.data) {
    const pendingAlerts = input.ops.data.alerts.filter((a) => a.code === "PENDING_TOO_LONG");
    if (pendingAlerts.length > 0) {
      const critical = pendingAlerts.some((a) => a.severity === "critical");
      exceptions.push({
        id: "EXC-ORD-PENDING",
        type: "EXC-ORD-PENDING",
        domain: "orders",
        severity: critical ? "CRITICAL" : "WARNING",
        title: "Orders pending too long",
        summary: `${pendingAlerts.length} pending order${pendingAlerts.length === 1 ? "" : "s"} past the confirmation threshold.`,
        count: pendingAlerts.length,
        branchId: input.branchId,
        branchName: input.branchName,
        source: "Operations dashboard alerts",
        trustState: "DERIVED",
        observedAt: input.ops.data.generatedAt,
        freshnessState: mapFreshness(input.ops.state, true),
        oldestAt: null,
        drillDown: {
          href: appendQuery("/admin/orders", { status: "pending" }),
          label: "Open pending orders",
        },
      });
    }
  }

  exceptions.sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    const aAge = a.oldestAt ? new Date(a.oldestAt).getTime() : Number.POSITIVE_INFINITY;
    const bAge = b.oldestAt ? new Date(b.oldestAt).getTime() : Number.POSITIVE_INFINITY;
    if (aAge !== bAge) return aAge - bAge;
    return a.title.localeCompare(b.title);
  });

  const required = sources;
  const failedRequired = required.filter((s) => s.failed);
  const partialFailure = failedRequired.length > 0 && failedRequired.length < required.length;
  const totalFailure = failedRequired.length === required.length;
  const anyLoading = required.some((s) => s.loading);
  const allClear =
    !anyLoading &&
    failedRequired.length === 0 &&
    exceptions.length === 0;

  return {
    exceptions,
    sources,
    partialFailure,
    totalFailure,
    allClear,
    unavailableSources: failedRequired.map((s) => s.label),
    generatedAt,
  };
}

export function formatExceptionAge(oldestAt: string | null, nowMs = Date.now()): string | null {
  if (!oldestAt) return null;
  const ms = new Date(oldestAt).getTime();
  if (!Number.isFinite(ms)) return null;
  const minutes = Math.max(0, Math.floor((nowMs - ms) / 60_000));
  if (minutes < 60) return `${minutes}m oldest`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m oldest`;
}

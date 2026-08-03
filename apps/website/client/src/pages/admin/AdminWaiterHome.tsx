import { Link } from "wouter";

import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { DashboardActionCard } from "@/components/admin/dashboard/DashboardActionCard";
import { RoleHomeShell } from "@/components/admin/dashboard/RoleHomeShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessAdminPos,
  canAccessTableService,
  canSeatGuests,
  isWaiterOnly,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { fetchTableServiceDashboard } from "@/lib/admin-api";
import { getLiveFloorState } from "@/lib/table-service-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

/** Translate raw service statuses into plain guest-service language. */
const SERVICE_STATUS_LABELS: Record<string, string> = {
  seated: "Just seated",
  ordering: "Waiting to order",
  ordered: "Order placed",
  served: "Food served",
  bill_requested: "Bill requested",
  payment_pending: "Payment pending",
  completed: "Finished",
};

function serviceStatusLabel(status: string | null | undefined): string {
  if (!status) return "Status unknown";
  const known = SERVICE_STATUS_LABELS[status];
  if (known) return known;
  const words = status.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function AdminWaiterHome() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed =
    isWaiterOnly(principal) || canAccessTableService(principal) || canSeatGuests(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);

  const branchId = branchIdFilter ?? branchIds[0] ?? null;
  const userId = profile?.id;

  const tableOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchTableServiceDashboard(token!, { branchId: branchId! }, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && isApiConfigured && gateReady,
      pollMs: 20_000,
    },
  );

  const floorOp = useOperationalData(
    ({ signal, correlationId }) => getLiveFloorState(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && isApiConfigured && gateReady,
      pollMs: 15_000,
    },
  );

  if (isAuthLoading) {
    return (
      <AdminShell title="Waiter home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) {
    return <AdminShell title="Waiter home">{null}</AdminShell>;
  }

  const sessions = floorOp.data?.activeSessions ?? [];
  // Architect: never fall back to all branch sessions when assignment filter is unavailable or empty.
  const assigned = userId
    ? sessions.filter((s) => s.primaryServerUserId === userId)
    : [];
  const visible = userId ? assigned : [];
  const waitingToOrder = visible.filter(
    (s) => s.serviceStatus === "seated" || s.serviceStatus === "ordering",
  );
  const billRequests = visible.filter((s) => s.serviceStatus === "bill_requested");
  const paymentPending = visible.filter((s) => s.serviceStatus === "payment_pending");

  const floorReady = floorOp.data != null;
  const assignmentFilterReady = Boolean(userId);
  const kpi =
    !assignmentFilterReady
      ? ("unavailable" as const)
      : floorOp.state === "LOADING"
        ? ("loading" as const)
        : floorOp.state === "ERROR" || floorOp.state === "OFFLINE"
          ? ("error" as const)
          : floorOp.state === "STALE"
            ? ("stale" as const)
            : floorReady
              ? ("available" as const)
              : ("unavailable" as const);

  return (
    <RoleHomeShell
      title="Waiter home"
      subtitle={`${primaryRoleLabel(roles, isSuperAdmin)} · ${profile?.fullName ?? "Staff"} · ${branchLabel}`}
      state={floorOp.state !== "LIVE" && floorOp.state !== "EMPTY" ? floorOp.state : tableOp.state}
      error={floorOp.error ?? tableOp.error}
      lastSuccessAt={floorOp.lastSuccessAt ?? tableOp.lastSuccessAt}
      onRetry={() => {
        floorOp.retry();
        tableOp.retry();
      }}
      correlationId={floorOp.correlationId}
      showTechnicalDetail={isSuperAdmin}
      primaryAction={
        <DashboardActionCard
          title="Open live floor"
          description="Your assigned tables"
          href="/admin/floor"
          primary
        />
      }
      secondaryActions={
        canAccessAdminPos(principal) ? (
          <DashboardActionCard title="Open POS" description="Orders for seated guests" href="/admin/pos" />
        ) : null
      }
    >
      <AdminSectionTitle
        eyebrow="Floor"
        title="Your assigned tables"
        description={
          assignmentFilterReady
            ? "Only tables where you are the serving waiter. Other waiters' tables are never shown here."
            : "Your staff profile could not be matched, so no tables are listed."
        }
      />

      {!assignmentFilterReady ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          We can't match tables to your account right now. Ask a Super Admin to refresh your staff profile.
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {floorOp.state === "LOADING" && !floorOp.data ? (
          <>
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
          </>
        ) : null}
        {floorReady && assignmentFilterReady ? (
          <>
            <AdminKpiCard
              title="Your tables"
              value={String(visible.length)}
              source="LIVE"
              state={kpi}
              detail="Tables where you are the serving waiter"
            />
            <AdminKpiCard title="Waiting to order" value={String(waitingToOrder.length)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Bill requests" value={String(billRequests.length)} source="LIVE" state={kpi} />
            <AdminKpiCard title="Payment pending" value={String(paymentPending.length)} source="LIVE" state={kpi} />
          </>
        ) : null}
        {tableOp.data && assignmentFilterReady ? (
          <AdminKpiCard
            title="Occupied tables (whole branch)"
            value={String(tableOp.data.floor.occupiedTables)}
            source="DERIVED"
            state={kpi}
            detail="Branch-wide total, for context only"
          />
        ) : null}
      </div>

      <ul className="mb-8 space-y-2" aria-label="Your assigned tables">
        {visible.slice(0, 12).map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium">{s.sessionNumber ?? s.id.slice(0, 8)}</span>
              {" · "}
              {s.partySize ?? "?"} covers · {serviceStatusLabel(s.serviceStatus)}
            </span>
            <span className="flex flex-wrap gap-1 text-xs font-semibold">
              {canAccessAdminPos(principal) ? (
                <Link
                  href="/admin/pos"
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-[var(--brand-red)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
                  aria-label={`Open POS for table ${s.sessionNumber ?? s.id.slice(0, 8)}`}
                >
                  Open POS
                </Link>
              ) : null}
              <Link
                href="/admin/floor"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-[var(--brand-red)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
                aria-label={`Open live floor for table ${s.sessionNumber ?? s.id.slice(0, 8)}`}
              >
                Open floor
              </Link>
            </span>
          </li>
        ))}
        {assignmentFilterReady && floorReady && visible.length === 0 ? (
          <li className="text-sm text-[var(--admin-muted)]">
            No tables are assigned to you right now. New seatings will appear here.
          </li>
        ) : null}
        {!assignmentFilterReady ? (
          <li className="text-sm text-[var(--admin-muted)]">
            No tables listed — your account could not be matched to floor assignments.
          </li>
        ) : null}
      </ul>
    </RoleHomeShell>
  );
}

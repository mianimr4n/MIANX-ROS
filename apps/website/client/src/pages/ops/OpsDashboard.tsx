import { Link } from "wouter";

import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import {
  canAccessAdminOrdersApi,
  canAccessTableService,
} from "@/lib/admin-access";
import { fetchAdminOperationsDashboard, fetchTableServiceDashboard } from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import { formatLastSuccess, useOperationalData } from "@/lib/op-status";
import { canManageOrders } from "@/lib/staff-access";
import { OpsShell } from "./OpsShell";

export default function OpsDashboard() {
  const { session, permissions, isSuperAdmin, roles, branchIds } = useAuth();
  const { branchIdFilter } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const canOps = canManageOrders({ permissions, isSuperAdmin }) || canAccessAdminOrdersApi(principal);
  const canTable = canAccessTableService(principal);
  const branchId = branchIdFilter ?? branchIds[0] ?? null;

  const opsOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId }, { signal, correlationId }),
    [token, branchId],
    { enabled: Boolean(token) && canOps && isApiConfigured, pollMs: 15_000 },
  );

  const tableOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchTableServiceDashboard(token!, { branchId: branchId! }, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && canTable && isApiConfigured,
      pollMs: 30_000,
    },
  );

  const data = opsOp.data;
  const kpis = data?.kpis;
  const status = data?.statusCounts ?? {};
  const refreshLabel = formatLastSuccess(opsOp.lastSuccessAt ?? tableOp.lastSuccessAt);

  return (
    <OpsShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Restaurant dashboard</h1>
          <p className="text-zinc-400" role="status" aria-live="polite">
            {refreshLabel ? `Last updated ${refreshLabel}` : "Not updated yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ops/orders"
            className="min-h-11 rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            Work the order queue
          </Link>
          <Link
            href="/ops/kitchen"
            className="min-h-11 rounded-lg bg-zinc-800 px-4 py-3 font-semibold hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            Open kitchen queue
          </Link>
          <Link
            href="/ops/dispatch"
            className="min-h-11 rounded-lg bg-zinc-800 px-4 py-3 font-semibold hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            Dispatch riders
          </Link>
        </div>
      </div>

      <OperationalStatusBanner
        state={canOps ? opsOp.state : "LIVE"}
        error={opsOp.error}
        lastSuccessAt={opsOp.lastSuccessAt}
        onRetry={opsOp.retry}
        correlationId={opsOp.correlationId}
        className="mb-4"
      />

      {!canOps ? (
        <p className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          Order KPIs require order.manage. Use the nav links below for modules you can access.
        </p>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pending (needs action)", value: data ? String(status.pending ?? 0) : "—" },
          { label: "Kitchen waiting", value: kpis ? String(kpis.kitchenWaiting) : "—" },
          { label: "Ready (hand over)", value: data ? String(status.ready ?? 0) : "—" },
          { label: "Dispatched", value: data ? String(status.dispatched ?? 0) : "—" },
          { label: "Preparing", value: data ? String(status.preparing ?? 0) : "—" },
          { label: "Active orders", value: kpis ? String(kpis.activeOrders) : "—" },
          { label: "Today orders", value: kpis ? String(kpis.todayOrders) : "—" },
          {
            label: "Today sales",
            value: kpis ? `Rs ${Math.round(kpis.todayGrossSales).toLocaleString("en-PK")}` : "—",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {canTable && branchId ? (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Table service</h2>
          <OperationalStatusBanner
            state={tableOp.state}
            error={tableOp.error}
            lastSuccessAt={tableOp.lastSuccessAt}
            onRetry={tableOp.retry}
            className="mb-3"
          />
          {tableOp.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Reservations today</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {tableOp.data.reservations.todayTotal}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Upcoming arrivals</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {tableOp.data.floor.upcomingArrivals}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Waitlist</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{tableOp.data.floor.waitlistCount}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Available tables</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{tableOp.data.floor.availableTables}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Occupied tables</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{tableOp.data.floor.occupiedTables}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Bill requests</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{tableOp.data.floor.billRequests}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Payment pending</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{tableOp.data.floor.paymentPending}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Avg wait (min)</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {tableOp.data.averages.averageWaitMinutes == null
                    ? "—"
                    : String(tableOp.data.averages.averageWaitMinutes)}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-3 text-sm" aria-label="Table service shortcuts">
        <Link
          href="/admin/reservations"
          className="min-h-11 rounded-lg bg-zinc-800 px-3 py-2 font-semibold hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          Manage reservations
        </Link>
        <Link
          href="/admin/waitlist"
          className="min-h-11 rounded-lg bg-zinc-800 px-3 py-2 font-semibold hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          Open waitlist
        </Link>
        <Link
          href="/admin/floor"
          className="min-h-11 rounded-lg bg-zinc-800 px-3 py-2 font-semibold hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          Open live floor
        </Link>
      </nav>
    </OpsShell>
  );
}

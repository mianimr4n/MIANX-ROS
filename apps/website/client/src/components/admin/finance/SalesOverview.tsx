import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { formatPkr } from "@/lib/admin-order-format";
import type { OperationalSalesSnapshot } from "@/lib/admin-finance";

export function SalesOverview({
  snapshot,
  ordersApiAvailable,
  loading,
}: {
  snapshot: OperationalSalesSnapshot;
  ordersApiAvailable: boolean;
  loading: boolean;
}) {
  const hasData =
    snapshot.todayGrossSales != null ||
    snapshot.todayOrders != null ||
    snapshot.averageOrderValue != null;

  return (
    <AdminSurface aria-labelledby="finance-sales-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Sales overview"
        description="Operational order totals — not recognized accounting revenue."
      />
      <AdminSurfaceBody>
        <h2 id="finance-sales-heading" className="sr-only">
          Sales overview
        </h2>
        {!ordersApiAvailable ? (
          <p className="text-sm text-[var(--admin-muted)]">
            Sales snapshot requires <code className="text-xs">order.manage</code> for the operations dashboard API. Finance
            access alone does not imply order list permission.
          </p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading operational sales snapshot…
          </p>
        ) : !hasData ? (
          <p className="text-sm text-[var(--admin-muted)]">
            No operational sales data in the current window — connect dashboard API or open{" "}
            <Link href="/admin/orders" className="font-semibold text-[var(--brand-red)] underline">
              Orders
            </Link>{" "}
            for live order totals.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">Today gross (orders)</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatPkr(snapshot.todayGrossSales)}</p>
              <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
                derived
              </span>
            </div>
            <div className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">Today orders</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{snapshot.todayOrders ?? "—"}</p>
              <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
                derived
              </span>
            </div>
            <div className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">Average order value</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatPkr(snapshot.averageOrderValue)}</p>
              <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
                derived
              </span>
            </div>
            <div className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">Paid in recent window</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{snapshot.paidOrdersToday ?? "—"}</p>
              <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800">
                derived
              </span>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-[var(--admin-muted)]">{snapshot.note}</p>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          Accounting revenue recognition, deferred sales, and GL postings are Foundation until ledger backend ships.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

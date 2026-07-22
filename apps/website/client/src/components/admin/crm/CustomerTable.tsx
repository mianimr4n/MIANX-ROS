import { daysSince, type CrmCustomer } from "@/lib/admin-crm";
import { formatOrderTime, formatPkr } from "@/lib/admin-order-format";

export type CrmSortKey = "lastOrderAt" | "orderCount" | "lifetimeSpend" | "averageSpend" | "displayName";

export function CustomerTable({
  customers,
  loading,
  error,
  selectedId,
  sortKey,
  sortDir,
  onSort,
  onRetry,
  onView,
  onViewOrders,
  onCreatePos,
  branchLabelById,
  pageStart,
  pageEnd,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  customers: CrmCustomer[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  sortKey: CrmSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: CrmSortKey) => void;
  onRetry: () => void;
  onView: (customer: CrmCustomer) => void;
  onViewOrders: (customer: CrmCustomer) => void;
  onCreatePos: () => void;
  branchLabelById: Record<string, string>;
  pageStart: number;
  pageEnd: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  function indicator(key: CrmSortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <section aria-label="Customer list" className="mb-6">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading customers">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : null}

      {!loading && customers.length === 0 && !error ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-8 text-center text-sm text-[var(--admin-muted)]">
          No customers found in the loaded order window for this branch scope.
        </div>
      ) : null}

      {!loading && customers.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]">
            <table className="min-w-[72rem] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("displayName")}>
                      Customer{indicator("displayName")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Phone</th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("orderCount")}>
                      Orders{indicator("orderCount")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("lastOrderAt")}>
                      Last order{indicator("lastOrderAt")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("averageSpend")}>
                      Avg spend{indicator("averageSpend")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("lifetimeSpend")}>
                      Lifetime{indicator("lifetimeSpend")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Branch</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Loyalty</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const inactive = daysSince(customer.lastOrderAt) > 30;
                  const selected = selectedId === customer.id;
                  return (
                    <tr
                      key={customer.id}
                      className={`border-b border-[var(--admin-border)]/70 ${
                        selected ? "bg-[var(--admin-soft)]" : "hover:bg-[var(--admin-soft)]/60"
                      }`}
                    >
                      <td className="px-3 py-3 font-semibold">{customer.displayName}</td>
                      <td className="px-3 py-3 tabular-nums">{customer.phone}</td>
                      <td className="px-3 py-3 tabular-nums">{customer.orderCount}</td>
                      <td className="px-3 py-3 text-[var(--admin-muted)]">
                        <div className="font-mono text-[var(--admin-ink)]">{customer.lastOrderNumber}</div>
                        <div className="text-xs">{formatOrderTime(customer.lastOrderAt)}</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatPkr(customer.averageSpend)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatPkr(customer.lifetimeSpend)}</td>
                      <td className="px-3 py-3">
                        {customer.primaryBranchId
                          ? branchLabelById[customer.primaryBranchId] ?? customer.primaryBranchId.slice(0, 8)
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            inactive ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-900"
                          }`}
                          aria-label={inactive ? "Inactive customer" : "Active customer"}
                        >
                          {inactive ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-dashed border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                          Foundation
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--brand-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                            onClick={() => onView(customer)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
                            onClick={() => onViewOrders(customer)}
                          >
                            Orders
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
                            onClick={onCreatePos}
                          >
                            POS
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-[var(--admin-muted)]">
              Showing {pageStart}–{pageEnd} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 font-semibold disabled:opacity-40"
                onClick={onPrev}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canNext}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 font-semibold disabled:opacity-40"
                onClick={onNext}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

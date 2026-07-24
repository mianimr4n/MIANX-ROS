import { daysSince, type CrmCustomer } from "@/lib/admin-crm";
import { classificationLabel, classifyCustomer } from "@/lib/admin-loyalty";
import { formatOrderTime, formatPkr } from "@/lib/admin-order-format";

export type LoyaltySortKey = "lastOrderAt" | "orderCount" | "lifetimeSpend" | "averageSpend" | "displayName";

export function LoyaltyCustomerTable({
  customers,
  loading,
  error,
  selectedId,
  sortKey,
  sortDir,
  onSort,
  onRetry,
  onView,
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
  sortKey: LoyaltySortKey;
  sortDir: "asc" | "desc";
  onSort: (key: LoyaltySortKey) => void;
  onRetry: () => void;
  onView: (customer: CrmCustomer, trigger?: HTMLButtonElement | null) => void;
  branchLabelById: Record<string, string>;
  pageStart: number;
  pageEnd: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  function indicator(key: LoyaltySortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <section aria-label="Customer loyalty list" className="mb-6">
      <p className="mb-3 text-xs text-[var(--admin-muted)]">
        Order-derived customer profile — not a persistent loyalty member record.
      </p>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading loyalty customers">
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
            <table className="min-w-[76rem] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("displayName")}>
                      Customer{indicator("displayName")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Phone</th>
                  <th className="px-3 py-3 font-medium">Branch</th>
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
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("lifetimeSpend")}>
                      Lifetime spend{indicator("lifetimeSpend")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button type="button" className="font-medium hover:text-[var(--admin-ink)]" onClick={() => onSort("averageSpend")}>
                      AOV{indicator("averageSpend")}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Classification</th>
                  <th className="px-3 py-3 font-medium">Tier</th>
                  <th className="px-3 py-3 font-medium">Points</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const tags = classifyCustomer(customer);
                  const primaryTag = tags.find((t) => t !== "single") ?? tags[0];
                  const selected = selectedId === customer.id;
                  return (
                    <tr
                      key={customer.id}
                      className={`border-b border-[var(--admin-border)]/70 ${
                        selected ? "bg-[var(--admin-soft)]" : "hover:bg-[var(--admin-soft)]/60"
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold">{customer.displayName}</div>
                        <div className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Order-derived</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{customer.phone}</td>
                      <td className="px-3 py-3">
                        {customer.primaryBranchId
                          ? branchLabelById[customer.primaryBranchId] ?? customer.primaryBranchId.slice(0, 8)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{customer.orderCount}</td>
                      <td className="px-3 py-3 text-[var(--admin-muted)]">
                        <div className="font-mono text-[var(--admin-ink)]">{customer.lastOrderNumber}</div>
                        <div className="text-xs">{formatOrderTime(customer.lastOrderAt)}</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatPkr(customer.lifetimeSpend)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatPkr(customer.averageSpend)}</td>
                      <td className="px-3 py-3">
                        {primaryTag ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              daysSince(customer.lastOrderAt) > 30 ? "bg-amber-50 text-amber-950" : "bg-sky-50 text-sky-950"
                            }`}
                            aria-label={`Rule-based classification: ${classificationLabel(primaryTag)}`}
                          >
                            {classificationLabel(primaryTag)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-dashed border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                          Unavailable
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full border border-dashed border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                          Unavailable
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="text-sm font-semibold text-[var(--brand-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
                          onClick={(event) => onView(customer, event.currentTarget)}
                        >
                          View
                        </button>
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

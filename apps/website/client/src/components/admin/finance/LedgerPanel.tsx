import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function LedgerPanel() {
  return (
    <AdminSurface aria-labelledby="finance-ledger-heading" className="mb-6">
      <AdminSurfaceHeader title="General ledger" description="Journal entries, chart of accounts, and audit trail." />
      <AdminSurfaceBody>
        <h2 id="finance-ledger-heading" className="sr-only">
          General ledger
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">General ledger entries — none available</caption>
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-soft)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Journal
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Account
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Debit
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Credit
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--admin-muted)]">
                  <p className="font-semibold text-[var(--admin-ink)]">No journal entries in repository</p>
                  <p className="mt-2 text-xs">
                    General ledger foundation — immutable journal entries and chart of accounts required before postings.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function StatementsPanel() {
  const statements = [
    { id: "trial-balance", label: "Trial balance", status: "Foundation" },
    { id: "profit-loss", label: "Profit & loss", status: "Foundation" },
    { id: "balance-sheet", label: "Balance sheet", status: "Foundation" },
    { id: "cash-flow", label: "Cash flow", status: "Foundation" },
  ];

  return (
    <AdminSurface aria-labelledby="finance-statements-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Financial statements"
        description="Posted ledger required — statements cannot be derived from order UI totals."
      />
      <AdminSurfaceBody>
        <h2 id="finance-statements-heading" className="sr-only">
          Financial statements
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {statements.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3"
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          No trial balance, P&amp;L, balance sheet, or cash flow APIs exist. Frontend will not fabricate statement figures.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

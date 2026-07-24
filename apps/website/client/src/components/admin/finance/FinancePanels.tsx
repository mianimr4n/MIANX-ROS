import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function CashPanel() {
  return (
    <AdminSurface aria-labelledby="finance-cash-heading" className="mb-6">
      <AdminSurfaceHeader title="Cash position" description="Cash drawers, bank accounts, and reconciliation." />
      <AdminSurfaceBody>
        <h2 id="finance-cash-heading" className="sr-only">
          Cash position
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Cash &amp; bank foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No cash drawer sessions, bank accounts, or reconciliation APIs exist. POS and customer payments do not post to
            accounting cash accounts.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReceivablePanel() {
  return (
    <AdminSurface aria-labelledby="finance-receivables-heading" className="mb-6">
      <AdminSurfaceHeader title="Receivables" description="Trade debtors, aging, and collections." />
      <AdminSurfaceBody>
        <h2 id="finance-receivables-heading" className="sr-only">
          Receivables
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Accounts receivable unavailable</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Walk-in and delivery orders settle at checkout. No credit invoices, aging buckets, or collection workflow in
            repository.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PayablePanel() {
  return (
    <AdminSurface aria-labelledby="finance-payables-heading" className="mb-6">
      <AdminSurfaceHeader title="Payables" description="Supplier bills and payment runs." />
      <AdminSurfaceBody>
        <h2 id="finance-payables-heading" className="sr-only">
          Payables
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Accounts payable foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Purchasing module is Foundation — no supplier invoices or three-way match. Customer payment records are not
            supplier payables.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ExpensePanel() {
  return (
    <AdminSurface aria-labelledby="finance-expenses-heading" className="mb-6">
      <AdminSurfaceHeader title="Expenses" description="Operating expenses, petty cash, and accruals." />
      <AdminSurfaceBody>
        <h2 id="finance-expenses-heading" className="sr-only">
          Expenses
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Expense ledger unavailable</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No verified expense entries, petty cash, or OPEX posting APIs. Frontend cannot create accounting expenses.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function TaxPanel() {
  return (
    <AdminSurface aria-labelledby="finance-tax-heading" className="mb-6">
      <AdminSurfaceHeader title="Tax" description="VAT/GST configuration, liability, and returns." />
      <AdminSurfaceBody>
        <h2 id="finance-tax-heading" className="sr-only">
          Tax
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Tax configuration foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            orders.tax_amount is not a tax engine. No tax codes, filing exports, or GL tax accounts in repository — do not
            treat order tax lines as compliance-ready VAT/GST.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

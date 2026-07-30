import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { SupplierInvoice } from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-finance";

export function CashPanel() {
  return (
    <AdminSurface aria-labelledby="finance-cash-heading" className="mb-6">
      <AdminSurfaceHeader title="Cash position" description="Cash drawers, bank accounts, and reconciliation." />
      <AdminSurfaceBody>
        <h2 id="finance-cash-heading" className="sr-only">
          Cash position
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">Cash &amp; bank — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            No cash drawer sessions, bank accounts, or reconciliation APIs exist. POS and customer payments do not post to
            accounting cash accounts.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            Planned for Phase 2
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
          <p className="font-semibold text-[var(--admin-ink)]">Accounts receivable — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Walk-in and delivery orders settle at checkout. No credit invoices, aging buckets, or collection workflow in
            repository.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            Planned for Phase 2
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PayablePanel({
  invoices,
  loading,
  error,
}: {
  invoices: SupplierInvoice[] | null;
  loading: boolean;
  error: string | null;
}) {
  const open = (invoices ?? []).filter((i) => i.status === "pending" || i.status === "partially_paid");
  const total = open.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <AdminSurface aria-labelledby="finance-payables-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Payables"
        description="Operational supplier invoices from Purchasing (not GL-posted AP)."
        action={
          <Link href="/admin/purchasing" className="text-sm font-semibold text-[var(--brand-red)] hover:underline">
            Open Purchasing
          </Link>
        }
      />
      <AdminSurfaceBody>
        <h2 id="finance-payables-heading" className="sr-only">
          Payables
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading supplier invoices…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : open.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No outstanding supplier invoices
          </p>
        ) : (
          <div>
            <p className="text-sm font-semibold text-[var(--admin-ink)]">
              {open.length} open invoice{open.length === 1 ? "" : "s"} · {formatPkr(total)}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {open.slice(0, 6).map((i) => (
                <li key={i.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                  <p className="font-semibold">
                    {i.invoiceNumber} · {formatPkr(i.totalAmount)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {i.supplierName ?? "—"} · {i.status}
                    {i.matchingStatus ? ` · ${i.matchingStatus}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--admin-muted)]">
              Operational AP only — auto-post into GL AP accounts is Planned for Phase 2.
            </p>
          </div>
        )}
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
          <p className="font-semibold text-[var(--admin-ink)]">Dedicated expense claims — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Expense accounts can be posted via the general ledger. Petty cash workflows and expense-claim APIs are Planned
            for Phase 2.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            Planned for Phase 2
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
          <p className="font-semibold text-[var(--admin-ink)]">VAT/GST returns — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            orders.tax_amount is not a tax engine. No tax codes, filing exports, or automated VAT/GST returns — do not
            treat order tax lines as compliance-ready VAT/GST.
          </p>
          <span className="mt-3 inline-block rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
            Planned for Phase 2
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

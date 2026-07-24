import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { Link } from "wouter";

export function SupplierTable() {
  return (
    <section aria-label="Supplier table" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle eyebrow="Suppliers" title="Supplier overview" description="No supplier master in repository." />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              {["Supplier", "Code", "Status", "Contact", "Payment terms", "Actions"].map((col) => (
                <th key={col} scope="col" className="px-3 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center">
                <p className="font-semibold">No suppliers in repository</p>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  Supplier records require a persistent master — not free-text notes or hardcoded dropdowns.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PurchaseOrderTable() {
  return (
    <section aria-label="Purchase order table" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Orders"
        title="Purchase orders"
        description="No purchase-order backend — customer sales orders are a different domain."
      />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              {["PO number", "Supplier", "Branch", "Status", "Total", "Expected", "Actions"].map((col) => (
                <th key={col} scope="col" className="px-3 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center">
                <p className="font-semibold">No purchase orders in repository</p>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  See{" "}
                  <Link href="/admin/orders" className="font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline">
                    Orders Management
                  </Link>{" "}
                  for customer sales — not supplier procurement.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RequisitionPanel() {
  return (
    <section className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <h3 className="text-sm font-semibold">Purchase requisitions</h3>
      <p className="mt-2 text-sm text-[var(--admin-muted)]">
        FOUNDATION — server-side requisition workflow required (draft → submitted → approved → converted to PO).
      </p>
    </section>
  );
}

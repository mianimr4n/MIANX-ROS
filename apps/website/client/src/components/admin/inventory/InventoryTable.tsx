import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { Link } from "wouter";

export function InventoryTable() {
  return (
    <section aria-label="Stock item table" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Stock"
        title="Stock items"
        description="No operational stock rows — menu catalog is not a substitute for ingredient inventory."
      />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              {["Stock item", "SKU", "Unit", "On hand", "Status", "Unit cost", "Actions"].map((col) => (
                <th key={col} scope="col" className="px-3 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center">
                <p className="font-semibold text-[var(--admin-ink)]">No stock items in repository</p>
                <p className="mt-2 max-w-xl mx-auto text-sm text-[var(--admin-muted)]">
                  A persistent stock item master and branch balance API is required before this table can show operational
                  data. Browse{" "}
                  <Link href="/admin/menu" className="font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline">
                    Menu Management
                  </Link>{" "}
                  for sellable catalog SKUs — not ingredient quantities.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

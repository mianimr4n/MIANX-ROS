import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";

export type PurchasingFilterState = {
  approvalStatus: "all" | "pending" | "approved" | "rejected";
  receivingStatus: "all" | "awaiting" | "received" | "partial";
  invoiceStatus: "all" | "pending" | "partially_paid" | "paid" | "MATCHED" | "DISCREPANCY" | "UNMATCHED";
};

export function PurchasingFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: PurchasingFilterState;
  onFiltersChange: (next: PurchasingFilterState) => void;
}) {
  return (
    <section aria-label="Purchasing filters" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <AdminSectionTitle
        eyebrow="Browse"
        title="Search and filters"
        description="Filters apply to live purchase orders, receiving status, and supplier invoices."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Approval status</span>
          <select
            value={filters.approvalStatus}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                approvalStatus: e.target.value as PurchasingFilterState["approvalStatus"],
              })
            }
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending (draft/submitted)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Receiving status</span>
          <select
            value={filters.receivingStatus}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                receivingStatus: e.target.value as PurchasingFilterState["receivingStatus"],
              })
            }
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="awaiting">Awaiting delivery</option>
            <option value="partial">Partially received</option>
            <option value="received">Received</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Invoice / match status</span>
          <select
            value={filters.invoiceStatus}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                invoiceStatus: e.target.value as PurchasingFilterState["invoiceStatus"],
              })
            }
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending payment</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="MATCHED">Match: MATCHED</option>
            <option value="DISCREPANCY">Match: DISCREPANCY</option>
            <option value="UNMATCHED">Match: UNMATCHED</option>
          </select>
        </label>
        <label className="block text-sm md:col-span-2 xl:col-span-4">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Search</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search suppliers or PO numbers…"
            className="min-h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          />
        </label>
      </div>
    </section>
  );
}

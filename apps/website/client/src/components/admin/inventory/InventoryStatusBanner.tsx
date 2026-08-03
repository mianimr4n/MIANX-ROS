import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";

export function InventoryStatusBanner() {
  return (
    <div className="mb-6 space-y-3">
      <section
        aria-labelledby="inventory-status-heading"
        className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
        data-testid="inventory-status-banner"
      >
        <div>
          <h2 id="inventory-status-heading" className="text-sm font-semibold text-sky-950">
            Inventory tools available (Partial live)
          </h2>
          <p className="mt-1 text-sm text-sky-900">
            Track stock items, adjustments, movements, waste, receiving, and versioned recipes when configured. An empty
            catalog is not healthy inventory. Kitchen → preparing consumes mapped ingredients once.
          </p>
        </div>
      </section>
      <AdminCapabilityNotice
        summary="Deferred inventory capabilities"
        items={[
          "Branch transfers and FIFO/WAC valuation",
          "COGS GL posting (event seam only today)",
        ]}
        testId="inventory-deferred-capabilities"
      />
    </div>
  );
}

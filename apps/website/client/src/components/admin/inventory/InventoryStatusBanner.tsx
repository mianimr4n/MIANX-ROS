export function InventoryStatusBanner() {
  return (
    <section
      aria-labelledby="inventory-status-heading"
      className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
      data-testid="inventory-status-banner"
    >
      <div>
        <h2 id="inventory-status-heading" className="text-sm font-semibold text-sky-950">
          Inventory tools available (Partial live)
        </h2>
        <p className="mt-1 text-sm text-sky-900">
          Track stock items, adjustments, movements, waste, receiving, and versioned recipes when configured. An empty
          catalog is not healthy inventory. Kitchen → preparing consumes mapped ingredients once. Branch transfers and
          FIFO/WAC valuation remain Planned for Phase 2. COGS GL posting is DEFERRED (event seam only).
        </p>
      </div>
    </section>
  );
}

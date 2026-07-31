export function InventoryStatusBanner() {
  return (
    <section
      aria-labelledby="inventory-status-heading"
      className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 md:px-5"
    >
      <div>
        <h2 id="inventory-status-heading" className="text-sm font-semibold text-emerald-950">
          Inventory is ready
        </h2>
        <p className="mt-1 text-sm text-emerald-900">
          Track stock items, adjustments, movements, waste, receiving, and versioned recipes. Kitchen → preparing
          consumes mapped ingredients once. Branch transfers and FIFO/WAC valuation remain Planned for Phase 2. COGS GL
          posting is DEFERRED (event seam only).
        </p>
      </div>
    </section>
  );
}

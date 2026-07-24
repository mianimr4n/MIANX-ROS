export function InventoryStatusBanner() {
  return (
    <section
      aria-labelledby="inventory-status-heading"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 md:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="inventory-status-heading" className="text-sm font-semibold text-amber-950">
            Inventory status
          </h2>
          <p className="mt-1 text-sm text-amber-900">
            Inventory foundation — persistent stock ledger not available. Menu catalog linkage is shown for readiness
            only.
          </p>
          <p className="mt-2 text-xs text-amber-800">
            Menu item availability is not stock quantity. Order lines are not inventory consumption. Retail prices are
            not cost prices.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          Foundation
        </span>
      </div>
    </section>
  );
}

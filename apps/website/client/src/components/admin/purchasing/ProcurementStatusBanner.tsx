export function ProcurementStatusBanner() {
  return (
    <section
      aria-labelledby="procurement-status-heading"
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 md:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="procurement-status-heading" className="text-sm font-semibold text-amber-950">
            Procurement status
          </h2>
          <p className="mt-1 text-sm text-amber-900">
            Procurement foundation — no supplier master, purchase orders, or goods receipts in the repository.
          </p>
          <p className="mt-2 text-xs text-amber-800">
            Customer order payments are not supplier payables. Menu selling prices are not purchase costs. Inventory
            adjustments are not purchase orders.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          Foundation
        </span>
      </div>
    </section>
  );
}

export function ProcurementStatusBanner() {
  return (
    <section
      aria-labelledby="procurement-status-heading"
      className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 md:px-5"
    >
      <div>
        <h2 id="procurement-status-heading" className="text-sm font-semibold text-emerald-950">
          Purchasing is ready
        </h2>
        <p className="mt-1 text-sm text-emerald-900">
          Manage suppliers, purchase orders, receiving, invoices, payments, and three-way matching from this workspace.
        </p>
      </div>
    </section>
  );
}

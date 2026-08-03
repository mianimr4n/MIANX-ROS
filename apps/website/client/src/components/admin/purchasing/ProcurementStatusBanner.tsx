export function ProcurementStatusBanner() {
  return (
    <section
      aria-labelledby="procurement-status-heading"
      className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
      data-testid="purchasing-status-banner"
    >
      <div>
        <h2 id="procurement-status-heading" className="text-sm font-semibold text-sky-950">
          Purchasing tools available (Partial live)
        </h2>
        <p className="mt-1 text-sm text-sky-900">
          Suppliers, purchase orders, receiving, invoices, payments, and three-way matching are implemented in this
          workspace when you have permission. No suppliers or activity means configuration / onboarding is still
          required — not a claim that Production purchasing is fully verified.
        </p>
      </div>
    </section>
  );
}

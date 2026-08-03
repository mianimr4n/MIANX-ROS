import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";

export function ProcurementStatusBanner() {
  return (
    <div className="mb-6 space-y-3">
      <section
        aria-labelledby="procurement-status-heading"
        className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
        data-testid="purchasing-status-banner"
      >
        <div>
          <h2 id="procurement-status-heading" className="text-sm font-semibold text-sky-950">
            Purchasing tools available (Partial live)
          </h2>
          <p className="mt-1 text-sm text-sky-900">
            Suppliers, purchase orders, receiving, invoices, payments, and three-way matching are implemented when you
            have permission. No suppliers or activity means configuration / onboarding is still required — not a claim
            that Production purchasing is fully verified.
          </p>
        </div>
      </section>
      <AdminCapabilityNotice
        summary="Deferred purchasing capabilities"
        items={["AI supplier scoring", "Autonomous purchase recommendations", "Automatic approval engines"]}
        testId="purchasing-deferred-capabilities"
      />
    </div>
  );
}

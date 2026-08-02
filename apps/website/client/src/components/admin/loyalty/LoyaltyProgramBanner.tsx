import { CapabilityStatusBadge } from "@/components/admin/CapabilityStatusBadge";

export function LoyaltyProgramBanner() {
  return (
    <section
      aria-labelledby="loyalty-program-status-heading"
      className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 md:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="loyalty-program-status-heading" className="text-sm font-semibold text-teal-950">
            Programme status
          </h2>
          <p className="mt-1 text-sm text-teal-900">
            Points ledger, tiers, and rewards are implemented in Admin → Loyalty. Provider send / delivery metrics remain
            Planned. Not Production-verified end-to-end.
          </p>
        </div>
        <CapabilityStatusBadge status="IMPLEMENTED_NOT_PRODUCTION_VERIFIED" />
      </div>
    </section>
  );
}

import { CapabilityStatusBadge } from "@/components/admin/CapabilityStatusBadge";
import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";

export function HRStatusBanner() {
  return (
    <div className="mb-6 space-y-3">
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Workforce tools are ready</p>
            <p className="mt-1 text-emerald-900/90">
              Manage employees (including deactivate), attendance, leave, documents, shift roster, and payroll
              calculation here. Not Production-verified end-to-end.
            </p>
          </div>
          <CapabilityStatusBadge status="PARTIAL_LIVE" />
        </div>
      </div>
      <AdminCapabilityNotice
        summary="Deferred HR capabilities"
        items={["Performance reviews", "Training programs"]}
        testId="hr-deferred-capabilities"
      />
    </div>
  );
}

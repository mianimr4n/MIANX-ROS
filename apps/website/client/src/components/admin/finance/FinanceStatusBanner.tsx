import { CapabilityStatusBadge } from "@/components/admin/CapabilityStatusBadge";
import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";

export function FinanceStatusBanner() {
  return (
    <div className="mb-6 space-y-3">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Finance tools — Partial LIVE</p>
            <p className="mt-1 text-amber-950/90">
              Chart of accounts, journals, trial balance, profit &amp; loss, cash closes, and supplier payables are
              available in this workspace. Not Production-verified end-to-end.
            </p>
          </div>
          <CapabilityStatusBadge status="PARTIAL_LIVE" />
        </div>
      </div>
      <AdminCapabilityNotice
        summary="Foundation and deferred finance capabilities"
        items={[
          "Balance sheet, cash flow, and receivables UI (Foundation — API exists)",
          "Tax screens not fully wired (Foundation)",
          "Jurisdiction filing (Deferred)",
        ]}
        testId="finance-deferred-capabilities"
      />
    </div>
  );
}

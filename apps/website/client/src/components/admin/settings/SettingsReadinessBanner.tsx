/**
 * Contextual Settings readiness — subject, checks, and next actions.
 * Distinguishes editable Settings from module workspaces and deferred control-plane work.
 */
import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";

export function SettingsReadinessBanner() {
  return (
    <div className="mb-6 space-y-3">
      <div
        className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        role="status"
        aria-live="polite"
        data-testid="settings-readiness-banner"
      >
        <p className="font-semibold">Settings readiness — organization &amp; branch profile</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sky-900/90">
          <li>
            <span className="font-medium">Editable here:</span> organization profile and branch commercial settings
            (hours, delivery radius, minimum order, delivery fee) when you have permission.
          </li>
          <li>
            <span className="font-medium">Opens module:</span> Orders, POS, Kitchen, Menu, Inventory, Purchasing,
            Reports, and HR — use the Admin workspace, not Settings save.
          </li>
        </ul>
        <p className="mt-2 text-xs text-sky-900/80">
          Missing configuration is not the same as no operational activity. This banner does not claim global system
          readiness.
        </p>
      </div>
      <AdminCapabilityNotice
        summary="Metadata and Foundation Settings"
        items={[
          "Payment provider credentials stay environment managed",
          "Tax rates, printers, loyalty policy, and security control-plane remain Planned",
        ]}
        testId="settings-deferred-capabilities"
      />
    </div>
  );
}

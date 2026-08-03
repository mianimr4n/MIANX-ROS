/**
 * Contextual Settings readiness — subject, checks, and next actions.
 * Distinguishes editable Settings from module workspaces and deferred control-plane work.
 */
export function SettingsReadinessBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
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
        <li>
          <span className="font-medium">Metadata / Foundation:</span> payment provider credentials stay environment
          managed; tax rates, printers, loyalty policy, and security control-plane remain Planned for Phase 2.
        </li>
      </ul>
      <p className="mt-2 text-xs text-sky-900/80">
        Missing configuration is not the same as no operational activity. This banner does not claim global system
        readiness.
      </p>
    </div>
  );
}

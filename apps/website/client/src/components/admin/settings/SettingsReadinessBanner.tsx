export function SettingsReadinessBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Partial LIVE settings workspace</p>
      <p className="mt-1 text-sky-900/90">
        Organization profile and branch settings (hours, delivery radius, minimum order, delivery fee) are LIVE from
        verified admin APIs. Payment provider credentials stay Environment Managed. Tax rates, printers, loyalty rules,
        and security policies remain Planned for Phase 2 — never invent configuration values.
      </p>
    </div>
  );
}

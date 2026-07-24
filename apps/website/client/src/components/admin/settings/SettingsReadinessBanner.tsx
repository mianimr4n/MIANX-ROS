export function SettingsReadinessBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Settings foundation workspace</p>
      <p className="mt-1 text-amber-900/90">
        Mode: Settings Foundation. Branch directory and seeded RBAC are read-only from verified APIs. Organization profile,
        tax, payments, printers, loyalty rules, notification providers, and security policies lack admin write APIs.
        Secrets stay environment-managed — never shown here. Save is disabled until a verified persistence workflow exists.
      </p>
    </div>
  );
}

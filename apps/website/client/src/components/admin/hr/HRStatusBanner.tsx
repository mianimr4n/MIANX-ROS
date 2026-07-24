export function HRStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">HR foundation workspace</p>
      <p className="mt-1 text-amber-900/90">
        The committed repository has staff and staff_invites tables plus RBAC seed data. There is no employee directory
        API, attendance ledger, leave balances, payroll engine, performance reviews, training center, or document storage.
        Staff invite listing is partial (super-admin API gate). Frontend will not fabricate employees, attendance, leave, or
        payroll figures.
      </p>
    </div>
  );
}

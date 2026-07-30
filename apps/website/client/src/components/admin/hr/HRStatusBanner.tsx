export function HRStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Workforce tools are ready</p>
      <p className="mt-1 text-emerald-900/90">
        Manage employees, attendance, leave, and document links here. Payroll, performance reviews, shift roster, and
        training are Planned for Phase 2.
      </p>
    </div>
  );
}

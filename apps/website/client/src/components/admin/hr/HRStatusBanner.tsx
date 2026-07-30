export function HRStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">HR workforce core is LIVE</p>
      <p className="mt-1 text-emerald-900/90">
        Employees, attendance, leave requests, and document URL storage are available for hr.manage, staff.manage, or
        admin.access. Payroll, performance reviews, shift roster, and training remain Planned for Phase 2 — frontend will
        not fabricate those figures.
      </p>
    </div>
  );
}

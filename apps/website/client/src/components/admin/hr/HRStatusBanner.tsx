export function HRStatusBanner() {
  return (
    <div
      className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Employee directory is live</p>
      <p className="mt-1 text-emerald-900/90">
        GET/POST /admin/hr/employees is available for staff.manage or admin.access. Attendance, leave, payroll,
        performance, training, and documents remain foundation — frontend will not fabricate those figures.
      </p>
    </div>
  );
}

import { currentShiftLabel } from "@/lib/admin-crm";

export function HRHeader({
  branchLabel,
  roleLabel,
  onRefresh,
}: {
  branchLabel: string;
  roleLabel: string;
  onRefresh: () => void;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4" data-testid="hr-workspace-header">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">Workforce</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight" data-admin-page-title>
          HR &amp; Workforce Management
        </p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · {branchLabel} · {currentShiftLabel()}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Live employees, attendance, leave, documents, shift roster, and payroll calculation — performance and
          training remain Planned for Phase 2
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-ink)]">
          Partial live workforce
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          Refresh
        </button>
      </div>
    </header>
  );
}

import { currentShiftLabel } from "@/lib/admin-crm";

export function FinanceHeader({
  branchLabel,
  roleLabel,
  onRefresh,
}: {
  branchLabel: string;
  roleLabel: string;
  onRefresh: () => void;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">Finance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Finance &amp; Accounting</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · {branchLabel} · {currentShiftLabel()}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Sales overview and general ledger for the selected branch
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          Refresh
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Record journal · Planned for Phase 2
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Supplier payment · Planned for Phase 2
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Expense entry · Planned for Phase 2
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Bank reconcile · Planned for Phase 2
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Export statements · Planned for Phase 2
        </button>
      </div>
    </header>
  );
}

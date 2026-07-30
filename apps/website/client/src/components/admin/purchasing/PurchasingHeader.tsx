import { currentShiftLabel } from "@/lib/admin-crm";

export function PurchasingHeader({
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">Procurement</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Purchasing &amp; Suppliers</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · {branchLabel} · {currentShiftLabel()}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Live suppliers, POs, requisitions, GRN, and PO approve/reject — invoice matching Coming Soon
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          LIVE procurement
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          Refresh
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Export · Coming Soon
        </button>
      </div>
    </header>
  );
}

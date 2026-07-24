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
          Procurement foundation — persistent supplier and purchase-order backend required
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-muted)]">
          Foundation workspace
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          Refresh readiness
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Create requisition · Foundation
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Create PO · Foundation
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Add supplier · Foundation
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Receive goods · Foundation
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Export · Foundation
        </button>
      </div>
    </header>
  );
}

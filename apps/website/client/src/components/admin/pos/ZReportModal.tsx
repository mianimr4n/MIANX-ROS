import { formatPkr } from "@/lib/admin-order-format";
import type { PosZReport } from "@/lib/admin-api";

export function ZReportModal({
  open,
  report,
  loading,
  confirming,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  report: PosZReport | null;
  loading: boolean;
  confirming: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="z-report-heading"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5 shadow-lg">
        <h2 id="z-report-heading" className="text-lg font-semibold text-[var(--admin-ink)]">
          Close Shift / Z-Report
        </h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Paid cash payments for the Asia/Karachi business day. Expected cash here equals cash sales only (no float).
          For opening float, counted cash, variance, and approval, use Finance → Cash closes.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">Loading Z-Report…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : report ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2">
              <dt className="text-[var(--admin-muted)]">Business date</dt>
              <dd className="font-semibold tabular-nums">{report.businessDate}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2">
              <dt className="text-[var(--admin-muted)]">Total orders (cash paid)</dt>
              <dd className="font-semibold tabular-nums">{report.totalOrders}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2">
              <dt className="text-[var(--admin-muted)]">Total cash sales</dt>
              <dd className="font-semibold tabular-nums">{formatPkr(report.totalCashSales)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
              <dt className="font-medium">Expected cash in drawer</dt>
              <dd className="font-semibold tabular-nums">{formatPkr(report.expectedCashInDrawer)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">No Z-Report data.</p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-[var(--admin-border)] px-4 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!report || loading || confirming}
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
          >
            {confirming ? "Confirming…" : "Confirm Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

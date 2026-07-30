import { useState, type FormEvent } from "react";

import type { ProcurementIntegrationCheck, ProcurementReadinessGroup } from "@/lib/admin-purchasing";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { GoodsReceiving, PurchaseOrder } from "@/lib/admin-api";

export function ProcurementFoundationPanel({ checks }: { checks: ProcurementIntegrationCheck[] }) {
  return (
    <AdminSurface aria-labelledby="procurement-integration-heading" className="mb-6">
      <AdminSurfaceHeader title="Integration readiness" description="Verified repository dependencies." />
      <AdminSurfaceBody>
        <h2 id="procurement-integration-heading" className="sr-only">
          Procurement integration readiness
        </h2>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li
              key={check.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{check.label}</p>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{check.note}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  check.status === "present"
                    ? "bg-emerald-50 text-emerald-900"
                    : check.status === "partial" || check.status === "derived"
                      ? "bg-sky-50 text-sky-900"
                      : "bg-[var(--admin-soft)] text-[var(--admin-muted)]"
                }`}
              >
                {check.status}
              </span>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ProcurementReadinessSections({ groups }: { groups: ProcurementReadinessGroup[] }) {
  return (
    <section aria-labelledby="procurement-readiness-sections" className="mb-6 grid gap-4 lg:grid-cols-2">
      <h2 id="procurement-readiness-sections" className="sr-only">
        Procurement foundation requirements
      </h2>
      {groups.map((group) => (
        <article key={group.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">Unavailable: {group.unavailable}</p>
          <p className="mt-2 text-sm">{group.why}</p>
          <dl className="mt-3 space-y-2 text-xs text-[var(--admin-muted)]">
            <div>
              <dt className="font-semibold uppercase tracking-wide">Entities</dt>
              <dd className="mt-1">{group.entities.join(" · ")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">APIs</dt>
              <dd className="mt-1">{group.apis.join(" · ")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">Permission</dt>
              <dd className="mt-1">{group.permission}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">Dependencies</dt>
              <dd className="mt-1">{group.related}</dd>
            </div>
          </dl>
        </article>
      ))}
    </section>
  );
}

export function ReceivingGrnPanel({
  receipts,
  orders,
  loading,
  error,
  canManage,
  defaultBranchId,
  onCreate,
  createError,
  createBusy,
}: {
  receipts: GoodsReceiving[] | null;
  orders: PurchaseOrder[] | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  defaultBranchId: string | null;
  onCreate: (input: {
    branchId: string;
    purchaseOrderId: string;
    notes: string;
  }) => Promise<boolean>;
  createError: string | null;
  createBusy: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setBranchId(defaultBranchId ?? "");
    setPurchaseOrderId("");
    setNotes("");
    setShowForm(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId) return;
    const ok = await onCreate({
      branchId,
      purchaseOrderId,
      notes: notes.trim(),
    });
    if (ok) resetForm();
  };

  return (
    <AdminSurface aria-labelledby="receiving-grn-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Receiving &amp; GRN"
        description="Live goods receiving headers — line-level inventory posting Coming Soon."
        action={
          canManage ? (
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand-red)] hover:underline"
              onClick={() => {
                setBranchId(defaultBranchId ?? "");
                setShowForm(true);
              }}
            >
              Record GRN
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h3 id="receiving-grn-heading" className="sr-only">
          Receiving and GRN
        </h3>

        {showForm && canManage ? (
          <form onSubmit={(e) => void submit(e)} className="mb-4 grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Branch ID</span>
              <input
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Purchase order (optional)</span>
              <select
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              >
                <option value="">No linked PO</option>
                {(orders ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.poNumber} · {o.supplierName ?? "supplier"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              />
            </label>
            {createError ? <p className="text-sm text-red-700">{createError}</p> : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createBusy}
                className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {createBusy ? "Posting…" : "Post GRN"}
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
            </div>
            <p className="text-xs text-[var(--admin-muted)]">
              GRN headers are live. Stock quantity updates still require Inventory adjustments until GRN line posting ships.
            </p>
          </form>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading goods receipts…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : !receipts || receipts.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No goods receipts recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <p className="font-semibold">{r.grnNumber}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {r.poNumber ? `PO ${r.poNumber} · ` : ""}
                  {r.status} · {new Date(r.receivedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function InvoiceMatchingPanel() {
  return (
    <AdminSurface aria-labelledby="invoice-matching-heading" className="mb-6">
      <AdminSurfaceHeader title="Invoice matching" description="Three-way match: PO ↔ GRN ↔ supplier invoice." />
      <AdminSurfaceBody>
        <h3 id="invoice-matching-heading" className="sr-only">
          Invoice matching
        </h3>
        <p className="text-sm font-semibold">Invoice Matching — Coming Soon</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Purchase-order, receipt, and supplier-invoice records are required before three-way matching can be performed.
          Customer payment records are not supplier payables.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Coming Soon · Finance &amp; Accounting
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SupplierPerformancePanel() {
  return (
    <AdminSurface aria-labelledby="supplier-performance-heading" className="mb-6">
      <AdminSurfaceHeader title="Supplier performance" description="Derived only from verified purchase and receipt events." />
      <AdminSurfaceBody>
        <h3 id="supplier-performance-heading" className="sr-only">
          Supplier performance
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          On-time delivery, fill rate, and price variance require historical PO and GRN data — unavailable in
          repository. No star ratings or AI supplier scores.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ApprovalTimelinePanel() {
  return (
    <AdminSurface aria-labelledby="approval-timeline-heading" className="mb-6">
      <AdminSurfaceHeader title="Approval workflow" description="Server-side approval enforcement required." />
      <AdminSurfaceBody>
        <h3 id="approval-timeline-heading" className="sr-only">
          Approval timeline
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          Coming Soon — server-side approval workflow required. No frontend-only approve/reject buttons.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Coming Soon</p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PurchaseDemandPanel() {
  return (
    <AdminSurface aria-labelledby="purchase-demand-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Purchase demand"
        description="Reorder-driven demand requires inventory balances and thresholds."
      />
      <AdminSurfaceBody>
        <h3 id="purchase-demand-heading" className="sr-only">
          Purchase demand
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          Items below reorder level with suggested order quantities require stock balances, par levels, and preferred
          supplier linkage — all unavailable. No automatic PO creation.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

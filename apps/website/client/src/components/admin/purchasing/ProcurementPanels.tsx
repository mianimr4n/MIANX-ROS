import { useState, type FormEvent } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import {
  createSupplierInvoice,
  createSupplierPayment,
  type GoodsReceiving,
  type PurchaseOrder,
  type Supplier,
  type SupplierInvoice,
  type SupplierPayment,
} from "@/lib/admin-api";
import type { ProcurementIntegrationCheck, ProcurementReadinessGroup } from "@/lib/admin-purchasing";
import { formatMoney } from "@/lib/admin-purchasing";
import { ApiRequestError } from "@/lib/api";

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
        description="Live goods receiving — mapped inventory lines post stock atomically; unmapped items are skipped."
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
              Mapped inventory lines post stock atomically on the server. Unmapped lines are skipped without blocking the GRN.
            </p>
          </form>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading goods receipts…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : !receipts || receipts.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No GRNs created yet</p>
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

export function InvoiceMatchingPanel({
  invoices,
  payments,
  suppliers,
  orders,
  branchId,
  accessToken,
  canManage,
  loading,
  error,
  onRefresh,
}: {
  invoices: SupplierInvoice[] | null;
  payments: SupplierPayment[] | null;
  suppliers: Supplier[] | null;
  orders: PurchaseOrder[] | null;
  branchId: string | null;
  accessToken: string | undefined;
  canManage: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank_transfer" | "cheque" | "other">("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openInvoices = (invoices ?? []).filter((i) => i.status === "pending" || i.status === "partially_paid");

  async function onCreateInvoice(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to record an invoice.");
      return;
    }
    const amount = Number(totalAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("totalAmount must be a non-negative number.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createSupplierInvoice(accessToken, {
        branchId,
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        invoiceNumber,
        invoiceDate,
        totalAmount: amount,
        status: "pending",
      });
      setInvoiceNumber("");
      setTotalAmount("");
      setPurchaseOrderId("");
      setShowInvoiceForm(false);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to create invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreatePayment(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to record a payment.");
      return;
    }
    const invoice = (invoices ?? []).find((i) => i.id === payInvoiceId);
    if (!invoice) {
      setFormError("Select an invoice to pay.");
      return;
    }
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Payment amount must be positive.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createSupplierPayment(accessToken, {
        branchId,
        supplierId: invoice.supplierId,
        supplierInvoiceId: invoice.id,
        amount,
        paymentMethod: payMethod,
      });
      setPayAmount("");
      setPayInvoiceId("");
      setShowPaymentForm(false);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminSurface aria-labelledby="invoice-matching-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Supplier invoices & payments"
        description="Live AP invoices and payments with three-way matching status on each invoice."
        action={
          canManage && branchId ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceForm((v) => !v);
                  setShowPaymentForm(false);
                  setFormError(null);
                }}
                className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
              >
                {showInvoiceForm ? "Cancel" : "Record invoice"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm((v) => !v);
                  setShowInvoiceForm(false);
                  setFormError(null);
                }}
                className="min-h-9 rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-semibold text-[var(--admin-panel)]"
              >
                {showPaymentForm ? "Cancel" : "Record payment"}
              </button>
            </div>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h3 id="invoice-matching-heading" className="sr-only">
          Supplier invoices and payments
        </h3>

        {showInvoiceForm ? (
          <form onSubmit={(e) => void onCreateInvoice(e)} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Supplier
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Linked PO (optional)
              <select
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">No linked PO</option>
                {(orders ?? [])
                  .filter((o) => !supplierId || o.supplierId === supplierId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.poNumber} · {o.status}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Invoice #
              <input
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Date
              <input
                required
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Amount (PKR)
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 self-end rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save invoice"}
            </button>
          </form>
        ) : null}

        {showPaymentForm ? (
          <form onSubmit={(e) => void onCreatePayment(e)} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2">
              Open invoice
              <select
                required
                value={payInvoiceId}
                onChange={(e) => setPayInvoiceId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} · {i.supplierName ?? "—"} · {formatMoney(i.totalAmount)} · {i.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Amount
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Method
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={busy || openInvoices.length === 0}
              className="min-h-11 self-end rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
            >
              {busy ? "Posting…" : "Post payment"}
            </button>
          </form>
        ) : null}

        {formError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to view invoices.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading invoices…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <h4 className="mb-2 text-sm font-semibold">Invoices</h4>
              {!invoices || invoices.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
                  No invoices recorded yet
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {invoices.map((i) => (
                    <li key={i.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">
                          {i.invoiceNumber} · {formatMoney(i.totalAmount)}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            i.matchingStatus === "MATCHED"
                              ? "bg-emerald-50 text-emerald-900"
                              : i.matchingStatus === "DISCREPANCY"
                                ? "bg-amber-50 text-amber-900"
                                : "bg-[var(--admin-panel)] text-[var(--admin-muted)]"
                          }`}
                        >
                          {i.matchingStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {i.supplierName ?? "—"} · {i.invoiceDate} · {i.status}
                        {i.poNumber ? ` · PO ${i.poNumber}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h4 className="mb-2 text-sm font-semibold">Payments</h4>
              {!payments || payments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
                  No payments recorded yet
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                      <p className="font-semibold">
                        {formatMoney(p.amount)} · {p.paymentMethod.replace("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {p.invoiceNumber ?? "—"} · {p.paymentDate} · {p.supplierName ?? "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          Three-way matching compares linked PO total and posted GRN presence against invoice amount on create
          (UNMATCHED when no PO is linked).
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

export function ApprovalTimelinePanel({
  orders,
  loading,
}: {
  orders: PurchaseOrder[] | null;
  loading: boolean;
}) {
  const pending = (orders ?? []).filter((o) => o.status === "draft" || o.status === "submitted");
  const decided = (orders ?? []).filter((o) => o.status === "approved" || o.status === "rejected");

  return (
    <AdminSurface aria-labelledby="approval-timeline-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Approval workflow"
        description="Live PO approve/reject via PATCH /admin/purchasing/orders/:id/approve."
      />
      <AdminSurfaceBody>
        <h3 id="approval-timeline-heading" className="sr-only">
          Approval timeline
        </h3>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading approval queue…</p>
        ) : (
          <>
            <p className="text-sm text-[var(--admin-muted)]">
              {pending.length} pending · {decided.length} decided. Use Approve / Reject on the purchase orders table.
            </p>
            {pending.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--admin-muted)]">No pending approvals</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {pending.slice(0, 8).map((o) => (
                  <li key={o.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                    <span className="font-semibold">{o.poNumber}</span>
                    <span className="ml-2 capitalize text-[var(--admin-muted)]">{o.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PurchaseDemandPanel() {
  const steps = [
    "Add supplier",
    "Create requisition",
    "Create purchase order",
    "Approve purchase order",
    "Record GRN",
    "Record supplier invoice",
    "Record supplier payment",
  ];
  return (
    <AdminSurface aria-labelledby="purchase-workflow-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Suggested purchasing flow"
        description="Follow this sequence when setting up procurement for a branch."
      />
      <AdminSurfaceBody>
        <h3 id="purchase-workflow-heading" className="sr-only">
          Suggested purchasing flow
        </h3>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-3 text-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Step {index + 1}
              </p>
              <p className="mt-1 font-medium text-[var(--admin-ink)]">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          If a control is unavailable, complete the earlier step first — for example, add a supplier before creating a
          purchase order.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

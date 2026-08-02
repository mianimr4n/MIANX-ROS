import { FormEvent, useState } from "react";
import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { CashReconciliation, ExpenseClaim, SupplierInvoice } from "@/lib/admin-api";
import {
  createCashReconciliation,
  createExpenseClaim,
  transitionCashReconciliation,
  transitionExpenseClaim,
} from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-finance";
import { ApiRequestError } from "@/lib/api";

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function CashPanel({
  items,
  loading,
  error,
  accessToken,
  branchId,
  canManage,
  onRefresh,
}: {
  items: CashReconciliation[] | null;
  loading: boolean;
  error: string | null;
  accessToken: string | undefined;
  branchId: string | null | undefined;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const [openingFloat, setOpeningFloat] = useState("0");
  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to start a cash close.");
      return;
    }
    const float = Number(openingFloat);
    const counted = countedCash === "" ? null : Number(countedCash);
    if (!Number.isFinite(float) || float < 0) {
      setFormError("Opening float must be zero or greater.");
      return;
    }
    if (counted != null && (!Number.isFinite(counted) || counted < 0)) {
      setFormError("Counted cash must be zero or greater.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createCashReconciliation(accessToken, {
        branchId,
        openingFloat: float,
        countedCash: counted,
        closingNote: note || null,
      });
      setOpeningFloat("0");
      setCountedCash("");
      setNote("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to create cash close.");
    } finally {
      setBusy(false);
    }
  }

  async function onTransition(id: string, action: "submit" | "approve" | "reject" | "post") {
    if (!accessToken) return;
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for returning this cash close?")?.trim() || null;
      if (!reason) return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await transitionCashReconciliation(accessToken, id, action, reason);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Cash close update failed.");
    } finally {
      setBusy(false);
    }
  }

  const list = items ?? [];

  return (
    <AdminSurface aria-labelledby="finance-cash-heading" className="mb-6" data-testid="finance-cash-panel">
      <AdminSurfaceHeader
        title="Cash closes"
        description="Opening float, counted cash, and variance — expected cash is calculated on the server."
      />
      <AdminSurfaceBody>
        <h2 id="finance-cash-heading" className="sr-only">
          Cash closes
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading cash closes…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No cash closes are awaiting review.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.slice(0, 8).map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2"
                data-testid={`cash-recon-${row.id}`}
              >
                <p className="font-semibold text-[var(--admin-ink)]">
                  {row.businessDate} · {statusLabel(row.status)}
                  {row.variance != null && Math.abs(row.variance) > 0.001 ? (
                    <span className="ml-2 text-amber-800" aria-label={`Variance ${formatPkr(row.variance)}`}>
                      Variance {formatPkr(row.variance)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Expected {formatPkr(row.expectedCash)} · Counted{" "}
                  {row.countedCash == null ? "—" : formatPkr(row.countedCash)}
                  {row.postingStatus === "blocked" ? ` · ${row.postingBlockedReason ?? "Journal posting requires account mapping"}` : ""}
                </p>
                {canManage ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(row.status === "draft" || row.status === "rejected") && (
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                        onClick={() => void onTransition(row.id, "submit")}
                      >
                        Submit
                      </button>
                    )}
                    {row.status === "submitted" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                          onClick={() => void onTransition(row.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                          onClick={() => void onTransition(row.id, "reject")}
                        >
                          Return
                        </button>
                      </>
                    )}
                    {row.status === "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                        onClick={() => void onTransition(row.id, "post")}
                      >
                        Post journal
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage && branchId ? (
          <form className="mt-4 space-y-2 border-t border-[var(--admin-border)] pt-4" onSubmit={onCreate}>
            <p className="text-sm font-semibold text-[var(--admin-ink)]">Start cash close</p>
            <label className="block text-xs text-[var(--admin-muted)]">
              Opening float
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="block text-xs text-[var(--admin-muted)]">
              Counted cash
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                inputMode="decimal"
                placeholder="Required before submit"
              />
            </label>
            <label className="block text-xs text-[var(--admin-muted)]">
              Closing note
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {formError ? (
              <p className="text-sm text-red-700" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
            >
              {busy ? "Saving…" : "Create draft"}
            </button>
          </form>
        ) : null}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReceivablePanel() {
  return (
    <AdminSurface aria-labelledby="finance-receivables-heading" className="mb-6">
      <AdminSurfaceHeader title="Receivables" description="Customer invoices, receipts, and credit notes." />
      <AdminSurfaceBody>
        <h2 id="finance-receivables-heading" className="sr-only">
          Receivables
        </h2>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="font-semibold text-[var(--admin-ink)]">Accounts receivable — Foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Finance AR APIs exist for draft/issue invoices, receipts, and credit notes. This panel is not wired to load
            that data yet — treat as Foundation / read-only until RC6-FIN-01. Collections automation stays Deferred.
          </p>
          <span
            role="status"
            aria-label="Capability status: Foundation"
            className="mt-3 inline-block rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-900"
          >
            Foundation
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PayablePanel({
  invoices,
  loading,
  error,
}: {
  invoices: SupplierInvoice[] | null;
  loading: boolean;
  error: string | null;
}) {
  const open = (invoices ?? []).filter((i) => i.status === "pending" || i.status === "partially_paid");
  const total = open.reduce((sum, i) => sum + i.totalAmount, 0);
  const overdue = open.filter((i) => i.isOverdue).length;
  const blocked = open.filter((i) => i.settlementBlocked).length;

  return (
    <AdminSurface aria-labelledby="finance-payables-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Payables"
        description="Operational supplier invoices from Purchasing — overdue and match status are calculated live."
        action={
          <Link href="/admin/purchasing" className="text-sm font-semibold text-[var(--brand-red)] hover:underline">
            Open Purchasing
          </Link>
        }
      />
      <AdminSurfaceBody>
        <h2 id="finance-payables-heading" className="sr-only">
          Payables
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading supplier invoices…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : open.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No outstanding supplier invoices
          </p>
        ) : (
          <div>
            <p className="text-sm font-semibold text-[var(--admin-ink)]">
              {open.length} open invoice{open.length === 1 ? "" : "s"} · {formatPkr(total)}
              {overdue > 0 ? ` · ${overdue} overdue` : ""}
              {blocked > 0 ? ` · ${blocked} blocked by mismatch` : ""}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {open.slice(0, 6).map((i) => (
                <li key={i.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                  <p className="font-semibold">
                    {i.invoiceNumber} · {formatPkr(i.totalAmount)}
                    {i.isOverdue ? (
                      <span className="ml-2 text-amber-800" aria-label="Overdue">
                        Overdue
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {i.supplierName ?? "—"} · {i.status}
                    {i.matchingStatus ? ` · ${i.matchingStatus}` : ""}
                    {i.settlementBlocked
                      ? " · Payment blocked until mismatch is resolved"
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ExpensePanel({
  items,
  loading,
  error,
  accessToken,
  branchId,
  canManage,
  onRefresh,
}: {
  items: ExpenseClaim[] | null;
  loading: boolean;
  error: string | null;
  accessToken: string | undefined;
  branchId: string | null | undefined;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const [category, setCategory] = useState("supplies");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to create an expense.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    if (!description.trim()) {
      setFormError("Description is required.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createExpenseClaim(accessToken, {
        branchId,
        category,
        amount: value,
        description: description.trim(),
        payee: payee || null,
        paymentMethod: method,
      });
      setAmount("");
      setDescription("");
      setPayee("");
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to create expense.");
    } finally {
      setBusy(false);
    }
  }

  async function onTransition(
    id: string,
    action: "submit" | "approve" | "reject" | "post" | "pay",
  ) {
    if (!accessToken) return;
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting this expense?")?.trim() || null;
      if (!reason) return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await transitionExpenseClaim(accessToken, id, action, reason);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Expense update failed.");
    } finally {
      setBusy(false);
    }
  }

  const list = items ?? [];

  return (
    <AdminSurface aria-labelledby="finance-expenses-heading" className="mb-6" data-testid="finance-expense-panel">
      <AdminSurfaceHeader title="Expense claims" description="Submit, approve, and post operating expenses." />
      <AdminSurfaceBody>
        <h2 id="finance-expenses-heading" className="sr-only">
          Expense claims
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading expenses…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            No expense claims require approval.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {list.slice(0, 8).map((row) => (
              <li key={row.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <p className="font-semibold">
                  {row.expenseNumber} · {formatPkr(row.amount)} · {statusLabel(row.status)}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {row.category} · {row.description}
                  {row.postingStatus === "blocked"
                    ? ` · ${row.postingBlockedReason ?? "Journal posting requires account mapping"}`
                    : ""}
                </p>
                {canManage ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(row.status === "draft" || row.status === "rejected") && (
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                        onClick={() => void onTransition(row.id, "submit")}
                      >
                        Submit
                      </button>
                    )}
                    {row.status === "submitted" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                          onClick={() => void onTransition(row.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                          onClick={() => void onTransition(row.id, "reject")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {(row.status === "approved" || row.status === "paid") && (
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-semibold"
                        onClick={() => void onTransition(row.id, "post")}
                      >
                        Post journal
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage && branchId ? (
          <form className="mt-4 space-y-2 border-t border-[var(--admin-border)] pt-4" onSubmit={onCreate}>
            <p className="text-sm font-semibold text-[var(--admin-ink)]">New expense</p>
            <label className="block text-xs text-[var(--admin-muted)]">
              Category
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--admin-muted)]">
              Amount
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="block text-xs text-[var(--admin-muted)]">
              Description
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--admin-muted)]">
              Payee
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--admin-muted)]">
              Payment method
              <select
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--admin-border)] px-3"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </label>
            {formError ? (
              <p className="text-sm text-red-700" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
            >
              {busy ? "Saving…" : "Create draft"}
            </button>
          </form>
        ) : null}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function TaxPanel() {
  return (
    <AdminSurface aria-labelledby="finance-tax-heading" className="mb-6">
      <AdminSurfaceHeader title="Tax" description="Configurable tax definitions and posted tax ledger foundations." />
      <AdminSurfaceBody>
        <h2 id="finance-tax-heading" className="sr-only">
          Tax
        </h2>
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="font-semibold text-[var(--admin-ink)]">Tax configuration — Foundation</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Tax definition APIs exist (no hardcoded Pakistan rates). This panel is not wired for list/edit yet — Foundation
            until RC6-FIN-01. Jurisdiction filing/export remains Deferred. Order tax_amount alone is not a compliance
            engine.
          </p>
          <span
            role="status"
            aria-label="Capability status: Foundation"
            className="mt-3 inline-block rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-900"
          >
            Foundation
          </span>
          <span
            role="status"
            aria-label="Capability status: Deferred"
            className="mt-3 ml-2 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800"
          >
            Filing Deferred
          </span>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

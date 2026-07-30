import { useState, type FormEvent } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { PurchaseOrder, PurchaseRequisition, Supplier } from "@/lib/admin-api";
import { formatMoney } from "@/lib/admin-purchasing";

export function SupplierTable({
  suppliers,
  loading,
  error,
  canManage,
  defaultBranchId,
  onAddSupplier,
  addError,
  addBusy,
}: {
  suppliers: Supplier[] | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  defaultBranchId: string | null;
  onAddSupplier: (input: {
    branchId: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
  }) => Promise<boolean>;
  addError: string | null;
  addBusy: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");

  const resetForm = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setBranchId(defaultBranchId ?? "");
    setShowForm(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId) return;
    const ok = await onAddSupplier({
      branchId,
      name,
      contactPerson,
      phone,
      email,
    });
    if (ok) resetForm();
  };

  return (
    <section aria-label="Supplier table" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <AdminSectionTitle
          eyebrow="Suppliers"
          title="Supplier overview"
          description="Vendors for the selected branch. Add a supplier before creating purchase orders."
        />
        {canManage ? (
          <button
            type="button"
            className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white"
            onClick={() => {
              setBranchId(defaultBranchId ?? "");
              setShowForm(true);
            }}
          >
            Add supplier
          </button>
        ) : null}
      </div>

      {showForm && canManage ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mb-4 grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 sm:grid-cols-2"
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Branch ID</span>
            <input
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              placeholder="UUID"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Supplier name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Contact person</span>
            <input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          {addError ? <p className="sm:col-span-2 text-sm text-red-700">{addError}</p> : null}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={addBusy}
              className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {addBusy ? "Saving…" : "Create supplier"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              {["Supplier", "Contact", "Phone", "Email", "Status"].map((col) => (
                <th key={col} scope="col" className="px-3 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-[var(--admin-muted)]">
                  Loading suppliers…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-[var(--admin-muted)]">
                  We couldn&apos;t load suppliers right now. Please try again.
                </td>
              </tr>
            ) : !suppliers || suppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center">
                  <p className="font-semibold">Welcome! No suppliers added yet.</p>
                  <p className="mt-2 text-sm text-[var(--admin-muted)]">
                    Click &apos;Add Supplier&apos; to get started before creating purchase orders.
                  </p>
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="border-b border-[var(--admin-border)] last:border-0">
                  <td className="px-3 py-3 font-medium">{s.name}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{s.contactPerson ?? "—"}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{s.phone ?? "—"}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{s.email ?? "—"}</td>
                  <td className="px-3 py-3 capitalize text-[var(--admin-muted)]">{s.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PurchaseOrderTable({
  orders,
  suppliers,
  loading,
  error,
  canManage,
  defaultBranchId,
  onCreateOrder,
  createError,
  createBusy,
  onDecideApproval,
  approvalBusyId,
  approvalError,
}: {
  orders: PurchaseOrder[] | null;
  suppliers: Supplier[] | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  defaultBranchId: string | null;
  onCreateOrder: (input: {
    branchId: string;
    supplierId: string;
    totalAmount: number;
    expectedDeliveryDate: string;
  }) => Promise<boolean>;
  createError: string | null;
  createBusy: boolean;
  onDecideApproval: (orderId: string, decision: "approved" | "rejected") => Promise<boolean>;
  approvalBusyId: string | null;
  approvalError: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [supplierId, setSupplierId] = useState("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");

  const resetForm = () => {
    setBranchId(defaultBranchId ?? "");
    setSupplierId("");
    setTotalAmount("0");
    setExpectedDeliveryDate("");
    setShowForm(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId || !supplierId) return;
    const ok = await onCreateOrder({
      branchId,
      supplierId,
      totalAmount: Number(totalAmount) || 0,
      expectedDeliveryDate,
    });
    if (ok) resetForm();
  };

  const pending = (status: string) => status === "draft" || status === "submitted";

  return (
    <section aria-label="Purchase order table" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <AdminSectionTitle
          eyebrow="Orders"
          title="Purchase orders"
          description="Approve or reject draft and submitted POs for the selected branch."
        />
        {canManage ? (
          <button
            type="button"
            className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white"
            onClick={() => {
              setBranchId(defaultBranchId ?? "");
              setShowForm(true);
            }}
          >
            Create PO
          </button>
        ) : null}
      </div>

      {showForm && canManage ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mb-4 grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 sm:grid-cols-2"
        >
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
            <span className="mb-1 block font-medium">Supplier</span>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            >
              <option value="">Select supplier…</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Total amount</span>
            <input
              type="number"
              min={0}
              step="any"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Expected delivery</span>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          {(!suppliers || suppliers.length === 0) && (
            <p className="sm:col-span-2 text-sm text-[var(--admin-muted)]">Add a supplier before creating a PO.</p>
          )}
          {createError ? <p className="sm:col-span-2 text-sm text-red-700">{createError}</p> : null}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={createBusy || !suppliers?.length}
              className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createBusy ? "Creating…" : "Create purchase order"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {approvalError ? <p className="mb-3 text-sm text-red-700">{approvalError}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              {["PO number", "Supplier", "Branch", "Status", "Total", "Expected", "Actions"].map((col) => (
                <th key={col} scope="col" className="px-3 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--admin-muted)]">
                  Loading purchase orders…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-red-700">
                  {error}
                </td>
              </tr>
            ) : !orders || orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center">
                  <p className="font-semibold">No purchase orders yet</p>
                  <p className="mt-2 text-sm text-[var(--admin-muted)]">
                    {(!suppliers || suppliers.length === 0)
                      ? "Add a supplier first, then create your first purchase order."
                      : "Create a purchase order against a supplier when you need stock."}
                  </p>
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--admin-border)] last:border-0">
                  <td className="px-3 py-3 font-medium">{o.poNumber}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{o.supplierName ?? "—"}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{o.branchName ?? o.branchCode ?? "—"}</td>
                  <td className="px-3 py-3 capitalize text-[var(--admin-muted)]">{o.status.replaceAll("_", " ")}</td>
                  <td className="px-3 py-3 font-semibold">{formatMoney(o.totalAmount)}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{o.expectedDeliveryDate ?? "—"}</td>
                  <td className="px-3 py-3">
                    {canManage && pending(o.status) ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={approvalBusyId === o.id}
                          className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
                          onClick={() => void onDecideApproval(o.id, "approved")}
                        >
                          {approvalBusyId === o.id ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={approvalBusyId === o.id}
                          className="rounded-md border border-[var(--admin-border)] px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
                          onClick={() => void onDecideApproval(o.id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--admin-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RequisitionPanel({
  requisitions,
  loading,
  error,
  canManage,
  defaultBranchId,
  onCreate,
  createError,
  createBusy,
}: {
  requisitions: PurchaseRequisition[] | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  defaultBranchId: string | null;
  onCreate: (input: { branchId: string; title: string; notes: string }) => Promise<boolean>;
  createError: string | null;
  createBusy: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setBranchId(defaultBranchId ?? "");
    setTitle("");
    setNotes("");
    setShowForm(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId || !title.trim()) return;
    const ok = await onCreate({ branchId, title: title.trim(), notes: notes.trim() });
    if (ok) resetForm();
  };

  return (
    <section className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Purchase requisitions</h3>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Live from GET /admin/purchasing/requisitions.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white"
            onClick={() => {
              setBranchId(defaultBranchId ?? "");
              setShowForm(true);
            }}
          >
            Create requisition
          </button>
        ) : null}
      </div>

      {showForm && canManage ? (
        <form onSubmit={(e) => void submit(e)} className="mb-4 grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 sm:grid-cols-2">
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
            <span className="mb-1 block font-medium">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Notes</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          {createError ? <p className="sm:col-span-2 text-sm text-red-700">{createError}</p> : null}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={createBusy}
              className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createBusy ? "Saving…" : "Create"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading requisitions…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : !requisitions || requisitions.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">No purchase requisitions created yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {requisitions.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] pb-2 last:border-0">
              <span className="font-medium">{r.title}</span>
              <span className="capitalize text-[var(--admin-muted)]">{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

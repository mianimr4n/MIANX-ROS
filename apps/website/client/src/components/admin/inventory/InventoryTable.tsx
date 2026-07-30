import { useState, type FormEvent } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { InventoryItem } from "@/lib/admin-api";
import { formatStockQty } from "@/lib/admin-inventory";

export function InventoryTable({
  items,
  loading,
  error,
  canManage,
  defaultBranchId,
  onAddItem,
  addError,
  addBusy,
}: {
  items: InventoryItem[] | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  defaultBranchId: string | null;
  onAddItem: (input: {
    branchId: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
    costPrice: number | null;
  }) => Promise<boolean>;
  addError: string | null;
  addBusy: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("unit");
  const [currentStock, setCurrentStock] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [costPrice, setCostPrice] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");

  const resetForm = () => {
    setSku("");
    setName("");
    setUnit("unit");
    setCurrentStock("0");
    setMinimumStock("0");
    setReorderLevel("0");
    setCostPrice("");
    setBranchId(defaultBranchId ?? "");
    setShowForm(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId) return;
    const ok = await onAddItem({
      branchId,
      sku,
      name,
      unit,
      currentStock: Number(currentStock) || 0,
      minimumStock: Number(minimumStock) || 0,
      reorderLevel: Number(reorderLevel) || 0,
      costPrice: costPrice.trim() === "" ? null : Number(costPrice),
    });
    if (ok) resetForm();
  };

  return (
    <section aria-label="Stock item table" className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <AdminSectionTitle
          eyebrow="Stock"
          title="Stock items"
          description="Live from GET /admin/inventory/items — branch-scoped ingredient stock."
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
            Add stock item
          </button>
        ) : null}
      </div>

      {showForm && canManage ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mb-4 grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 sm:grid-cols-2 lg:grid-cols-3"
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
            <span className="mb-1 block font-medium">SKU</span>
            <input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Unit</span>
            <input
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Opening stock</span>
            <input
              type="number"
              min={0}
              step="any"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Minimum stock</span>
            <input
              type="number"
              min={0}
              step="any"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Reorder level</span>
            <input
              type="number"
              min={0}
              step="any"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Cost price (optional)</span>
            <input
              type="number"
              min={0}
              step="any"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            />
          </label>
          {addError ? <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-700">{addError}</p> : null}
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button
              type="submit"
              disabled={addBusy}
              className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {addBusy ? "Saving…" : "Create item"}
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
              {["Stock item", "SKU", "Unit", "On hand", "Status", "Unit cost", "Reorder"].map((col) => (
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
                  Loading stock items…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-red-700">
                  {error}
                </td>
              </tr>
            ) : !items || items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center">
                  <p className="font-semibold text-[var(--admin-ink)]">No stock items added yet</p>
                  <p className="mt-2 max-w-xl mx-auto text-sm text-[var(--admin-muted)]">
                    Add ingredient stock items for this branch. Menu catalog SKUs in{" "}
                    <Link href="/admin/menu" className="font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline">
                      Menu Management
                    </Link>{" "}
                    are sellable products — not on-hand inventory.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--admin-border)] last:border-0">
                  <td className="px-3 py-3 font-medium text-[var(--admin-ink)]">{item.name}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{item.sku}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">{item.unit}</td>
                  <td className="px-3 py-3 font-semibold">{formatStockQty(item.currentStock, item.unit)}</td>
                  <td className="px-3 py-3 capitalize text-[var(--admin-muted)]">{item.status}</td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">
                    {item.costPrice == null ? "—" : item.costPrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-[var(--admin-muted)]">
                    {formatStockQty(item.reorderLevel, item.unit)}
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

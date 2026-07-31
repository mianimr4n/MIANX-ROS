import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import {
  activateInventoryRecipe,
  createInventoryRecipe,
  deactivateInventoryRecipe,
  duplicateInventoryRecipe,
  listInventoryRecipes,
  listMissingRecipeMenuItems,
  type InventoryItem,
  type InventoryRecipe,
  type StockMovement,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  formatMovementLabel,
  formatStockQty,
  isLowStock,
  type InventoryKpiSnapshot,
} from "@/lib/admin-inventory";
import type { MenuItem } from "@/lib/telepizza-types";

export function StockMovementTimeline({
  movements,
  loading,
  error,
}: {
  movements: StockMovement[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <AdminSurface aria-labelledby="stock-movement-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Stock movement history"
        description="Adjustments, receipts, and waste for the selected branch."
      />
      <AdminSurfaceBody>
        <h3 id="stock-movement-heading" className="sr-only">
          Stock movement history
        </h3>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading movements…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : !movements || movements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            <p className="font-semibold text-[var(--admin-ink)]">No stock movements yet</p>
            <p className="mt-2">
              Adjustments and opening stock create immutable ledger rows. Order history is not a substitute for stock
              movements.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {movements.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3 text-sm"
              >
                <p className="font-semibold text-[var(--admin-ink)]">{formatMovementLabel(m)}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {new Date(m.createdAt).toLocaleString()}
                  {m.reason ? ` · ${m.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function LowStockPanel({ items }: { items: InventoryItem[] | null }) {
  const low = (items ?? []).filter(isLowStock);
  return (
    <AdminSurface aria-labelledby="low-stock-heading" className="mb-6">
      <AdminSurfaceHeader title="Low stock & reorder" description="Threshold-based on live balances." />
      <AdminSurfaceBody>
        <h3 id="low-stock-heading" className="sr-only">
          Low stock and reorder
        </h3>
        {items == null ? (
          <p className="text-sm text-[var(--admin-muted)]">Load stock items to evaluate reorder thresholds.</p>
        ) : low.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">
            No items at or below reorder/minimum level
            {items.length === 0 ? " — add stock items first." : "."}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {low.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-[var(--admin-border)] pb-2 last:border-0">
                <span className="font-medium text-[var(--admin-ink)]">{item.name}</span>
                <span className="text-[var(--admin-muted)]">
                  {formatStockQty(item.currentStock, item.unit)} / reorder {formatStockQty(item.reorderLevel, item.unit)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function RecipeMappingPanel({
  snapshot,
  accessToken,
  branchId,
  canManage,
  menuItems,
  stockItems,
}: {
  snapshot: InventoryKpiSnapshot | null;
  accessToken: string | undefined;
  branchId: string | null;
  canManage: boolean;
  menuItems: MenuItem[];
  stockItems: InventoryItem[] | null;
}) {
  const [recipes, setRecipes] = useState<InventoryRecipe[]>([]);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("g");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken || !branchId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, missing] = await Promise.all([
        listInventoryRecipes(accessToken, { branchId }),
        listMissingRecipeMenuItems(
          accessToken,
          branchId,
          menuItems.map((m) => m.id),
        ),
      ]);
      setRecipes(list);
      setMissingIds(missing);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Unable to load recipes.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, branchId, menuItems]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId || !menuItemId || !inventoryItemId) return;
    setCreating(true);
    setError(null);
    try {
      await createInventoryRecipe(accessToken, {
        branchId,
        menuItemId,
        name: name.trim() || "Recipe",
        lines: [
          {
            inventoryItemId,
            quantity: Number(quantity),
            unit,
            wasteFactor: 1,
          },
        ],
      });
      setName("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Recipe create failed.");
    } finally {
      setCreating(false);
    }
  }

  async function runAction(id: string, action: "activate" | "deactivate" | "duplicate") {
    if (!accessToken) return;
    setBusyId(id);
    setError(null);
    try {
      if (action === "activate") await activateInventoryRecipe(accessToken, id);
      if (action === "deactivate") await deactivateInventoryRecipe(accessToken, id);
      if (action === "duplicate") await duplicateInventoryRecipe(accessToken, id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Recipe action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const missingCount = missingIds.length;

  return (
    <AdminSurface aria-labelledby="recipe-mapping-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Recipe & menu linkage"
        description="LIVE versioned recipes sync to kitchen BOM. Consume runs once at kitchen → preparing."
        action={
          <Link href="/admin/menu" className="text-sm font-semibold text-[var(--brand-red)] hover:underline">
            Open Menu Management
          </Link>
        }
      />
      <AdminSurfaceBody>
        <h3 id="recipe-mapping-heading" className="sr-only">
          Recipe mapping
        </h3>
        <p className="mb-3 text-sm text-[var(--admin-muted)]" role="status">
          Cost state uses inventory <code className="text-xs">cost_price</code> (DERIVED). COGS GL posting is DEFERRED.
          Modifier ingredient effects are stored but not consumed yet.
        </p>
        {error ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-[var(--admin-muted)]">
          <li>{snapshot?.menuBrowseSkus ?? menuItems.length} browse menu SKUs</li>
          <li>
            {missingCount} sellable SKUs without an <strong>active</strong> recipe for this branch
            {missingCount > 0 ? " — warn: sales will not deduct those items" : ""}
          </li>
          <li>{recipes.length} recipe version{recipes.length === 1 ? "" : "s"} in scope</li>
        </ul>

        {canManage && branchId ? (
          <form className="mb-4 grid gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreate}>
            <label className="text-xs font-medium">
              Recipe name
              <input className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="text-xs font-medium">
              Menu item
              <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} required>
                <option value="">Select…</option>
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Ingredient
              <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)} required>
                <option value="">Select…</option>
                {(stockItems ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Qty
              <input className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" type="number" min="0.001" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </label>
            <label className="text-xs font-medium">
              Unit
              <select className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
                {["g", "kg", "ml", "l", "piece"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={creating || !stockItems?.length} className="w-full rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {creating ? "Creating…" : "Create draft recipe"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mb-3 text-sm text-[var(--admin-muted)]">inventory.manage or admin.access required to edit recipes.</p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading recipes…</p>
        ) : recipes.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-[var(--admin-muted)]">
            No recipes yet. Create a draft, then activate to sync kitchen BOM.
          </p>
        ) : (
          <ul className="space-y-2">
            {recipes.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white px-3 py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {r.name} · v{r.version} · {r.status}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {r.menuItemName ?? r.menuItemId} · {r.lines.length} ingredient{r.lines.length === 1 ? "" : "s"} · cost{" "}
                      {r.estimatedCostState === "DERIVED" && r.estimatedCost != null
                        ? `${r.estimatedCost.toFixed(2)} (DERIVED)`
                        : "UNAVAILABLE"}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      {r.status !== "active" ? (
                        <button type="button" className="rounded-lg border px-2 py-1 text-xs font-semibold" disabled={busyId === r.id} onClick={() => void runAction(r.id, "activate")}>
                          Activate
                        </button>
                      ) : (
                        <button type="button" className="rounded-lg border px-2 py-1 text-xs font-semibold" disabled={busyId === r.id} onClick={() => void runAction(r.id, "deactivate")}>
                          Deactivate
                        </button>
                      )}
                      <button type="button" className="rounded-lg border px-2 py-1 text-xs font-semibold" disabled={busyId === r.id} onClick={() => void runAction(r.id, "duplicate")}>
                        Duplicate
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function InventoryValuationPanel({ stockValue }: { stockValue: number | null }) {
  return (
    <AdminSurface aria-labelledby="valuation-heading" className="mb-6">
      <AdminSurfaceHeader title="Stock valuation" description="Retail menu price is not inventory cost." />
      <AdminSurfaceBody>
        <h3 id="valuation-heading" className="sr-only">
          Stock valuation
        </h3>
        <p className="text-sm font-semibold text-[var(--admin-ink)]">
          {stockValue == null
            ? "Derived valuation unavailable"
            : `Derived stock value: ${stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          LIVE derived total uses Σ(current_stock × cost_price) where cost is set. FIFO / WAC valuation engine is Planned
          for Phase 2. Menu selling prices must not be used as unit cost.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

function WorkflowPhase2Panel({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string;
}) {
  return (
    <AdminSurface aria-labelledby={`${title}-heading`}>
      <AdminSurfaceHeader title={title} description={description} />
      <AdminSurfaceBody>
        <h3 id={`${title}-heading`} className="sr-only">
          {title}
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">{body}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Planned for Phase 2
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReceivingPanel() {
  return (
    <AdminSurface aria-labelledby="receiving-heading">
      <AdminSurfaceHeader
        title="Receiving"
        description="Goods receipt against purchase orders."
        action={
          <Link href="/admin/purchasing" className="text-sm font-semibold text-[var(--brand-red)] hover:underline">
            Open Purchasing GRN
          </Link>
        }
      />
      <AdminSurfaceBody>
        <h3 id="receiving-heading" className="sr-only">
          Receiving
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          PO-linked GRN is LIVE in Purchasing. Mapped inventory lines post stock atomically on receive; unmapped lines
          are skipped. Use receipt movement type below for non-PO stock receipts.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">LIVE via Purchasing</p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function StockAdjustmentPanel({
  items,
  canManage,
  onAdjust,
  adjustError,
  adjustBusy,
}: {
  items: InventoryItem[] | null;
  canManage: boolean;
  onAdjust: (input: {
    inventoryItemId: string;
    quantityDelta: number;
    reason: string;
    movementType: "adjustment" | "receipt" | "waste";
  }) => Promise<boolean>;
  adjustError: string | null;
  adjustBusy: boolean;
}) {
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("");
  const [reason, setReason] = useState("");
  const [movementType, setMovementType] = useState<"adjustment" | "receipt" | "waste">("adjustment");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!inventoryItemId) return;
    const delta = Number(quantityDelta);
    if (!Number.isFinite(delta) || delta === 0) return;
    const ok = await onAdjust({
      inventoryItemId,
      quantityDelta: delta,
      reason: reason.trim(),
      movementType,
    });
    if (ok) {
      setQuantityDelta("");
      setReason("");
    }
  };

  if (!canManage) {
    return (
      <AdminSurface aria-labelledby="stock-adjustments-heading">
        <AdminSurfaceHeader title="Stock adjustments" description="Count corrections, damage, and data fixes." />
        <AdminSurfaceBody>
          <p className="text-sm text-[var(--admin-muted)]">
            inventory.manage or admin.access required to post adjustments.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
    );
  }

  return (
    <AdminSurface aria-labelledby="stock-adjustments-heading">
      <AdminSurfaceHeader
        title="Stock adjustments"
        description="Posts to POST /admin/inventory/adjustments — updates on-hand and ledger."
      />
      <AdminSurfaceBody>
        <h3 id="stock-adjustments-heading" className="sr-only">
          Stock adjustments
        </h3>
        {!items || items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Add a stock item before recording adjustments.</p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="grid gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Stock item</span>
              <select
                required
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              >
                <option value="">Select item…</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {formatStockQty(item.currentStock, item.unit)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Movement type</span>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as typeof movementType)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              >
                <option value="adjustment">Adjustment</option>
                <option value="receipt">Receipt</option>
                <option value="waste">Waste</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Quantity delta (+/-)</span>
              <input
                required
                type="number"
                step="any"
                value={quantityDelta}
                onChange={(e) => setQuantityDelta(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Reason</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
                placeholder="Count correction, damage, receipt…"
              />
            </label>
            {adjustError ? <p className="text-sm text-red-700">{adjustError}</p> : null}
            <button
              type="submit"
              disabled={adjustBusy}
              className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {adjustBusy ? "Posting…" : "Post adjustment"}
            </button>
          </form>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function StockTransferPanel() {
  return (
    <WorkflowPhase2Panel
      title="Stock transfers"
      description="Branch and location transfers."
      body="Transfer workflow (draft → dispatched → received) requires dual-sided movement records and approval — not branch selector alone."
    />
  );
}

export function WastePanel({
  items,
  canManage,
  onAdjust,
  adjustError,
  adjustBusy,
}: {
  items: InventoryItem[] | null;
  canManage: boolean;
  onAdjust: (input: {
    inventoryItemId: string;
    quantityDelta: number;
    reason: string;
    movementType: "adjustment" | "receipt" | "waste";
  }) => Promise<boolean>;
  adjustError: string | null;
  adjustBusy: boolean;
}) {
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!inventoryItemId) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const ok = await onAdjust({
      inventoryItemId,
      quantityDelta: -Math.abs(qty),
      reason: reason.trim() || "Waste / spoilage",
      movementType: "waste",
    });
    if (ok) {
      setQuantity("");
      setReason("");
    }
  };

  return (
    <AdminSurface aria-labelledby="inventory-waste-panel" id="inventory-waste-panel">
      <AdminSurfaceHeader
        title="Waste & spoilage"
        description="Posts movementType=waste via POST /admin/inventory/adjustments."
      />
      <AdminSurfaceBody>
        <h3 id="inventory-waste-heading" className="sr-only">
          Waste and spoilage
        </h3>
        {!canManage ? (
          <p className="text-sm text-[var(--admin-muted)]">inventory.manage required to log waste.</p>
        ) : !items || items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Add a stock item before logging waste.</p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="grid gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Stock item</span>
              <select
                required
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              >
                <option value="">Select item…</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {formatStockQty(item.currentStock, item.unit)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Quantity wasted</span>
              <input
                required
                type="number"
                min={0.001}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Reason</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
                placeholder="Spoilage, overproduction…"
              />
            </label>
            {adjustError ? <p className="text-sm text-red-700">{adjustError}</p> : null}
            <button
              type="submit"
              disabled={adjustBusy}
              className="rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {adjustBusy ? "Posting…" : "Log waste"}
            </button>
          </form>
        )}
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          Dedicated waste reason-code master is Planned for Phase 2.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReorderPlanningPanel() {
  return (
    <WorkflowPhase2Panel
      title="Reorder planning"
      description="Par levels and suggested purchase quantities."
      body="Low-stock list uses configured reorder levels on live balances. Suggested PO quantities API is Planned for Phase 2 — no AI demand forecast."
    />
  );
}

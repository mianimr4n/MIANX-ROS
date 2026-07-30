import { useState, type FormEvent } from "react";
import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { InventoryItem, StockMovement } from "@/lib/admin-api";
import {
  formatMovementLabel,
  formatStockQty,
  isLowStock,
  type InventoryKpiSnapshot,
} from "@/lib/admin-inventory";

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

export function RecipeMappingPanel({ snapshot }: { snapshot: InventoryKpiSnapshot | null }) {
  return (
    <AdminSurface aria-labelledby="recipe-mapping-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Recipe & menu linkage"
        description="Catalog overview for readiness — not ingredient consumption."
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
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-5 text-sm">
          <p className="font-semibold text-[var(--admin-ink)]">Recipe Mapping — Planned for Phase 2</p>
          <p className="mt-2 text-[var(--admin-muted)]">
            Inventory cannot be deducted from sales until menu products and variants are linked to versioned recipes with
            units, yields, and ingredient quantities.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--admin-muted)]">
            <li>{snapshot?.menuBrowseSkus ?? 0} browse menu SKUs in catalog (sellable)</li>
            <li>{snapshot?.menuInternalSkus ?? 0} internal topping SKUs (customizer)</li>
            <li>{snapshot?.unmappedRecipeProducts ?? 0} SKUs without recipe BOM in repository</li>
            <li>{snapshot?.modifierGroupsInCatalog ?? 0} modifier groups — pricing options, not ingredient stock</li>
          </ul>
          <p className="mt-3 text-xs uppercase tracking-wide text-[var(--admin-muted)]">
            Planned for Phase 2 — server-side recipe consumption engine required
          </p>
        </div>
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

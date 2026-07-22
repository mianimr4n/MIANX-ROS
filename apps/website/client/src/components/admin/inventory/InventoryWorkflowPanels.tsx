import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { Link } from "wouter";
import type { InventoryKpiSnapshot } from "@/lib/admin-inventory";

export function StockMovementTimeline() {
  return (
    <AdminSurface aria-labelledby="stock-movement-heading" className="mb-6">
      <AdminSurfaceHeader title="Stock movement history" description="Immutable ledger required for audit." />
      <AdminSurfaceBody>
        <h3 id="stock-movement-heading" className="sr-only">
          Stock movement history
        </h3>
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
          <p className="font-semibold text-[var(--admin-ink)]">Stock movement ledger unavailable</p>
          <p className="mt-2">
            A persistent movement ledger is required before receiving, transfers, adjustments, waste, and consumption can
            be audited. Order history is not a substitute for stock movements.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function LowStockPanel() {
  return (
    <AdminSurface aria-labelledby="low-stock-heading" className="mb-6">
      <AdminSurfaceHeader title="Low stock & reorder" description="Threshold-based alerts require real balances." />
      <AdminSurfaceBody>
        <h3 id="low-stock-heading" className="sr-only">
          Low stock and reorder
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          Reorder threshold not configured — no branch on-hand quantities exist in the repository. Low-stock intelligence
          is unavailable until par levels and stock balances ship.
        </p>
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
          <p className="font-semibold text-[var(--admin-ink)]">Recipe Mapping Foundation</p>
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
            UNAVAILABLE — server-side recipe consumption engine required
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function InventoryValuationPanel() {
  return (
    <AdminSurface aria-labelledby="valuation-heading" className="mb-6">
      <AdminSurfaceHeader title="Stock valuation" description="Retail menu price is not inventory cost." />
      <AdminSurfaceBody>
        <h3 id="valuation-heading" className="sr-only">
          Stock valuation
        </h3>
        <p className="text-sm font-semibold text-[var(--admin-ink)]">Inventory valuation unavailable</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Purchase cost history and an approved valuation method (weighted average, FIFO, or standard cost) are required.
          Menu selling prices must not be used as unit cost.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

function WorkflowFoundationPanel({
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
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Foundation — no write API</p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReceivingPanel() {
  return (
    <WorkflowFoundationPanel
      title="Receiving"
      description="Goods receipt against purchase orders."
      body="No receiving or goods receipt API exists. Frontend cannot increment stock balances without validated server ledger entries."
    />
  );
}

export function StockAdjustmentPanel() {
  return (
    <WorkflowFoundationPanel
      title="Stock adjustments"
      description="Count corrections, damage, and data fixes."
      body="Adjustments require actor, reason, branch scope, and immutable movement rows — not React state updates."
    />
  );
}

export function StockTransferPanel() {
  return (
    <WorkflowFoundationPanel
      title="Stock transfers"
      description="Branch and location transfers."
      body="Transfer workflow (draft → dispatched → received) requires dual-sided movement records and approval — not branch selector alone."
    />
  );
}

export function WastePanel() {
  return (
    <WorkflowFoundationPanel
      title="Waste & spoilage"
      description="Logged waste with audit trail."
      body="Waste categories and spoilage logging require negative movement rows. Estimated waste totals are not shown."
    />
  );
}

export function ReorderPlanningPanel() {
  return (
    <WorkflowFoundationPanel
      title="Reorder planning"
      description="Par levels and suggested purchase quantities."
      body="Suggestions require configured reorder points on real balances. No AI demand forecast or autonomous purchase orders."
    />
  );
}

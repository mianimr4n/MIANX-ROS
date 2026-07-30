import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { InventoryKpiSnapshot } from "@/lib/admin-inventory";

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function UnavailableInventoryKpis() {
  const cards = [
    "Total stock items",
    "In stock",
    "Low stock",
    "Out of stock",
    "Menu browse SKUs",
    "Internal / topping SKUs",
    "Unmapped recipes",
    "Stock value",
    "Waste today",
    "Received today",
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((title) => (
        <AdminKpiCard
          key={title}
          title={title}
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail={
            title === "Menu browse SKUs" ||
            title === "Internal / topping SKUs" ||
            title === "Unmapped recipes"
              ? "Menu catalog payload unavailable — not shown as zero"
              : "Stock ledger not loaded"
          }
        />
      ))}
    </div>
  );
}

export function InventoryKPIs({
  snapshot,
  loading,
}: {
  snapshot: InventoryKpiSnapshot | null;
  loading: boolean;
}) {
  const stockLoaded = snapshot?.stockItemCount != null;
  const movementsLoaded = snapshot?.wasteTodayQty != null;
  const valueLoaded = snapshot?.stockValue != null;

  return (
    <section aria-label="Inventory key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Inventory"
        title="Operational KPIs"
        description="Live stock counts, derived cost×qty value, and today waste/receipt movement totals."
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : !snapshot ? (
        <UnavailableInventoryKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Total stock items"
            value={stockLoaded ? String(snapshot.stockItemCount) : "—"}
            source={stockLoaded ? "LIVE" : "UNAVAILABLE"}
            unavailable={!stockLoaded}
            detail={stockLoaded ? "GET /admin/inventory/items" : "Requires inventory.manage"}
          />
          <AdminKpiCard
            title="Low stock"
            value={stockLoaded ? String(snapshot.lowStockCount) : "—"}
            source={stockLoaded ? "LIVE" : "UNAVAILABLE"}
            unavailable={!stockLoaded}
            detail={stockLoaded ? "current_stock ≤ reorder/minimum" : "Requires reorder thresholds"}
          />
          <AdminKpiCard title="Out of stock" value="—" source="UNAVAILABLE" unavailable detail="Not derived from menu flags" />
          <AdminKpiCard
            title="Menu browse SKUs"
            value={String(snapshot.menuBrowseSkus)}
            source="DERIVED"
            detail="Sellable catalog items — not stock rows"
          />
          <AdminKpiCard
            title="Internal / topping SKUs"
            value={String(snapshot.menuInternalSkus)}
            source="DERIVED"
            detail="Customizer toppings — not ingredient ledger"
          />
          <AdminKpiCard
            title="Unmapped recipes"
            value={String(snapshot.unmappedRecipeProducts)}
            source="DERIVED"
            detail="All catalog SKUs lack recipe BOM"
          />
          <AdminKpiCard
            title="Stock value"
            value={valueLoaded ? formatMoney(snapshot.stockValue ?? 0) : "—"}
            source={valueLoaded ? "DERIVED" : "UNAVAILABLE"}
            unavailable={!valueLoaded}
            detail={
              valueLoaded
                ? "Σ(current_stock × cost_price) where cost is set"
                : "Requires inventory.manage"
            }
          />
          <AdminKpiCard
            title="Waste today"
            value={movementsLoaded ? String(snapshot.wasteTodayQty) : "—"}
            source={movementsLoaded ? "LIVE" : "UNAVAILABLE"}
            unavailable={!movementsLoaded}
            detail={movementsLoaded ? "stock_movements movementType=waste (today)" : "Requires movements load"}
          />
          <AdminKpiCard
            title="Received today"
            value={movementsLoaded ? String(snapshot.receivedTodayQty) : "—"}
            source={movementsLoaded ? "LIVE" : "UNAVAILABLE"}
            unavailable={!movementsLoaded}
            detail={
              movementsLoaded
                ? "stock_movements receipt/purchase (today)"
                : "Requires movements load"
            }
          />
        </div>
      )}
    </section>
  );
}

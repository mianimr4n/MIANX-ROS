import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { InventoryKpiSnapshot } from "@/lib/admin-inventory";

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
              : "No stock ledger / inventory API"
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
  return (
    <section aria-label="Inventory key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Inventory"
        title="Operational KPIs"
        description="Only menu-catalog linkage metrics are derivable today — no stock balances or valuation in repository."
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
          <AdminKpiCard title="Total stock items" value="—" source="UNAVAILABLE" unavailable detail="No stock item master" />
          <AdminKpiCard title="In stock" value="—" source="UNAVAILABLE" unavailable detail="Requires branch balances" />
          <AdminKpiCard title="Low stock" value="—" source="UNAVAILABLE" unavailable detail="Requires reorder thresholds" />
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
          <AdminKpiCard title="Stock value" value="—" source="UNAVAILABLE" unavailable detail="Purchase cost history required" />
          <AdminKpiCard title="Waste today" value="—" source="UNAVAILABLE" unavailable detail="No waste_events table" />
          <AdminKpiCard title="Received today" value="—" source="UNAVAILABLE" unavailable detail="No goods receipt API" />
        </div>
      )}
    </section>
  );
}

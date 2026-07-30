import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { InventoryKpiSnapshot } from "@/lib/admin-inventory";

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function UnavailableInventoryKpis() {
  const cards = [
    "Total stock items",
    "Low stock",
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
          value={null}
          source="UNAVAILABLE"
          state="unavailable"
          detail="Data unavailable"
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
        description="Stock health for the selected branch. Unavailable sources show — — never a fabricated zero."
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : !snapshot ? (
        <UnavailableInventoryKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Total stock items"
            value={stockLoaded ? String(snapshot.stockItemCount) : null}
            source={stockLoaded ? "LIVE" : "UNAVAILABLE"}
            state={stockLoaded ? "available" : "unavailable"}
            detail={stockLoaded ? "Updated from current branch operations" : "Access unavailable"}
            showResolvedZero
          />
          <AdminKpiCard
            title="Low stock"
            value={stockLoaded ? String(snapshot.lowStockCount) : null}
            source={stockLoaded ? "LIVE" : "UNAVAILABLE"}
            state={stockLoaded ? "available" : "unavailable"}
            detail={stockLoaded ? "Items at or below reorder / minimum" : "Access unavailable"}
            showResolvedZero
          />
          <AdminKpiCard
            title="Stock value"
            value={valueLoaded ? formatMoney(snapshot.stockValue ?? 0) : null}
            source={valueLoaded ? "DERIVED" : "UNAVAILABLE"}
            state={valueLoaded ? "available" : "unavailable"}
            detail={
              valueLoaded
                ? "Calculated from on-hand quantity × cost where cost is set"
                : "Access unavailable"
            }
          />
          <AdminKpiCard
            title="Waste today"
            value={movementsLoaded ? String(snapshot.wasteTodayQty) : null}
            source={movementsLoaded ? "LIVE" : "UNAVAILABLE"}
            state={movementsLoaded ? "available" : "unavailable"}
            detail={movementsLoaded ? "Waste logged today" : "Access unavailable"}
            showResolvedZero
          />
          <AdminKpiCard
            title="Received today"
            value={movementsLoaded ? String(snapshot.receivedTodayQty) : null}
            source={movementsLoaded ? "LIVE" : "UNAVAILABLE"}
            state={movementsLoaded ? "available" : "unavailable"}
            detail={movementsLoaded ? "Receipts logged today" : "Access unavailable"}
            showResolvedZero
          />
        </div>
      )}
    </section>
  );
}

import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { MenuKpiSnapshot } from "@/lib/admin-menu";
import { formatPkr } from "@/lib/admin-order-format";

export function MenuKPIs({
  snapshot,
  loading,
  sourceNote,
}: {
  snapshot: MenuKpiSnapshot | null;
  loading: boolean;
  sourceNote: string;
}) {
  return (
    <section aria-label="Menu key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Menu"
        title="Catalog KPIs"
        description={`${sourceNote} Hidden DB rows and draft/publish states are not exposed by the read API.`}
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard title="Categories" value={String(snapshot?.categories ?? 0)} source="LIVE" detail="Browse categories in catalog" />
          <AdminKpiCard title="Sellable SKUs" value={String(snapshot?.browseProducts ?? 0)} source="LIVE" detail="Customer browse SKUs, one price each" />
          <AdminKpiCard title="Internal SKUs" value={String(snapshot?.internalSkus ?? 0)} source="LIVE" detail="Topping / internal items" />
          <AdminKpiCard title="Deals" value={String(snapshot?.deals ?? 0)} source="DERIVED" detail="productType = deal" />
          <AdminKpiCard title="Modifier groups" value={String(snapshot?.modifierGroups ?? 0)} source="LIVE" detail="Attached relational groups" />
          <AdminKpiCard title="Product families" value={String(snapshot?.productFamilies ?? 0)} source="DERIVED" detail="Distinct product_group_slug values" />
          <AdminKpiCard
            title="Average price"
            value={snapshot?.averagePrice != null ? formatPkr(snapshot.averagePrice) : "—"}
            source={snapshot?.averagePrice != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.averagePrice == null}
            detail="Default/display price across browse items"
          />
          <AdminKpiCard title="With modifiers" value={String(snapshot?.withModifiers ?? 0)} source="DERIVED" detail="Products with modifierGroups" />
          <AdminKpiCard title="Hidden products" value="—" source="UNAVAILABLE" unavailable detail="Read API filters is_available rows" />
          <AdminKpiCard title="Published / Draft" value="—" source="UNAVAILABLE" unavailable detail="No publish workflow API" />
        </div>
      )}
    </section>
  );
}

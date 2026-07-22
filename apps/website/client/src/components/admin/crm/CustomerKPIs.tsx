import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { CrmKpiSnapshot } from "@/lib/admin-crm";
import { formatPkr } from "@/lib/admin-order-format";

export function CustomerKPIs({
  snapshot,
  loading,
  windowNote,
}: {
  snapshot: CrmKpiSnapshot | null;
  loading: boolean;
  windowNote: string;
}) {
  return (
    <section aria-label="Customer key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="CRM"
        title="Customer KPIs"
        description={`${windowNote} VIP, blocked, and email identity stay Foundation until a customers API exists.`}
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Total customers"
            value={String(snapshot?.totalCustomers ?? 0)}
            source="DERIVED"
            detail="Unique phones in loaded order window"
          />
          <AdminKpiCard
            title="Active customers"
            value={String(snapshot?.activeCustomers ?? 0)}
            source="DERIVED"
            detail="Ordered in last 30 days"
          />
          <AdminKpiCard
            title="New customers today"
            value={String(snapshot?.newToday ?? 0)}
            source="DERIVED"
            detail="First seen order today (Karachi)"
          />
          <AdminKpiCard
            title="Repeat customers"
            value={String(snapshot?.repeatCustomers ?? 0)}
            source="DERIVED"
            detail="2+ orders in loaded window"
          />
          <AdminKpiCard
            title="VIP customers"
            value="—"
            source="FOUNDATION"
            unavailable
            detail="No VIP flag on customers yet"
          />
          <AdminKpiCard
            title="Blocked customers"
            value="—"
            source="FOUNDATION"
            unavailable
            detail="No blocklist API yet"
          />
          <AdminKpiCard
            title="Average order value"
            value={snapshot?.averageOrderValue != null ? formatPkr(snapshot.averageOrderValue) : "—"}
            source={snapshot?.averageOrderValue != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.averageOrderValue == null}
            detail="Mean of per-customer average spend"
          />
          <AdminKpiCard
            title="Lifetime value"
            value={snapshot?.lifetimeValueAvg != null ? formatPkr(snapshot.lifetimeValueAvg) : "—"}
            source={snapshot?.lifetimeValueAvg != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.lifetimeValueAvg == null}
            detail="Mean lifetime spend in loaded window"
          />
        </div>
      )}
    </section>
  );
}

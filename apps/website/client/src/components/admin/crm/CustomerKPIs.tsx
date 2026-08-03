import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";
import type { CrmKpiSnapshot } from "@/lib/admin-crm";
import { formatPkr } from "@/lib/admin-order-format";

function UnavailableCustomerKpis() {
  const cards = [
    "Total customers",
    "Active customers",
    "New customers today",
    "Repeat customers",
    "Average order value",
    "Lifetime value (loaded window)",
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((title) => (
        <AdminKpiCard
          key={title}
          title={title}
          value="—"
          source="UNAVAILABLE"
          unavailable
          detail="Customer order window unavailable — not shown as zero"
        />
      ))}
    </div>
  );
}

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
        description={`${windowNote} Order-derived CRM only — VIP and blocked customer status are not available.`}
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : !snapshot ? (
        <UnavailableCustomerKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AdminKpiCard
            title="Total customers"
            value={String(snapshot.totalCustomers)}
            source="DERIVED"
            detail="Unique phones in loaded order window"
          />
          <AdminKpiCard
            title="Active customers"
            value={String(snapshot.activeCustomers)}
            source="DERIVED"
            detail="Ordered in last 30 days"
          />
          <AdminKpiCard
            title="New customers today"
            value={String(snapshot.newToday)}
            source="DERIVED"
            detail="First seen order today (Karachi)"
          />
          <AdminKpiCard
            title="Repeat customers"
            value={String(snapshot.repeatCustomers)}
            source="DERIVED"
            detail="2+ orders in loaded window"
          />
          <AdminKpiCard
            title="Average order value"
            value={snapshot.averageOrderValue != null ? formatPkr(snapshot.averageOrderValue) : "—"}
            source={snapshot.averageOrderValue != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot.averageOrderValue == null}
            detail="Mean of per-customer average spend"
          />
          <AdminKpiCard
            title="Lifetime value (loaded window)"
            value={snapshot.lifetimeValueAvg != null ? formatPkr(snapshot.lifetimeValueAvg) : "—"}
            source={snapshot.lifetimeValueAvg != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot.lifetimeValueAvg == null}
            detail="Mean spend in loaded order window — not an authoritative CRM LTV"
          />
        </div>
      )}
      <AdminCapabilityNotice
        testId="crm-vip-blocked-deferred"
        summary="VIP / blocked customer status — not available"
        items={[
          "No authoritative VIP flag or blocklist exists on the order-derived CRM model",
          "Do not treat missing VIP or blocked counts as zero business truth",
        ]}
      />
    </section>
  );
}

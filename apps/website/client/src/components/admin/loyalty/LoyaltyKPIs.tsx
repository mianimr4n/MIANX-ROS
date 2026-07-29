import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { LoyaltyKpiSnapshot } from "@/lib/admin-loyalty";
import { formatPkr } from "@/lib/admin-order-format";

function UnavailableLoyaltyKpis() {
  const cards = [
    "Loyalty customers",
    "Active members",
    "Repeat customers",
    "Loyalty revenue",
    "Avg lifetime spend",
    "Points issued",
    "Points redeemed",
    "Reward liability",
    "Redemption rate",
    "Expiring points",
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
            title.startsWith("Points") ||
            title === "Reward liability" ||
            title === "Redemption rate" ||
            title === "Expiring points"
              ? "No loyalty ledger API"
              : "Loyalty order window unavailable — not shown as zero"
          }
        />
      ))}
    </div>
  );
}

export function LoyaltyKPIs({
  snapshot,
  loading,
  windowNote,
}: {
  snapshot: LoyaltyKpiSnapshot | null;
  loading: boolean;
  windowNote: string;
}) {
  return (
    <section aria-label="Loyalty key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="Loyalty"
        title="Program KPIs"
        description={`${windowNote} Points, tiers, rewards, and liability require a loyalty ledger.`}
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : !snapshot ? (
        <UnavailableLoyaltyKpis />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Loyalty customers"
            value={String(snapshot.derivedCustomers)}
            source="DERIVED"
            detail="Unique phones in loaded order window"
          />
          <AdminKpiCard
            title="Active members"
            value={String(snapshot.activeMembers)}
            source="DERIVED"
            detail="Ordered within last 30 days (not membership tier)"
          />
          <AdminKpiCard
            title="Repeat customers"
            value={String(snapshot.repeatCustomers)}
            source="DERIVED"
            detail="2+ orders in loaded window"
          />
          <AdminKpiCard
            title="Loyalty revenue"
            value={formatPkr(snapshot.loyaltyRevenue)}
            source="DERIVED"
            detail="Sum of lifetime spend in window"
          />
          <AdminKpiCard
            title="Avg lifetime spend"
            value={snapshot.averageLifetimeSpend != null ? formatPkr(snapshot.averageLifetimeSpend) : "—"}
            source={snapshot.averageLifetimeSpend != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot.averageLifetimeSpend == null}
            detail="Mean per derived customer"
          />
          <AdminKpiCard
            title="Points issued"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="No loyalty ledger API"
          />
          <AdminKpiCard
            title="Points redeemed"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="No redemption ledger"
          />
          <AdminKpiCard
            title="Reward liability"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="Requires points balance + rewards catalogue"
          />
          <AdminKpiCard
            title="Redemption rate"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="Requires redemption history"
          />
          <AdminKpiCard
            title="Expiring points"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="Requires points expiry policy + ledger"
          />
        </div>
      )}
    </section>
  );
}

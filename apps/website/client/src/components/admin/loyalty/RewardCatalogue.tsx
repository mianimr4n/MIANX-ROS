import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

/** Rewards catalogue remains Coming Soon — points ledger is LIVE separately. */
export function RewardCatalogue() {
  return (
    <AdminSurface aria-labelledby="reward-catalogue-heading">
      <AdminSurfaceHeader title="Reward catalogue" description="Redemption catalogue is not shipped yet." />
      <AdminSurfaceBody>
        <h3 id="reward-catalogue-heading" className="sr-only">
          Reward catalogue
        </h3>
        <AdminSectionTitle
          title="Rewards Catalog — Coming Soon"
          description="Publishable rewards, eligibility rules, and burn-on-checkout remain Coming Soon."
        />
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
          <p className="font-semibold text-[var(--admin-ink)]">No operational rewards to display</p>
          <p className="mt-3 text-xs uppercase tracking-wide">Coming Soon — no sample rewards shown as live data</p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

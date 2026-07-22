import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function RewardCatalogue() {
  return (
    <AdminSurface aria-labelledby="reward-catalogue-heading">
      <AdminSurfaceHeader title="Reward catalogue" description="Persistent rewards require a backend catalogue." />
      <AdminSurfaceBody>
        <h3 id="reward-catalogue-heading" className="sr-only">
          Reward catalogue
        </h3>
        <AdminSectionTitle
          title="Reward Catalogue Foundation"
          description="A persistent rewards catalogue, eligibility rules and redemption service are required before rewards can be published."
        />
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
          <p className="font-semibold text-[var(--admin-ink)]">No operational rewards to display</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Reward name, type, required points, validity, branch scope</li>
            <li>Redemption count and publish/unpublish status</li>
            <li>Server-side eligibility and burn on quote/create path</li>
          </ul>
          <p className="mt-3 text-xs uppercase tracking-wide">Foundation — no sample pizza rewards shown as live data</p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

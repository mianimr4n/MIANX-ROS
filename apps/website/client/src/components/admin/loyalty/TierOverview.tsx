import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

const FUTURE_DEPENDENCIES = [
  "Tier definitions and qualification rules",
  "Evaluation period and upgrade/downgrade policy",
  "Branch scope and benefit mapping",
  "Versioned programme policy",
  "Admin read APIs for tier assignment",
];

export function TierOverview() {
  return (
    <AdminSurface aria-labelledby="tier-overview-heading">
      <AdminSurfaceHeader title="Tier overview" description="Tier management is Foundation until configuration APIs exist." />
      <AdminSurfaceBody>
        <h3 id="tier-overview-heading" className="sr-only">
          Tier overview
        </h3>
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
          <p className="font-semibold text-[var(--admin-ink)]">Tier management · Planned for Phase 2</p>
          <p className="mt-2">
            Bronze / Silver / Gold / Platinum tiers are not configured. Customers are not assigned to tiers without a
            real tier engine and loyalty member records.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Backend dependencies
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {FUTURE_DEPENDENCIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

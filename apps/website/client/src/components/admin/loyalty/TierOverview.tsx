import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

/**
 * Legacy TierOverview placeholder — Admin Loyalty now loads LIVE tier definitions.
 * Kept for any residual imports; prefer AdminLoyalty tiers panel.
 */
export function TierOverview() {
  return (
    <AdminSurface aria-labelledby="tier-overview-heading">
      <AdminSurfaceHeader
        title="Tier overview"
        description="Tier definitions and liability live on Admin → Loyalty."
      />
      <AdminSurfaceBody>
        <h3 id="tier-overview-heading" className="sr-only">
          Tier overview
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          Open{" "}
          <a href="/admin/loyalty" className="font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline">
            Loyalty &amp; Rewards
          </a>{" "}
          for configurable tiers, history, and liability snapshot.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

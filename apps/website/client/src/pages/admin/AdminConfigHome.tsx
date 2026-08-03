import {
  DashboardActionCard,
  DashboardActionGrid,
} from "@/components/admin/dashboard/DashboardActionCard";
import { OpeningReadinessSummary } from "@/components/admin/dashboard/OpeningReadinessSummary";
import { RoleHomeShell } from "@/components/admin/dashboard/RoleHomeShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessAdminSettings,
  canAccessConfigurationHome,
  canManageFloorConfiguration,
  canManageMenu,
  canAccessAdminHr,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { fetchSystemHealth } from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

/**
 * Configuration admin home — readiness gaps + settings/menu/floor/hr links.
 * System health (DB / outbox) is Super Admin only.
 */
export default function AdminConfigHome() {
  const { session, permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = canAccessConfigurationHome(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);

  const branchId = branchIdFilter ?? branchIds[0] ?? null;

  const healthOp = useOperationalData(
    ({ signal, correlationId }) => fetchSystemHealth(token!, { signal, correlationId }),
    [token],
    {
      enabled: Boolean(token) && isSuperAdmin && isApiConfigured && gateReady,
      pollMs: 120_000,
    },
  );

  if (isAuthLoading) {
    return (
      <AdminShell title="Configuration home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) {
    return <AdminShell title="Configuration home">{null}</AdminShell>;
  }

  const warnings = healthOp.data?.configurationWarnings ?? [];

  return (
    <RoleHomeShell
      title="Configuration home"
      subtitle={`${primaryRoleLabel(roles, isSuperAdmin)} · ${profile?.fullName ?? "Staff"} · ${branchLabel}`}
      state={isSuperAdmin ? healthOp.state : "LIVE"}
      error={isSuperAdmin ? healthOp.error : null}
      lastSuccessAt={isSuperAdmin ? healthOp.lastSuccessAt : null}
      onRetry={isSuperAdmin ? healthOp.retry : undefined}
      correlationId={isSuperAdmin ? healthOp.correlationId : null}
      showTechnicalDetail={isSuperAdmin}
      primaryAction={
        canAccessAdminSettings(principal) ? (
          <DashboardActionCard
            title="Continue setup"
            description="Branch & system settings"
            href="/admin/settings"
            primary
          />
        ) : null
      }
      secondaryActions={
        <>
          {canManageMenu(principal) ? (
            <DashboardActionCard title="Update menu" description="Items, prices, availability" href="/admin/menu" />
          ) : null}
          {canManageFloorConfiguration(principal) ? (
            <DashboardActionCard title="Edit floor plan" description="Floors, areas, tables" href="/admin/floor-plan" />
          ) : null}
          {canAccessAdminHr(principal) ? (
            <DashboardActionCard title="Manage staff" description="People and roles" href="/admin/hr" />
          ) : null}
        </>
      }
    >
      <OpeningReadinessSummary
        token={token}
        branchId={branchId}
        enabled={gateReady && Boolean(branchId)}
        showTechnicalDetail={isSuperAdmin}
      />

      {isSuperAdmin && healthOp.data ? (
        <div className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <p className="text-sm font-semibold text-[var(--admin-ink)]">System health</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            API {healthOp.data.api.status} · DB {healthOp.data.database.status} · email mode{" "}
            {healthOp.data.notifications.emailMode}
          </p>
          {warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-amber-950">
              {warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-800">No configuration warnings from health probe.</p>
          )}
        </div>
      ) : null}

      <DashboardActionGrid>
        <DashboardActionCard
          title="Branches"
          href="/admin/branches"
          description="Branch directory"
          disabled
          disabledReason="Coming in a later release"
        />
      </DashboardActionGrid>
    </RoleHomeShell>
  );
}

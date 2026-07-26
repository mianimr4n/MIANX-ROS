import {
  DashboardActionCard,
  DashboardActionGrid,
} from "@/components/admin/dashboard/DashboardActionCard";
import { RoleHomeShell } from "@/components/admin/dashboard/RoleHomeShell";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import {
  canAccessAdmin,
  filterVisibleAdminNav,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { AdminShell } from "@/pages/admin/AdminShell";

/**
 * General staff home — identity + permitted entry points only.
 * No fabricated KPIs.
 */
export default function AdminStaffHome() {
  const { permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { label: branchLabel } = useAdminBranch();
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = canAccessAdmin(principal);
  const { isAuthLoading } = useAdminAccessGate(allowed);

  if (isAuthLoading) {
    return (
      <AdminShell title="Staff home">
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) return null;

  const entries = filterVisibleAdminNav(principal).filter((item) => item.available);

  return (
    <RoleHomeShell
      title="Staff home"
      subtitle={`${profile?.fullName ?? "Staff"} · ${primaryRoleLabel(roles, isSuperAdmin)} · ${branchLabel}`}
      state="LIVE"
    >
      <div className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Account</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--admin-muted)]">Name</dt>
            <dd className="text-sm font-semibold text-[var(--admin-ink)]">{profile?.fullName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--admin-muted)]">Role</dt>
            <dd className="text-sm font-semibold text-[var(--admin-ink)]">
              {primaryRoleLabel(roles, isSuperAdmin)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--admin-muted)]">Branch</dt>
            <dd className="text-sm font-semibold text-[var(--admin-ink)]">{branchLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--admin-muted)]">Roles (codes)</dt>
            <dd className="text-sm font-semibold text-[var(--admin-ink)]">
              {roles.length ? roles.join(", ") : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[var(--admin-muted)]">
          This home shows only modules your permissions unlock. Operational KPI boards are not shown
          here.
        </p>
      </div>

      <DashboardActionGrid>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)] sm:col-span-2 lg:col-span-3">
            No permitted admin modules for this account. Ask an Owner to assign roles or permissions.
          </p>
        ) : (
          entries.map((item) => (
            <DashboardActionCard key={item.key} title={item.label} href={item.href} description={item.group} />
          ))
        )}
      </DashboardActionGrid>
    </RoleHomeShell>
  );
}

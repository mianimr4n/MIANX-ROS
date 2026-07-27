import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
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
  canAccessAdminOrdersApi,
  canManageReservations,
  filterVisibleAdminNav,
  primaryRoleLabel,
} from "@/lib/admin-access";
import { AdminShell } from "@/pages/admin/AdminShell";

/**
 * Staff / support home — identity + permitted entry points only.
 * Uses the canonical `customer-support` role when present; never invents general-staff.
 * No fabricated KPIs.
 */
export default function AdminStaffHome() {
  const { permissions, isSuperAdmin, roles, profile, branchIds } = useAuth();
  const { label: branchLabel } = useAdminBranch();
  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = canAccessAdmin(principal);
  const { isAuthLoading } = useAdminAccessGate(allowed);
  const isSupportAgent = roles.includes("customer-support");

  if (isAuthLoading) {
    return (
      <AdminShell title={isSupportAgent ? "Support home" : "Staff home"}>
        <p className="text-sm text-[var(--admin-muted)]">Loading session…</p>
      </AdminShell>
    );
  }
  if (!allowed) return null;

  // Rank day-to-day work surfaces first: operational modules before overview/management entries.
  const groupRank = (group: string) => {
    const rank = ["Operations", "Commerce", "Customers", "Overview", "Management", "Intelligence", "System"].indexOf(group);
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
  };
  const supportPriority = (key: string) => {
    const rank = ["orders", "customers", "reservations", "waitlist", "floor-console"].indexOf(key);
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
  };
  const entries = filterVisibleAdminNav(principal)
    .filter((item) => item.available)
    .sort((a, b) => {
      if (isSupportAgent) {
        const bySupport = supportPriority(a.key) - supportPriority(b.key);
        if (bySupport !== 0) return bySupport;
      }
      return groupRank(a.group) - groupRank(b.group);
    });
  const [firstEntry, ...restEntries] = entries;
  const homeTitle = isSupportAgent ? "Support home" : "Staff home";
  const canLookupOrders = canAccessAdminOrdersApi(principal);
  const canOpenReservations = canManageReservations(principal);

  return (
    <RoleHomeShell
      title={homeTitle}
      subtitle={`${profile?.fullName ?? "Staff"} · ${primaryRoleLabel(roles, isSuperAdmin)} · ${branchLabel}`}
      state="LIVE"
      primaryAction={
        firstEntry ? (
          <DashboardActionCard
            title={
              isSupportAgent && firstEntry.key === "orders"
                ? "Look up an order"
                : `Open ${firstEntry.label}`
            }
            description={
              isSupportAgent && firstEntry.key === "orders"
                ? "Find guest orders by phone or number"
                : firstEntry.group
            }
            href={firstEntry.href}
            primary
          />
        ) : null
      }
      secondaryActions={
        <>
          {isSupportAgent && canLookupOrders && firstEntry?.key !== "customers" ? (
            <DashboardActionCard title="Open CRM" description="Guest history" href="/admin/crm" />
          ) : null}
          {isSupportAgent && canOpenReservations ? (
            <DashboardActionCard
              title="Reservations"
              description="Bookings and arrivals"
              href="/admin/reservations"
            />
          ) : null}
          {restEntries.slice(0, isSupportAgent ? 2 : 3).map((item) => (
            <DashboardActionCard
              key={item.key}
              title={`Open ${item.label}`}
              description={item.group}
              href={item.href}
            />
          ))}
        </>
      }
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
        </dl>
        <p className="mt-4 text-sm text-[var(--admin-muted)]">
          {isSupportAgent
            ? "Support work uses order lookup, guest history, and reservations when your account has those permissions. There are no invented performance numbers on this page."
            : "You only see the areas your account can open. There are no performance numbers on this page."}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">
          Your account has no work areas yet. Ask a Super Admin to assign your role or permissions.
        </p>
      ) : restEntries.length > 3 ? (
        <>
          <AdminSectionTitle
            eyebrow="More"
            title="Other areas you can open"
            description="Everything else your account has access to."
          />
          <DashboardActionGrid>
            {restEntries.slice(3).map((item) => (
              <DashboardActionCard
                key={item.key}
                title={`Open ${item.label}`}
                href={item.href}
                description={item.group}
              />
            ))}
          </DashboardActionGrid>
        </>
      ) : null}
    </RoleHomeShell>
  );
}

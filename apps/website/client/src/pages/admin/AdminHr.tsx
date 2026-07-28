import { useCallback, useEffect, useMemo, useState } from "react";

import { EmployeeDirectory } from "@/components/admin/hr/EmployeeDirectory";
import { EmployeeDrawer } from "@/components/admin/hr/EmployeeDrawer";
import { HRHeader } from "@/components/admin/hr/HRHeader";
import { HRKPIs } from "@/components/admin/hr/HRKPIs";
import { HRStatusBanner } from "@/components/admin/hr/HRStatusBanner";
import {
  HRFoundationPanel,
  HRReadinessSections,
} from "@/components/admin/hr/HRFoundationPanel";
import { DepartmentManager, OrganizationTree } from "@/components/admin/hr/OrganizationTree";
import { RolesPermissionPanel } from "@/components/admin/hr/RolesPermissionPanel";
import {
  AttendancePanel,
  EmployeeDocuments,
  HRAnalytics,
  LeaveManagement,
  PayrollOverview,
  PerformancePanel,
  ShiftPlanner,
  TrainingCenter,
} from "@/components/admin/hr/WorkforcePanels";
import { WorkforceInsights } from "@/components/admin/hr/WorkforceInsights";
import { StaffAssignmentsPanel } from "@/components/admin/hr/StaffAssignmentsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminHr, primaryRoleLabel } from "@/lib/admin-access";
import { listAdminStaffInvites, type AdminStaffInvite } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  buildWorkforceInsights,
  integrationChecks,
  readinessGroups,
  summarizeInvites,
} from "@/lib/admin-hr";
import { AdminShell } from "./AdminShell";

export default function AdminHr() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel } = useAdminBranch();

  const allowed = canAccessAdminHr({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);
  const hasStaffRead =
    isSuperAdmin || permissions.includes("staff.read") || permissions.includes("staff.manage");

  const [invites, setInvites] = useState<AdminStaffInvite[] | null>(null);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<AdminStaffInvite | null>(null);

  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);
  const inviteSummary = useMemo(() => summarizeInvites(invites), [invites]);
  const insights = useMemo(
    () =>
      buildWorkforceInsights({
        branchLabel,
        inviteSummary,
        isSuperAdmin,
        hasStaffRead,
      }),
    [branchLabel, hasStaffRead, inviteSummary, isSuperAdmin],
  );

  const loadInvites = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !isSuperAdmin) {
      setInvites(null);
      setInvitesError(isSuperAdmin ? null : "Staff invites require super-admin backend access.");
      return;
    }
    setInvitesLoading(true);
    try {
      const rows = await listAdminStaffInvites(token);
      setInvites(rows);
      setInvitesError(null);
    } catch (err) {
      setInvites(null);
      setInvitesError(err instanceof ApiRequestError ? err.message : "Failed to load staff invites");
    } finally {
      setInvitesLoading(false);
    }
  }, [isSuperAdmin, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void loadInvites();
  }, [gateReady, loadInvites]);

  const onRefresh = () => {
    void loadInvites();
  };

  return (
    <AdminShell title="HR & Workforce Management">
      <HRHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <HRStatusBanner />

      <HRKPIs inviteSummary={inviteSummary} />

      <StaffAssignmentsPanel />

      <OrganizationTree />

      <DepartmentManager />

      <EmployeeDirectory
        invites={invites}
        invitesLoading={invitesLoading}
        invitesError={invitesError}
        canLoadInvites={isSuperAdmin}
        onSelectInvite={setSelectedInvite}
        selectedInviteId={selectedInvite?.id ?? null}
      />

      <EmployeeDrawer invite={selectedInvite} onClose={() => setSelectedInvite(null)} />

      <RolesPermissionPanel currentRoles={roles} currentPermissions={permissions} />

      <ShiftPlanner />

      <div className="grid gap-4 lg:grid-cols-2">
        <AttendancePanel />
        <LeaveManagement />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PayrollOverview />
        <PerformancePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrainingCenter />
        <EmployeeDocuments />
      </div>

      <HRAnalytics />

      <HRFoundationPanel checks={checks} />

      <HRReadinessSections groups={groups} />

      <WorkforceInsights items={insights} />
    </AdminShell>
  );
}

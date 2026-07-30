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
import {
  createHrEmployee,
  listAdminStaffInvites,
  listHrEmployees,
  type AdminStaffInvite,
  type HrEmployee,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  buildWorkforceInsights,
  integrationChecks,
  readinessGroups,
  summarizeEmployees,
  summarizeInvites,
} from "@/lib/admin-hr";
import { AdminShell } from "./AdminShell";

export default function AdminHr() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel, branchIdFilter } = useAdminBranch();

  const allowed = canAccessAdminHr({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);
  const hasStaffRead =
    isSuperAdmin || permissions.includes("staff.read") || permissions.includes("staff.manage");
  const canManageHr =
    isSuperAdmin || permissions.includes("staff.manage") || permissions.includes("admin.access");

  const [invites, setInvites] = useState<AdminStaffInvite[] | null>(null);
  const [employees, setEmployees] = useState<HrEmployee[] | null>(null);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<HrEmployee | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const checks = useMemo(() => integrationChecks(), []);
  const groups = useMemo(() => readinessGroups(), []);
  const inviteSummary = useMemo(() => summarizeInvites(invites), [invites]);
  const employeeSummary = useMemo(() => summarizeEmployees(employees), [employees]);
  const insights = useMemo(
    () =>
      buildWorkforceInsights({
        branchLabel,
        inviteSummary,
        employeeSummary,
        isSuperAdmin,
        hasStaffRead,
        canManageHr,
      }),
    [branchLabel, canManageHr, employeeSummary, hasStaffRead, inviteSummary, isSuperAdmin],
  );

  const loadEmployees = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canManageHr) {
      setEmployees(null);
      setEmployeesError(canManageHr ? null : "Employee directory requires staff.manage or admin.access.");
      return;
    }
    setEmployeesLoading(true);
    try {
      const rows = await listHrEmployees(
        token,
        branchIdFilter ? { branchId: branchIdFilter } : undefined,
      );
      setEmployees(rows);
      setEmployeesError(null);
    } catch (err) {
      setEmployees(null);
      setEmployeesError(err instanceof ApiRequestError ? err.message : "Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  }, [branchIdFilter, canManageHr, session?.access_token]);

  const loadInvites = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !isSuperAdmin) {
      setInvites(null);
      return;
    }
    try {
      const rows = await listAdminStaffInvites(token);
      setInvites(rows);
    } catch {
      setInvites(null);
    }
  }, [isSuperAdmin, session?.access_token]);

  useEffect(() => {
    if (!gateReady) return;
    void loadEmployees();
    void loadInvites();
  }, [gateReady, loadEmployees, loadInvites]);

  const onRefresh = () => {
    void loadEmployees();
    void loadInvites();
  };

  const onAddEmployee = async (input: {
    branchId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  }) => {
    const token = session?.access_token;
    if (!token) {
      setAddError("Sign in required.");
      return false;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      await createHrEmployee(token, {
        branchId: input.branchId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
      });
      await loadEmployees();
      return true;
    } catch (err) {
      setAddError(err instanceof ApiRequestError ? err.message : "Failed to add employee");
      return false;
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <AdminShell title="HR & Workforce Management">
      <HRHeader branchLabel={branchLabel} roleLabel={roleLabel} onRefresh={onRefresh} />

      <HRStatusBanner />

      <HRKPIs inviteSummary={inviteSummary} employeeSummary={employeeSummary} />

      <StaffAssignmentsPanel />

      <OrganizationTree />

      <DepartmentManager />

      <EmployeeDirectory
        employees={employees}
        employeesLoading={employeesLoading}
        employeesError={employeesError}
        canManage={canManageHr}
        canLoad={canManageHr}
        selectedEmployeeId={selectedEmployee?.id ?? null}
        onSelectEmployee={setSelectedEmployee}
        onAddEmployee={onAddEmployee}
        addError={addError}
        addBusy={addBusy}
        defaultBranchId={branchIdFilter}
      />

      <EmployeeDrawer employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />

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

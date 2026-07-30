/** HR & Workforce helpers — no invented employees, attendance, or payroll. */

export type HrIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type WorkforceInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "derived" | "foundation";
};

export type HrReadinessGroup = {
  id: string;
  title: string;
  unavailable: string;
  why: string;
  entities: string[];
  apis: string[];
  permission: string;
  related: string;
};

/** UI-visible application role codes — not the full DB roles catalog (9 rows). */
export const SEEDED_ROLES: Array<{ code: string; name: string; description: string }> = [
  { code: "super-admin", name: "Super Admin", description: "Full system access across Telepizza operations." },
  { code: "branch-manager", name: "Branch Manager", description: "Branch operations, staff, and order oversight." },
  { code: "kitchen", name: "Kitchen Staff", description: "Kitchen order preparation workflows." },
  { code: "cashier", name: "Cashier", description: "POS and payment workflows." },
  { code: "rider", name: "Rider", description: "Delivery assignment and completion workflows." },
  { code: "customer-support", name: "Customer Support", description: "Customer support and order resolution." },
  { code: "host", name: "Host", description: "Front-of-house hosting and floor coordination." },
  { code: "waiter", name: "Waiter", description: "Table service and dine-in order support." },
];

/**
 * UI reference permission codes shown in Settings/HR panels.
 * This is a UI_VISIBLE subset — not the complete seeded role_permissions catalog (76 rows).
 */
export const SEEDED_PERMISSIONS: Array<{ code: string; module: string; description: string }> = [
  { code: "menu.read", module: "menu", description: "Read menu catalog and variants." },
  { code: "menu.write", module: "menu", description: "Manage menu categories, items, and variants." },
  { code: "branch.read", module: "branch", description: "Read branches and routing data." },
  { code: "branch.manage", module: "branch", description: "Manage branch settings and operations." },
  { code: "order.read", module: "order", description: "Read orders and tracking events." },
  { code: "order.create", module: "order", description: "Create new customer orders." },
  { code: "order.manage", module: "order", description: "Manage order state changes." },
  { code: "delivery.read", module: "delivery", description: "Read delivery assignments and status." },
  { code: "delivery.assign", module: "delivery", description: "Assign riders to deliveries." },
  { code: "delivery.update", module: "delivery", description: "Update rider delivery status." },
  { code: "payment.read", module: "payment", description: "Read payment state and reconciliation data." },
  { code: "payment.manage", module: "payment", description: "Manage payment captures, updates, and refunds." },
  { code: "staff.read", module: "staff", description: "Read staff and shift data." },
  { code: "staff.manage", module: "staff", description: "Manage staff, roles, and assignments." },
  { code: "staff.create", module: "staff", description: "Create, send, resend, and revoke staff invitations." },
  { code: "staff.assign_role", module: "staff", description: "Assign roles on staff invitations and staffing." },
  { code: "admin.access", module: "admin", description: "Access Telepizza admin controls." },
];

export type StaffInviteSummary = {
  total: number;
  pending: number;
  accepted: number;
  revoked: number;
};

export type EmployeeSummary = {
  total: number;
  active: number;
};

export function summarizeInvites(
  invites: Array<{ status: string }> | null,
): StaffInviteSummary | null {
  if (!invites) return null;
  return {
    total: invites.length,
    pending: invites.filter((i) => i.status === "pending" || i.status === "draft").length,
    accepted: invites.filter((i) => i.status === "accepted").length,
    revoked: invites.filter((i) => i.status === "revoked" || i.status === "expired").length,
  };
}

export function summarizeEmployees(
  employees: Array<{ status: string }> | null,
): EmployeeSummary | null {
  if (!employees) return null;
  return {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
  };
}

export function integrationChecks(): HrIntegrationCheck[] {
  return [
    {
      id: "hr-employees",
      label: "Employee directory API",
      status: "present",
      note: "GET/POST /admin/hr/employees — hr_employees table, staff.manage or admin.access.",
    },
    {
      id: "staff-table",
      label: "Auth staff table",
      status: "partial",
      note: "public.staff remains for auth provisioning — directory uses hr_employees.",
    },
    {
      id: "staff-invites",
      label: "Staff invitation API",
      status: "partial",
      note: "GET/POST /admin/staff/invites — super-admin route gate in backend.",
    },
    {
      id: "rbac",
      label: "Roles & permissions seed",
      status: "present",
      note: "roles, permissions, role_permissions seeded — UI shows verified codes only.",
    },
    {
      id: "departments",
      label: "Department hierarchy",
      status: "missing",
      note: "staff.department is a text field — no departments table or org tree API.",
    },
    {
      id: "shifts",
      label: "Shift scheduling / roster",
      status: "missing",
      note: "staff.shift_name exists — no shift planner or weekly roster API.",
    },
    {
      id: "attendance",
      label: "Attendance / timesheets",
      status: "missing",
      note: "No clock-in, biometric, or attendance tables.",
    },
    {
      id: "leave",
      label: "Leave management",
      status: "missing",
      note: "No leave types, balances, or approval workflow.",
    },
    {
      id: "payroll",
      label: "Payroll engine",
      status: "missing",
      note: "No salary structures, payslips, or payroll runs.",
    },
    {
      id: "performance",
      label: "Performance reviews",
      status: "missing",
      note: "No goals, reviews, or warnings backend.",
    },
    {
      id: "training",
      label: "Training & compliance",
      status: "missing",
      note: "No courses, certificates, or onboarding tracks.",
    },
    {
      id: "documents",
      label: "Employee documents",
      status: "missing",
      note: "No document storage or HR file API.",
    },
    {
      id: "hr-analytics",
      label: "HR analytics",
      status: "missing",
      note: "No headcount, turnover, or attendance trend APIs.",
    },
  ];
}

export function readinessGroups(): HrReadinessGroup[] {
  return [
    {
      id: "directory",
      title: "Employee directory",
      unavailable: "Profile edit / deactivate APIs",
      why: "List and create are live via hr_employees; update/deactivate not in this slice.",
      entities: ["hr_employees"],
      apis: ["GET /api/v1/admin/hr/employees", "POST /api/v1/admin/hr/employees"],
      permission: "staff.manage or admin.access",
      related: "Staff invite acceptance still provisions users + roles separately.",
    },
    {
      id: "attendance",
      title: "Time & attendance",
      unavailable: "Clock in/out, timesheets, late/absent rules",
      why: "Cannot record or simulate attendance without immutable time events.",
      entities: ["attendance_events", "timesheets", "shift_assignments"],
      apis: ["POST /api/v1/admin/hr/attendance/clock", "GET /api/v1/admin/hr/attendance"],
      permission: "staff.manage (proposed hr.attendance)",
      related: "POS login / mobile clock integrations.",
    },
    {
      id: "leave",
      title: "Leave management",
      unavailable: "Balances, requests, approvals",
      why: "Leave policies and accruals require payroll-grade backend.",
      entities: ["leave_types", "leave_balances", "leave_requests"],
      apis: ["GET /api/v1/admin/hr/leave", "POST /api/v1/admin/hr/leave/request"],
      permission: "staff.manage (proposed hr.leave)",
      related: "Manager approval workflows.",
    },
    {
      id: "payroll",
      title: "Payroll integration",
      unavailable: "Salary, allowances, deductions, payslips",
      why: "Finance module is Foundation — payroll must not calculate salaries in frontend.",
      entities: ["payroll_runs", "payslips", "salary_structures"],
      apis: ["GET /api/v1/admin/hr/payroll/runs"],
      permission: "staff.manage + payment.read (proposed)",
      related: "Finance & Accounting GL postings.",
    },
  ];
}

export function buildWorkforceInsights(input: {
  branchLabel: string;
  inviteSummary: StaffInviteSummary | null;
  employeeSummary: EmployeeSummary | null;
  isSuperAdmin: boolean;
  hasStaffRead: boolean;
  canManageHr: boolean;
}): WorkforceInsightItem[] {
  const items: WorkforceInsightItem[] = [];

  if (input.canManageHr && input.employeeSummary) {
    items.push({
      id: "employees-live",
      title: `${input.employeeSummary.total} employee(s) in directory (${input.employeeSummary.active} active)`,
      detail: `Live count from GET /admin/hr/employees for ${input.branchLabel}.`,
      source: "live",
    });
  } else if (!input.canManageHr) {
    items.push({
      id: "employees-gate",
      title: "Employee directory requires staff.manage or admin.access",
      detail: "Permission gate for GET /admin/hr/employees.",
      source: "derived",
    });
  }

  if (input.isSuperAdmin && input.inviteSummary) {
    items.push({
      id: "invites-pending",
      title: `${input.inviteSummary.pending} pending staff invitation(s)`,
      detail: "Live count from GET /admin/staff/invites — super-admin scope only.",
      source: "live",
    });
  } else if (input.hasStaffRead) {
    items.push({
      id: "invites-gate",
      title: "Staff invite list requires super-admin backend gate",
      detail: "staff.read is seeded but invite routes use requireSuperAdmin in API.",
      source: "derived",
    });
  }

  items.push({
    id: "no-attendance",
    title: "Attendance module unavailable",
    detail: `No clock-in/out or timesheet backend for ${input.branchLabel}.`,
    source: "foundation",
  });

  items.push({
    id: "no-documents",
    title: "Missing employee documents workflow",
    detail: "CNIC, contracts, and certificates require document storage API.",
    source: "foundation",
  });

  items.push({
    id: "no-training",
    title: "Training not configured",
    detail: "Compliance and onboarding courses require training backend.",
    source: "foundation",
  });

  items.push({
    id: "no-payroll",
    title: "Payroll integration unavailable",
    detail: "Salary summaries and payslips require payroll engine — not frontend calculation.",
    source: "foundation",
  });

  return items.slice(0, 6);
}

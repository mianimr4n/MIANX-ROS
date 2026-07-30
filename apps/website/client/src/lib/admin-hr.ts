/** HR & Workforce helpers — no invented employees, attendance, or payroll. */

import type { HrAttendance, HrLeaveRequest } from "@/lib/admin-api";

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
  { code: "hr.manage", module: "hr", description: "Manage HR attendance, leave, and employee documents." },
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

export type AttendanceSummary = {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  total: number;
};

export type LeaveSummary = {
  pending: number;
  approvedActive: number;
  total: number;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function summarizeAttendance(rows: HrAttendance[] | null): AttendanceSummary | null {
  if (!rows) return null;
  const today = todayIsoDate();
  const todays = rows.filter((r) => {
    const day = (r.checkInTime ?? r.createdAt).slice(0, 10);
    return day === today;
  });
  return {
    total: rows.length,
    todayPresent: todays.filter((r) => r.status === "PRESENT" || r.status === "LATE").length,
    todayAbsent: todays.filter((r) => r.status === "ABSENT").length,
    todayLate: todays.filter((r) => r.status === "LATE").length,
  };
}

export function summarizeLeaves(rows: HrLeaveRequest[] | null): LeaveSummary | null {
  if (!rows) return null;
  const today = todayIsoDate();
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === "PENDING").length,
    approvedActive: rows.filter(
      (r) => r.status === "APPROVED" && r.startDate <= today && r.endDate >= today,
    ).length,
  };
}

export function integrationChecks(): HrIntegrationCheck[] {
  return [
    {
      id: "hr-employees",
      label: "Employee directory API",
      status: "present",
      note: "GET/POST /admin/hr/employees — hr_employees table.",
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
      note: "roles, permissions, role_permissions seeded — includes hr.manage.",
    },
    {
      id: "attendance",
      label: "Attendance / timesheets",
      status: "present",
      note: "hr_attendance + GET/POST /admin/hr/attendance (check-in/out).",
    },
    {
      id: "leave",
      label: "Leave management",
      status: "present",
      note: "hr_leave_requests + GET/POST/PATCH /admin/hr/leaves.",
    },
    {
      id: "documents",
      label: "Employee documents",
      status: "present",
      note: "hr_employee_documents + POST /admin/hr/employees/:id/documents + GET /admin/hr/documents.",
    },
    {
      id: "departments",
      label: "Department hierarchy",
      status: "missing",
      note: "Planned for Phase 2 — staff.department is text only.",
    },
    {
      id: "shifts",
      label: "Shift scheduling / roster",
      status: "missing",
      note: "Planned for Phase 2 — no shift planner API.",
    },
    {
      id: "payroll",
      label: "Payroll engine",
      status: "missing",
      note: "Planned for Phase 2 — no salary structures or payroll runs.",
    },
    {
      id: "performance",
      label: "Performance reviews",
      status: "missing",
      note: "Planned for Phase 2 — no goals/reviews backend.",
    },
    {
      id: "training",
      label: "Training & compliance",
      status: "missing",
      note: "Planned for Phase 2 — no courses or certificates API.",
    },
    {
      id: "hr-analytics",
      label: "HR analytics",
      status: "missing",
      note: "Planned for Phase 2 — trend APIs beyond raw attendance/leave lists.",
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
      permission: "hr.manage, staff.manage, or admin.access",
      related: "Staff invite acceptance still provisions users + roles separately.",
    },
    {
      id: "attendance",
      title: "Time & attendance",
      unavailable: "— LIVE",
      why: "Check-in/out records are stored in hr_attendance with PRESENT|ABSENT|LATE|LEAVE.",
      entities: ["hr_attendance"],
      apis: ["GET /api/v1/admin/hr/attendance", "POST /api/v1/admin/hr/attendance"],
      permission: "hr.manage, staff.manage, or admin.access",
      related: "Biometric / POS clock integrations Planned for Phase 2.",
    },
    {
      id: "leave",
      title: "Leave management",
      unavailable: "— LIVE (balances Planned for Phase 2)",
      why: "Leave requests support CASUAL|SICK|ANNUAL with PENDING|APPROVED|REJECTED workflow.",
      entities: ["hr_leave_requests"],
      apis: [
        "GET /api/v1/admin/hr/leaves",
        "POST /api/v1/admin/hr/leaves",
        "PATCH /api/v1/admin/hr/leaves/:id",
      ],
      permission: "hr.manage, staff.manage, or admin.access",
      related: "Accrual balances Planned for Phase 2.",
    },
    {
      id: "documents",
      title: "Employee documents",
      unavailable: "— LIVE (URL links)",
      why: "Document metadata stores CNIC|CONTRACT|CERTIFICATE file URLs per employee.",
      entities: ["hr_employee_documents"],
      apis: [
        "GET /api/v1/admin/hr/documents",
        "POST /api/v1/admin/hr/employees/:id/documents",
      ],
      permission: "hr.manage, staff.manage, or admin.access",
      related: "Binary object storage buckets Planned for Phase 2.",
    },
    {
      id: "payroll",
      title: "Payroll integration",
      unavailable: "Planned for Phase 2",
      why: "Salary, allowances, deductions, and payslips must not be calculated in the frontend.",
      entities: ["payroll_runs", "payslips", "salary_structures"],
      apis: ["GET /api/v1/admin/hr/payroll/runs (Planned for Phase 2)"],
      permission: "hr.manage + payment.read (proposed)",
      related: "Finance & Accounting GL postings.",
    },
  ];
}

export function buildWorkforceInsights(input: {
  branchLabel: string;
  inviteSummary: StaffInviteSummary | null;
  employeeSummary: EmployeeSummary | null;
  attendanceSummary: AttendanceSummary | null;
  leaveSummary: LeaveSummary | null;
  documentCount: number | null;
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
      title: "Employee directory requires hr.manage, staff.manage, or admin.access",
      detail: "Permission gate for GET /admin/hr/employees.",
      source: "derived",
    });
  }

  if (input.attendanceSummary) {
    items.push({
      id: "attendance-live",
      title: `${input.attendanceSummary.todayPresent} present/late today · ${input.attendanceSummary.todayAbsent} absent`,
      detail: "Live from GET /admin/hr/attendance.",
      source: "live",
    });
  }

  if (input.leaveSummary) {
    items.push({
      id: "leave-live",
      title: `${input.leaveSummary.pending} pending leave · ${input.leaveSummary.approvedActive} on leave today`,
      detail: "Live from GET /admin/hr/leaves.",
      source: "live",
    });
  }

  if (input.documentCount != null) {
    items.push({
      id: "documents-live",
      title: `${input.documentCount} employee document link(s) on file`,
      detail: "Live from GET /admin/hr/documents.",
      source: "live",
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
    id: "no-payroll",
    title: "Payroll integration Planned for Phase 2",
    detail: "Salary summaries and payslips require payroll engine — not frontend calculation.",
    source: "foundation",
  });

  return items.slice(0, 6);
}

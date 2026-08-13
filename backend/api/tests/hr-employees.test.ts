import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  HrEmployeeRecord,
  HrEmployeesService,
} from "../src/services/hr/employees.js";
import type { HrWorkforceService } from "../src/services/hr/workforce.js";
import type { HrSchedulingService } from "../src/services/hr/scheduling.js";
import type { HrPayrollService } from "../src/services/hr/payroll.js";
import { shiftDurationMinutes } from "../src/services/hr/scheduling.js";
import { hoursBetween } from "../src/services/hr/workforce.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

function mockUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: "user-admin",
    authUserId: "auth-admin",
    email: "admin@example.com",
    userType: "staff",
    status: "active",
    roles: ["branch-manager"],
    permissions: ["staff.manage"],
    branchIds: ["branch-1"],
    isSuperAdmin: false,
    ...overrides,
  };
}

function authRepo(p: AuthPrincipal): AuthPrincipalRepository {
  return {
    async resolvePrincipal() {
      return p;
    },
    async getMe() {
      throw new Error("unused");
    },
  };
}

function verifier(authUserId: string, email: string): AuthTokenVerifier {
  return {
    async getUser() {
      return { user: mockUser(authUserId, email) };
    },
  };
}

const employee: HrEmployeeRecord = {
  id: "emp-1",
  branchId: "branch-1",
  branchCode: "royal-orchard",
  branchName: "Royal Orchard",
  employeeNumber: "E-001",
  fullName: "Ali Khan",
  email: "ali@example.com",
  phone: "03001234567",
  role: "cashier",
  status: "active",
  employmentType: "full_time",
  emergencyContactName: null,
  emergencyContactPhone: null,
  hiredAt: "2026-01-15",
  deactivationReason: null,
  deactivatedBy: null,
  deactivatedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const leaveExtras = {
  rejectionReason: null as string | null,
  decidedBy: null as string | null,
  decidedAt: null as string | null,
  leaveBalanceConfigured: false as const,
  leaveBalanceMessage: "Leave balance is not configured.",
  overlappingPublishedShifts: 0,
};

const hrEmployees: HrEmployeesService = {
  async listEmployees() {
    return [employee];
  },
  async getEmployee() {
    return employee;
  },
  async createEmployee(_scope, _actor, input) {
    return {
      ...employee,
      id: "emp-new",
      branchId: input.branchId,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      role: input.role,
      status: input.status ?? "active",
      hiredAt: input.hiredAt ?? null,
      employeeNumber: input.employeeNumber ?? null,
      employmentType: input.employmentType ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
    };
  },
  async patchEmployee(_scope, _actor, employeeId, input) {
    return {
      ...employee,
      id: employeeId,
      fullName: input.fullName ?? employee.fullName,
      role: input.role ?? employee.role,
      phone: input.phone !== undefined ? input.phone : employee.phone,
    };
  },
  async deactivateEmployee(_scope, _actor, employeeId, input) {
    return {
      ...employee,
      id: employeeId,
      status: input.status ?? "inactive",
      deactivationReason: input.reason,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: "user-admin",
    };
  },
  async reactivateEmployee(_scope, _actor, employeeId) {
    return {
      ...employee,
      id: employeeId,
      status: "active",
      deactivationReason: null,
      deactivatedAt: null,
      deactivatedBy: null,
    };
  },
};

const hrWorkforce: HrWorkforceService = {
  async listAttendance() {
    return [];
  },
  async createAttendance(_scope, input) {
    return {
      id: "att-1",
      employeeId: input.employeeId,
      employeeName: "Ali Khan",
      branchId: input.branchId,
      branchCode: "royal-orchard",
      branchName: "Royal Orchard",
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      status: input.status ?? "PRESENT",
      scheduledShiftId: null,
      isUnscheduled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async listLeaves() {
    return [];
  },
  async createLeave(_scope, _actor, input) {
    return {
      id: "leave-1",
      employeeId: input.employeeId,
      employeeName: "Ali Khan",
      branchId: input.branchId,
      branchCode: "royal-orchard",
      branchName: "Royal Orchard",
      startDate: input.startDate,
      endDate: input.endDate,
      leaveType: input.leaveType,
      status: "PENDING",
      reason: input.reason ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...leaveExtras,
    };
  },
  async decideLeave(_scope, _actor, leaveId, input) {
    return {
      id: leaveId,
      employeeId: "emp-1",
      employeeName: "Ali Khan",
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      branchCode: "royal-orchard",
      branchName: "Royal Orchard",
      startDate: "2026-07-30",
      endDate: "2026-07-31",
      leaveType: "CASUAL",
      status: input.status,
      reason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...leaveExtras,
      rejectionReason: input.rejectionReason ?? null,
      decidedBy: "user-admin",
      decidedAt: new Date().toISOString(),
    };
  },
  async cancelLeave(_scope, _actor, leaveId) {
    return {
      id: leaveId,
      employeeId: "emp-1",
      employeeName: "Ali Khan",
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      branchCode: "royal-orchard",
      branchName: "Royal Orchard",
      startDate: "2026-07-30",
      endDate: "2026-07-31",
      leaveType: "CASUAL",
      status: "CANCELLED",
      reason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...leaveExtras,
    };
  },
  async listDocuments() {
    return [];
  },
  async createDocument(_scope, employeeId, input) {
    return {
      id: "doc-1",
      employeeId,
      employeeName: "Ali Khan",
      documentType: input.documentType,
      fileUrl: input.fileUrl,
      mimeType: null,
      fileSizeBytes: null,
      checksumSha256: null,
      originalFilename: null,
      hasBinary: false,
      status: "active",
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expiryTrackingAvailable: false as const,
    };
  },
  async uploadDocumentBinary(_scope, _actor, employeeId, input) {
    return {
      id: "doc-bin-1",
      employeeId,
      employeeName: "Ali Khan",
      documentType: input.documentType,
      fileUrl: null,
      mimeType: input.contentType,
      fileSizeBytes: 12,
      checksumSha256: "a".repeat(64),
      originalFilename: input.originalFilename ?? null,
      hasBinary: true,
      status: "active",
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expiryTrackingAvailable: false as const,
    };
  },
  async createDocumentDownloadUrl() {
    return { url: "https://example.local/signed", expiresInSeconds: 120 };
  },
  async archiveDocument(_scope, _actor, documentId) {
    return {
      id: documentId,
      employeeId: "emp-1",
      employeeName: "Ali Khan",
      documentType: "CNIC",
      fileUrl: null,
      mimeType: "application/pdf",
      fileSizeBytes: 12,
      checksumSha256: "a".repeat(64),
      originalFilename: "cnic.pdf",
      hasBinary: true,
      status: "archived",
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      expiryTrackingAvailable: false as const,
    };
  },
  async listCorrections() {
    return [];
  },
  async createCorrection() {
    throw new Error("unused");
  },
  async decideCorrection() {
    throw new Error("unused");
  },
  async getMetrics() {
    return {
      branchId: null,
      state: "available",
      unavailableReason: null,
      asOfDate: "2026-07-31",
      activeEmployees: 1,
      employeesScheduledToday: 0,
      employeesClockedIn: 0,
      lateArrivalsToday: 0,
      absencesToday: 0,
      openAttendanceSessions: 0,
      shiftsRequiringCoverage: 0,
      scheduledLabourHours: 0,
      actualLabourHours: 0,
      approvedLeaveToday: 0,
      incompleteMandatoryTraining: null,
      incompleteMandatoryTrainingMessage: "n/a",
      expiringDocuments: null,
      expiringDocumentsMessage: "n/a",
      labourCost: null,
      labourCostMessage: "n/a",
    };
  },
  async getAttention() {
    return {
      branchId: null,
      state: "available",
      unavailableReason: null,
      absentEmployees: 0,
      lateArrivals: 0,
      uncoveredShifts: 0,
      openAttendanceSessions: 0,
      attendanceCorrectionsAwaitingApproval: 0,
      leaveRequestsAwaitingApproval: 0,
      incompleteMandatoryTraining: null,
      incompleteMandatoryTrainingMessage: "n/a",
      expiringOrMissingDocuments: null,
      expiringOrMissingDocumentsMessage: "n/a",
      payrollRunsAwaitingApproval: 0,
    };
  },
};

const hrScheduling: HrSchedulingService = {
  async listTemplates() {
    return [];
  },
  async createTemplate(_scope, _actor, input) {
    return {
      id: "tmpl-1",
      branchId: input.branchId,
      name: input.name,
      operationalRole: input.operationalRole ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      breakMinutes: input.breakMinutes ?? 0,
      daysOfWeek: input.daysOfWeek ?? [],
      isActive: true,
      notes: input.notes ?? null,
      createdBy: "user-admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async patchTemplate() {
    throw new Error("unused");
  },
  async listShifts() {
    return [];
  },
  async createShift(_scope, _actor, input) {
    return {
      id: "shift-1",
      branchId: input.branchId,
      employeeId: input.employeeId,
      employeeName: "Ali Khan",
      templateId: input.templateId ?? null,
      shiftDate: input.shiftDate,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      breakMinutes: input.breakMinutes ?? 0,
      operationalRole: input.operationalRole ?? null,
      status: input.status ?? "draft",
      notes: input.notes ?? null,
      createdBy: "user-admin",
      publishedBy: null,
      publishedAt: null,
      cancelReason: null,
      changeReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async patchShift() {
    throw new Error("unused");
  },
  async publishShift(_scope, _actor, shiftId) {
    return {
      id: shiftId,
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      employeeId: "emp-1",
      employeeName: "Ali Khan",
      templateId: null,
      shiftDate: "2026-07-31",
      startsAt: "2026-07-31T09:00:00+05:00",
      endsAt: "2026-07-31T17:00:00+05:00",
      breakMinutes: 30,
      operationalRole: null,
      status: "published",
      notes: null,
      createdBy: "user-admin",
      publishedBy: "user-admin",
      publishedAt: new Date().toISOString(),
      cancelReason: null,
      changeReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async cancelShift(_scope, _actor, shiftId, reason) {
    return {
      id: shiftId,
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      employeeId: "emp-1",
      employeeName: "Ali Khan",
      templateId: null,
      shiftDate: "2026-07-31",
      startsAt: "2026-07-31T09:00:00+05:00",
      endsAt: "2026-07-31T17:00:00+05:00",
      breakMinutes: 30,
      operationalRole: null,
      status: "cancelled",
      notes: null,
      createdBy: "user-admin",
      publishedBy: null,
      publishedAt: null,
      cancelReason: reason,
      changeReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};

const hrPayroll: HrPayrollService = {
  async listCompensation() {
    return [];
  },
  async createCompensation() {
    throw new Error("unused");
  },
  async listPayPeriods() {
    return [];
  },
  async createPayPeriod() {
    throw new Error("unused");
  },
  async listPayrollRuns() {
    return [];
  },
  async createPayrollRun(_scope, _actor, input) {
    return {
      id: "run-1",
      payPeriodId: input.payPeriodId,
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      status: "draft",
      calculationStatus: "unavailable",
      calculationNote: "Draft — not yet calculated.",
      calculationVersion: null,
      calculatedAt: null,
      paymentReadyAt: null,
      accrualPostingStatus: null,
      accrualPostingBlockedReason: null,
      accrualJournalEntryId: null,
      createdBy: "user-admin",
      approvedBy: null,
      lockedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentTriggered: false,
      paymentMessage: "paymentTriggered=false. Settlement required.",
      accountingStatus: "PENDING",
    };
  },
  async calculatePayrollRun(_scope, _actor, runId) {
    return {
      id: runId,
      payPeriodId: "period-1",
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      status: "calculated",
      calculationStatus: "complete",
      calculationNote: "Calculated with rc4-3.payroll.v1",
      calculationVersion: "rc4-3.payroll.v1",
      calculatedAt: new Date().toISOString(),
      paymentReadyAt: null,
      accrualPostingStatus: "pending",
      accrualPostingBlockedReason: null,
      accrualJournalEntryId: null,
      createdBy: "user-admin",
      approvedBy: null,
      lockedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentTriggered: false,
      paymentMessage: "paymentTriggered=false. Settlement required.",
      accountingStatus: "PENDING",
    };
  },
  async approvePayrollRun(_scope, _actor, runId) {
    return {
      id: runId,
      payPeriodId: "period-1",
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      status: "approved",
      calculationStatus: "complete",
      calculationNote: "Calculated",
      calculationVersion: "rc4-3.payroll.v1",
      calculatedAt: new Date().toISOString(),
      paymentReadyAt: null,
      accrualPostingStatus: "posted",
      accrualPostingBlockedReason: null,
      accrualJournalEntryId: "journal-1",
      createdBy: "user-admin",
      approvedBy: "user-admin",
      lockedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentTriggered: false,
      paymentMessage: "paymentTriggered=false. Settlement required.",
      accountingStatus: "LIVE",
    };
  },
  async rejectPayrollRun() {
    throw new Error("unused");
  },
  async markPaymentReady(_scope, _actor, runId) {
    return {
      id: runId,
      payPeriodId: "period-1",
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      status: "payment_ready",
      calculationStatus: "complete",
      calculationNote: "Calculated",
      calculationVersion: "rc4-3.payroll.v1",
      calculatedAt: new Date().toISOString(),
      paymentReadyAt: new Date().toISOString(),
      accrualPostingStatus: "posted",
      accrualPostingBlockedReason: null,
      accrualJournalEntryId: "journal-1",
      createdBy: "user-admin",
      approvedBy: "user-admin",
      lockedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentTriggered: false,
      paymentMessage: "paymentTriggered=false. Settlement required.",
      accountingStatus: "LIVE",
    };
  },
  async lockPayrollRun(_scope, _actor, runId) {
    return {
      id: runId,
      payPeriodId: "period-1",
      branchId: "550e8400-e29b-41d4-a716-446655440000",
      status: "locked",
      calculationStatus: "complete",
      calculationNote: "Calculated",
      calculationVersion: "rc4-3.payroll.v1",
      calculatedAt: new Date().toISOString(),
      paymentReadyAt: null,
      accrualPostingStatus: "posted",
      accrualPostingBlockedReason: null,
      accrualJournalEntryId: "journal-1",
      createdBy: "user-admin",
      approvedBy: "user-admin",
      lockedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentTriggered: false,
      paymentMessage: "paymentTriggered=false. Settlement required.",
      accountingStatus: "LIVE",
    };
  },
  async cancelPayrollRun() {
    throw new Error("unused");
  },
  async reversePayrollRun() {
    throw new Error("unused");
  },
  async recordSettlement(_scope, _actor, input) {
    return {
      settlementId: "settlement-1",
      run: {
        id: input.payrollRunId,
        payPeriodId: "period-1",
        branchId: "550e8400-e29b-41d4-a716-446655440000",
        status: "payment_ready" as const,
        calculationStatus: "complete" as const,
        calculationNote: "Calculated",
        calculationVersion: "rc4-3.payroll.v1",
        calculatedAt: new Date().toISOString(),
        paymentReadyAt: new Date().toISOString(),
        accrualPostingStatus: "posted",
        accrualPostingBlockedReason: null,
        accrualJournalEntryId: "journal-1",
        createdBy: "user-admin",
        approvedBy: "user-admin",
        lockedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentTriggered: false as const,
        paymentMessage: "paymentTriggered=false. Settlement required.",
        accountingStatus: "LIVE" as const,
      },
      paymentTriggered: false as const,
      postingStatus: "posted",
      postingBlockedReason: null,
    };
  },
  async listPayrollLines() {
    return [];
  },
  async listPayrollExceptions() {
    return [];
  },
  async listPayslips() {
    return [];
  },
  async getPayslip() {
    throw new Error("unused");
  },
};

describe("HR workforce unit helpers", () => {
  it("computes overnight shift duration", () => {
    expect(shiftDurationMinutes("22:00", "06:00")).toBe(8 * 60);
    expect(shiftDurationMinutes("09:00", "17:00")).toBe(8 * 60);
  });

  it("computes actual hours between timestamps", () => {
    expect(hoursBetween("2026-07-31T09:00:00Z", "2026-07-31T17:00:00Z", 30)).toBe(7.5);
    expect(hoursBetween(null, "2026-07-31T17:00:00Z")).toBeNull();
  });
});

describe("HR employee directory APIs", () => {
  it("GET /api/v1/admin/hr/employees requires auth", async () => {
    const { app } = createApp(readyEnv, { hrEmployees, hrWorkforce, hrScheduling, hrPayroll });
    const res = await request(app).get("/api/v1/admin/hr/employees");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/admin/hr/employees requires staff.manage or admin.access", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["pos.access"],
          roles: ["cashier"],
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/hr/employees")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(403);
  });

  it("GET /api/v1/admin/hr/employees returns employees for staff.manage", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/hr/employees")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fullName).toBe("Ali Khan");
    expect(res.body.meta.count).toBe(1);
  });

  it("GET /api/v1/admin/hr/employees allows admin.access", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["admin.access"],
          isSuperAdmin: false,
          roles: ["branch-manager"],
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/hr/employees")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("POST /api/v1/admin/hr/employees creates an employee", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/hr/employees")
      .set("Authorization", "Bearer test-token")
      .send({
        branchId: "550e8400-e29b-41d4-a716-446655440000",
        fullName: "Sara Ahmed",
        email: "sara@example.com",
        role: "waiter",
        phone: "03009998888",
      });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.fullName).toBe("Sara Ahmed");
    expect(res.body.data.email).toBe("sara@example.com");
  });

  it("PATCH /api/v1/admin/hr/employees/:id updates employee", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .patch("/api/v1/admin/hr/employees/550e8400-e29b-41d4-a716-446655440001")
      .set("Authorization", "Bearer test-token")
      .send({ fullName: "Ali Updated", role: "shift-lead" });
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe("Ali Updated");
  });

  it("POST deactivate requires reason", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const bad = await request(app)
      .post("/api/v1/admin/hr/employees/550e8400-e29b-41d4-a716-446655440001/deactivate")
      .set("Authorization", "Bearer test-token")
      .send({});
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post("/api/v1/admin/hr/employees/550e8400-e29b-41d4-a716-446655440001/deactivate")
      .set("Authorization", "Bearer test-token")
      .send({ reason: "Left the company" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("inactive");
    expect(ok.body.data.deactivationReason).toBe("Left the company");
  });

  it("POST /api/v1/admin/hr/attendance records check-in", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal({ permissions: ["hr.manage"] })),
    });
    const res = await request(app)
      .post("/api/v1/admin/hr/attendance")
      .set("Authorization", "Bearer test-token")
      .send({
        branchId: "550e8400-e29b-41d4-a716-446655440000",
        employeeId: "550e8400-e29b-41d4-a716-446655440001",
        action: "check_in",
        status: "PRESENT",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PRESENT");
  });

  it("PATCH /api/v1/admin/hr/leaves/:id approves leave", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .patch("/api/v1/admin/hr/leaves/550e8400-e29b-41d4-a716-446655440099")
      .set("Authorization", "Bearer test-token")
      .send({ status: "APPROVED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("APPROVED");
  });

  it("POST /api/v1/admin/hr/shift-templates creates a template", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/hr/shift-templates")
      .set("Authorization", "Bearer test-token")
      .send({
        branchId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Opening Shift",
        startTime: "09:00",
        endTime: "17:00",
        breakMinutes: 30,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Opening Shift");
  });

  it("GET /api/v1/admin/hr/attention returns workforce attention", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/hr/attention")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe("available");
  });

  it("POST payroll run calculate stays payment-free", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/hr/payroll-runs/550e8400-e29b-41d4-a716-446655440088/calculate")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.data.paymentTriggered).toBe(false);
    expect(res.body.data.calculationStatus).toBe("complete");
    expect(res.body.data.accountingStatus).toBe("PENDING");
  });

  it("POST payroll payment-ready does not set paid", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/hr/payroll-runs/550e8400-e29b-41d4-a716-446655440088/payment-ready")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("payment_ready");
    expect(res.body.data.paymentTriggered).toBe(false);
  });

  it("GET payroll lines requires auth", async () => {
    const { app } = createApp(readyEnv, { hrEmployees, hrWorkforce, hrScheduling, hrPayroll });
    const res = await request(app).get(
      "/api/v1/admin/hr/payroll-runs/550e8400-e29b-41d4-a716-446655440088/lines",
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/admin/hr/employees/:id/documents stores a document URL", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
      hrScheduling,
      hrPayroll,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/hr/employees/550e8400-e29b-41d4-a716-446655440001/documents")
      .set("Authorization", "Bearer test-token")
      .send({
        documentType: "CNIC",
        fileUrl: "https://files.example.com/cnic.pdf",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.documentType).toBe("CNIC");
    expect(res.body.data.fileUrl).toBe("https://files.example.com/cnic.pdf");
  });
});

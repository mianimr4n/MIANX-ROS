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

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
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
  fullName: "Ali Khan",
  email: "ali@example.com",
  phone: "03001234567",
  role: "cashier",
  status: "active",
  hiredAt: "2026-01-15",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const hrEmployees: HrEmployeesService = {
  async listEmployees() {
    return [employee];
  },
  async createEmployee(_scope, input) {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async listLeaves() {
    return [];
  },
  async createLeave(_scope, input) {
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
    };
  },
  async decideLeave(_scope, leaveId, input) {
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
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  },
};

describe("HR employee directory APIs", () => {
  it("GET /api/v1/admin/hr/employees requires auth", async () => {
    const { app } = createApp(readyEnv, { hrEmployees });
    const res = await request(app).get("/api/v1/admin/hr/employees");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/admin/hr/employees requires staff.manage or admin.access", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
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

  it("POST /api/v1/admin/hr/attendance records check-in", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
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

  it("POST /api/v1/admin/hr/employees/:id/documents stores a document URL", async () => {
    const { app } = createApp(readyEnv, {
      hrEmployees,
      hrWorkforce,
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

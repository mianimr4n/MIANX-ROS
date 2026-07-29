import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import {
  ASSIGNABLE_STAFF_ROLES,
  type StaffAssignmentService,
  type StaffAssignmentRecord,
} from "../src/services/staff/assignments.js";
import { isInviteableRoleCode } from "../src/services/staff/invites.js";
import type {
  BookingPolicyService,
  BookingPolicyRecord,
} from "../src/services/reservations/booking-policy.js";
import { ApiError } from "../src/common/http.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const RO_BRANCH = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";
const NB_BRANCH = "522dbfff-0db2-49b8-bbe9-08b0ffd76d3f";

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
    userId: "user-founder",
    authUserId: "auth-founder",
    email: "founder@example.com",
    userType: "staff",
    status: "active",
    roles: ["super-admin"],
    permissions: ["*"],
    branchIds: [],
    isSuperAdmin: true,
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

function assignment(overrides: Partial<StaffAssignmentRecord> = {}): StaffAssignmentRecord {
  return {
    id: "asg-1",
    branchId: RO_BRANCH,
    userId: "user-1",
    roleId: "role-1",
    roleCode: "cashier",
    assignmentStatus: "ACTIVE",
    invitationId: null,
    assignedBy: "user-founder",
    assignedAt: new Date().toISOString(),
    verifiedBy: null,
    verifiedAt: null,
    deactivatedBy: null,
    deactivatedAt: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userEmail: "cashier@example.com",
    userFullName: "Ali Cashier",
    branchCode: "royal-orchard",
    branchName: "Royal Orchard",
    ...overrides,
  };
}

function policy(overrides: Partial<BookingPolicyRecord> = {}): BookingPolicyRecord {
  return {
    id: "pol-1",
    branchId: RO_BRANCH,
    version: 1,
    status: "DRAFT",
    bookingEnabled: false,
    onlineBookingEnabled: false,
    minimumPartySize: 1,
    maximumPartySize: 10,
    bookingIntervalMinutes: 30,
    minimumAdvanceMinutes: 30,
    maximumAdvanceDays: 30,
    cancellationWindowMinutes: 60,
    gracePeriodMinutes: 15,
    tableHoldMinutes: 15,
    waitlistEnabled: true,
    sameDayBookingEnabled: true,
    specialNotes: null,
    effectiveFrom: null,
    effectiveUntil: null,
    approvedBy: null,
    approvedAt: null,
    createdBy: "user-founder",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const unusedStaff: StaffAssignmentService = {
  async listBranchStaff() {
    return [];
  },
  async listAvailableUsers() {
    return [];
  },
  async createAssignment() {
    throw new Error("unused");
  },
  async updateStatus() {
    throw new Error("unused");
  },
  async deactivate() {
    throw new Error("unused");
  },
  async reactivate() {
    throw new Error("unused");
  },
  async listHistory() {
    return [];
  },
};

describe("opening M1 — staff roles allow-list", () => {
  it("accepts canonical staff roles including host and waiter", () => {
    for (const code of ASSIGNABLE_STAFF_ROLES) {
      expect(isInviteableRoleCode(code)).toBe(true);
    }
  });

  it("rejects forbidden role codes", () => {
    for (const code of [
      "owner",
      "founder",
      "admin",
      "delivery",
      "general-staff",
      "staff",
      "super-admin",
    ]) {
      expect(isInviteableRoleCode(code)).toBe(false);
    }
  });
});

describe("opening M1 — staff assignment APIs", () => {
  it("lists branch staff for authorized principal", async () => {
    const staffAssignments: StaffAssignmentService = {
      ...unusedStaff,
      async listBranchStaff() {
        return [assignment()];
      },
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      staffAssignments,
    });

    const res = await request(app)
      .get(`/api/v1/admin/staff/assignments?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roleCode).toBe("cashier");
  });

  it("rejects forbidden role codes on create via schema", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      staffAssignments: unusedStaff,
    });

    const res = await request(app)
      .post("/api/v1/admin/staff/assignments")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        userId: "11111111-1111-4111-8111-111111111111",
        roleCode: "owner",
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("branch-manager cannot create assignment on another branch", async () => {
    const staffAssignments: StaffAssignmentService = {
      ...unusedStaff,
      async createAssignment(actor, input) {
        if (!actor.isSuperAdmin && !actor.branchIds.includes(input.branchId)) {
          throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "cross-branch");
        }
        return assignment({ branchId: input.branchId });
      },
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-bm", "bm@example.com"),
      authProfileRepository: authRepo(
        principal({
          userId: "user-bm",
          authUserId: "auth-bm",
          email: "bm@example.com",
          roles: ["branch-manager"],
          permissions: ["staff.manage"],
          branchIds: [RO_BRANCH],
          isSuperAdmin: false,
        }),
      ),
      staffAssignments,
    });

    const res = await request(app)
      .post("/api/v1/admin/staff/assignments")
      .set("Authorization", "Bearer test")
      .send({
        branchId: NB_BRANCH,
        userId: "11111111-1111-4111-8111-111111111111",
        roleCode: "cashier",
      });
    expect(res.status).toBe(403);
  });

  it("preserves history on deactivate", async () => {
    const staffAssignments: StaffAssignmentService = {
      ...unusedStaff,
      async deactivate() {
        return assignment({
          assignmentStatus: "INACTIVE",
          deactivatedAt: new Date().toISOString(),
        });
      },
      async listHistory() {
        return [
          {
            id: "evt-1",
            userRoleId: "asg-1",
            branchId: RO_BRANCH,
            userId: "user-1",
            roleId: "role-1",
            eventType: "DEACTIVATED",
            fromStatus: "ACTIVE",
            toStatus: "INACTIVE",
            actorUserId: "user-founder",
            notes: null,
            createdAt: new Date().toISOString(),
          },
        ];
      },
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      staffAssignments,
    });

    const deactivate = await request(app)
      .post("/api/v1/admin/staff/assignments/asg-1/deactivate")
      .set("Authorization", "Bearer test")
      .send({});
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.assignmentStatus).toBe("INACTIVE");

    const history = await request(app)
      .get("/api/v1/admin/staff/assignments/asg-1/history")
      .set("Authorization", "Bearer test");
    expect(history.status).toBe(200);
    expect(history.body.data[0].eventType).toBe("DEACTIVATED");
  });
});

describe("opening M1 — booking policy APIs", () => {
  it("rejects unapproved activation", async () => {
    const bookingPolicy: BookingPolicyService = {
      async getCurrent() {
        return policy();
      },
      async listVersions() {
        return [policy()];
      },
      async createDraft() {
        return policy();
      },
      async updateDraft() {
        return policy();
      },
      async submitForReview() {
        return policy({ status: "REVIEW_REQUIRED" });
      },
      async approve() {
        return policy({ status: "APPROVED", approvedAt: new Date().toISOString() });
      },
      async activate() {
        throw new ApiError(409, "POLICY_NOT_APPROVED", "Unapproved policies cannot appear ACTIVE.");
      },
      async retire() {
        return policy({ status: "RETIRED" });
      },
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      bookingPolicy,
    });

    const res = await request(app)
      .post("/api/v1/admin/booking-policies/pol-1/activate")
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(409);
  });

  it("branch-manager cannot approve (Founder-only)", async () => {
    const bookingPolicy: BookingPolicyService = {
      async getCurrent() {
        return policy({ status: "REVIEW_REQUIRED" });
      },
      async listVersions() {
        return [];
      },
      async createDraft() {
        return policy();
      },
      async updateDraft() {
        return policy();
      },
      async submitForReview() {
        return policy({ status: "REVIEW_REQUIRED" });
      },
      async approve(actor) {
        if (!actor.isSuperAdmin) {
          throw new ApiError(403, "FOUNDER_APPROVAL_REQUIRED", "Founder required");
        }
        return policy({ status: "APPROVED" });
      },
      async activate() {
        return policy({ status: "ACTIVE" });
      },
      async retire() {
        return policy({ status: "RETIRED" });
      },
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-bm", "bm@example.com"),
      authProfileRepository: authRepo(
        principal({
          userId: "user-bm",
          isSuperAdmin: false,
          roles: ["branch-manager"],
          branchIds: [RO_BRANCH],
          permissions: ["reservation.manage"],
        }),
      ),
      bookingPolicy,
    });

    const res = await request(app)
      .post("/api/v1/admin/booking-policies/pol-1/approve")
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(403);
  });
});

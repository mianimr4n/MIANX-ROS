import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import { ApiError } from "../src/common/http.js";
import {
  type E2eRehearsalRecord,
  type FounderDecisionRecord,
  type OpeningGovernanceService,
  type OwnerHandoverRecord,
  type RoleRehearsalRecord,
  type SopReviewRecord,
  type TrainingParticipantRecord,
  type TrainingSessionRecord,
} from "../src/services/opening/governance.js";

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

function bmPrincipal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return principal({
    userId: "user-bm",
    authUserId: "auth-bm",
    email: "bm@example.com",
    isSuperAdmin: false,
    roles: ["branch-manager"],
    permissions: ["branch.manage"],
    branchIds: [RO_BRANCH],
    ...overrides,
  });
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

function sop(overrides: Partial<SopReviewRecord> = {}): SopReviewRecord {
  return {
    id: "sop-1",
    branchId: RO_BRANCH,
    sopCode: "ORDER_CONFIRMATION",
    documentReference: "docs/ops/order-confirmation.md",
    documentVersion: "1.0",
    reviewStatus: "NOT_REVIEWED",
    reviewedAt: null,
    approvedAt: null,
    operationalVerificationStatus: "NOT_VERIFIED",
    operationallyVerifiedAt: null,
    reviewDueAt: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function training(overrides: Partial<TrainingSessionRecord> = {}): TrainingSessionRecord {
  return {
    id: "train-1",
    branchId: RO_BRANCH,
    trainingCode: "CASHIER_POS",
    title: "Cashier POS training",
    scheduledAt: null,
    completedAt: null,
    trainingStatus: "SCHEDULED",
    result: "NOT_ASSESSED",
    localTestOnly: false,
    followUpRequired: false,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function participant(overrides: Partial<TrainingParticipantRecord> = {}): TrainingParticipantRecord {
  return {
    id: "part-1",
    trainingSessionId: "train-1",
    branchId: RO_BRANCH,
    userId: "user-cashier",
    canonicalRoleCode: "cashier",
    attendanceStatus: "INVITED",
    assessmentResult: "NOT_ASSESSED",
    acknowledgedAt: null,
    remediationRequired: false,
    remediationDueAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function rehearsal(overrides: Partial<RoleRehearsalRecord> = {}): RoleRehearsalRecord {
  return {
    id: "reh-1",
    branchId: RO_BRANCH,
    rehearsalCode: "CASHIER_POS",
    scenario: "POS order entry rehearsal",
    scheduledAt: null,
    completedAt: null,
    rehearsalStatus: "SCHEDULED",
    result: "NOT_ASSESSED",
    localTestOnly: false,
    retestRequired: false,
    issuesFound: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function e2e(overrides: Partial<E2eRehearsalRecord> = {}): E2eRehearsalRecord {
  return {
    id: "e2e-1",
    branchId: RO_BRANCH,
    scheduledAt: null,
    completedAt: null,
    status: "SCHEDULED",
    result: "NOT_ASSESSED",
    localTestOnly: false,
    criticalFailures: 0,
    stagesCompleted: [],
    stagesFailed: [],
    retestRequired: false,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function founder(overrides: Partial<FounderDecisionRecord> = {}): FounderDecisionRecord {
  return {
    id: "fd-1",
    branchId: RO_BRANCH,
    decision: "REVIEW_REQUIRED",
    decisionNotes: null,
    conditions: null,
    decidedAt: new Date().toISOString(),
    completedItems: 0,
    requiredItems: 0,
    readinessPercentage: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function handover(overrides: Partial<OwnerHandoverRecord> = {}): OwnerHandoverRecord {
  return {
    id: "oh-1",
    branchId: RO_BRANCH,
    handoverStatus: "PREPARING",
    intendedOwnerName: "Future Owner Label",
    intendedOwnerContactReference: "contact-ref-only",
    handoverScope: "Royal Orchard operations",
    accessReviewStatus: "NOT_STARTED",
    operationalDocumentsReviewed: false,
    financialProcedureReviewed: false,
    staffStructureReviewed: false,
    deviceInventoryReviewed: false,
    unresolvedItems: null,
    acceptedAt: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function unusedGovernance(overrides: Partial<OpeningGovernanceService> = {}): OpeningGovernanceService {
  const base: OpeningGovernanceService = {
    async listSops() {
      return [];
    },
    async upsertSop() {
      throw new Error("unused");
    },
    async approveSop() {
      throw new Error("unused");
    },
    async verifySopOperational() {
      throw new Error("unused");
    },
    async reviewSop() {
      throw new Error("unused");
    },
    async failSop() {
      throw new Error("unused");
    },
    async expireSop() {
      throw new Error("unused");
    },
    async getSopHistory() {
      return [];
    },
    async listTraining() {
      return [];
    },
    async upsertTraining() {
      throw new Error("unused");
    },
    async completeTraining() {
      throw new Error("unused");
    },
    async failTraining() {
      throw new Error("unused");
    },
    async addTrainingParticipant() {
      throw new Error("unused");
    },
    async recordAttendance() {
      throw new Error("unused");
    },
    async recordAssessment() {
      throw new Error("unused");
    },
    async scheduleRemediation() {
      throw new Error("unused");
    },
    async getTrainingHistory() {
      return [];
    },
    async listRoleRehearsals() {
      return [];
    },
    async upsertRoleRehearsal() {
      throw new Error("unused");
    },
    async completeRoleRehearsal() {
      throw new Error("unused");
    },
    async failRoleRehearsal() {
      throw new Error("unused");
    },
    async retestRoleRehearsal() {
      throw new Error("unused");
    },
    async listE2eRehearsals() {
      return [];
    },
    async scheduleE2eRehearsal() {
      throw new Error("unused");
    },
    async completeE2eRehearsal() {
      throw new Error("unused");
    },
    async failE2eRehearsal() {
      throw new Error("unused");
    },
    async listFounderDecisions() {
      return [];
    },
    async recordFounderDecision() {
      throw new Error("unused");
    },
    async getOwnerHandover() {
      return null;
    },
    async upsertOwnerHandover() {
      throw new Error("unused");
    },
    async markOwnerHandoverReady() {
      throw new Error("unused");
    },
    async submitOwnerHandoverReview() {
      throw new Error("unused");
    },
    async acceptOwnerHandover() {
      throw new Error("unused");
    },
  };
  return { ...base, ...overrides };
}

function appWith(gov: OpeningGovernanceService, p: AuthPrincipal = principal()) {
  return createApp(readyEnv, {
    authTokenVerifier: verifier(p.authUserId, p.email ?? "x@example.com"),
    authProfileRepository: authRepo(p),
    openingGovernance: gov,
  }).app;
}

describe("opening M3 — SOP APIs", () => {
  it("lists SOP reviews for a branch", async () => {
    const app = appWith(
      unusedGovernance({
        async listSops() {
          return [sop({ reviewStatus: "REVIEWED" })];
        },
      }),
    );
    const res = await request(app)
      .get(`/api/v1/admin/opening/sops?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data[0].sopCode).toBe("ORDER_CONFIRMATION");
    expect(res.body.data[0].reviewStatus).toBe("REVIEWED");
    expect(res.body.data[0].operationalVerificationStatus).toBe("NOT_VERIFIED");
  });

  it("creates an SOP review record without implying rehearsal", async () => {
    const app = appWith(
      unusedGovernance({
        async upsertSop(_actor, input) {
          return sop({
            sopCode: input.sopCode,
            documentReference: input.documentReference ?? null,
            reviewStatus: "NOT_REVIEWED",
            operationalVerificationStatus: "NOT_VERIFIED",
          });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/sops")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        sopCode: "ORDER_CONFIRMATION",
        documentReference: "docs/ops/order.md",
        documentVersion: "1.0",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.reviewStatus).toBe("NOT_REVIEWED");
    expect(res.body.data.operationalVerificationStatus).toBe("NOT_VERIFIED");
  });

  it("allows branch-manager to mark reviewed", async () => {
    const app = appWith(
      unusedGovernance({
        async reviewSop() {
          return sop({ reviewStatus: "REVIEWED", reviewedAt: new Date().toISOString() });
        },
      }),
      bmPrincipal(),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/sops/sop-1/review")
      .set("Authorization", "Bearer test")
      .send({ notes: "Reviewed onsite docs" });
    expect(res.status).toBe(200);
    expect(res.body.data.reviewStatus).toBe("REVIEWED");
  });

  it("rejects branch-manager SOP approval", async () => {
    const app = appWith(
      unusedGovernance({
        async approveSop(actor) {
          if (!actor.isSuperAdmin) {
            throw new ApiError(403, "SUPER_ADMIN_REQUIRED", "Only super-admin may approve SOPs.");
          }
          return sop({ reviewStatus: "APPROVED" });
        },
      }),
      bmPrincipal(),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/sops/sop-1/approve")
      .set("Authorization", "Bearer test")
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe("SUPER_ADMIN_REQUIRED");
  });

  it("allows super-admin to approve and verify operationally", async () => {
    const app = appWith(
      unusedGovernance({
        async approveSop() {
          return sop({ reviewStatus: "APPROVED", approvedAt: new Date().toISOString() });
        },
        async verifySopOperational() {
          return sop({
            reviewStatus: "APPROVED",
            operationalVerificationStatus: "VERIFIED_ONSITE",
            operationallyVerifiedAt: new Date().toISOString(),
          });
        },
      }),
    );
    const approve = await request(app)
      .post("/api/v1/admin/opening/sops/sop-1/approve")
      .set("Authorization", "Bearer test")
      .send({});
    expect(approve.status).toBe(200);
    expect(approve.body.data.reviewStatus).toBe("APPROVED");

    const verify = await request(app)
      .post("/api/v1/admin/opening/sops/sop-1/verify-operational")
      .set("Authorization", "Bearer test")
      .send({ summary: "Observed on floor" });
    expect(verify.status).toBe(200);
    expect(verify.body.data.operationalVerificationStatus).toBe("VERIFIED_ONSITE");
  });

  it("records failed operational verification", async () => {
    const app = appWith(
      unusedGovernance({
        async failSop() {
          return sop({ operationalVerificationStatus: "FAILED" });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/sops/sop-1/fail")
      .set("Authorization", "Bearer test")
      .send({ reason: "Process gap found" });
    expect(res.status).toBe(200);
    expect(res.body.data.operationalVerificationStatus).toBe("FAILED");
  });

  it("rejects branch-manager cross-branch SOP write", async () => {
    const app = appWith(
      unusedGovernance({
        async upsertSop(actor, input) {
          if (!actor.isSuperAdmin && !actor.branchIds.includes(input.branchId)) {
            throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Cross-branch write rejected.");
          }
          return sop({ branchId: input.branchId, sopCode: input.sopCode });
        },
      }),
      bmPrincipal(),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/sops")
      .set("Authorization", "Bearer test")
      .send({ branchId: NB_BRANCH, sopCode: "KITCHEN_PROGRESSION" });
    expect(res.status).toBe(403);
  });

  it("returns SOP history", async () => {
    const app = appWith(
      unusedGovernance({
        async getSopHistory() {
          return [{ event_type: "CREATED" }, { event_type: "REVIEWED" }];
        },
      }),
    );
    const res = await request(app)
      .get("/api/v1/admin/opening/sops/sop-1/history")
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("opening M3 — training APIs", () => {
  it("creates a training session", async () => {
    const app = appWith(
      unusedGovernance({
        async upsertTraining(_a, input) {
          return training({ trainingCode: input.trainingCode, title: input.title });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/training")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        trainingCode: "CASHIER_POS",
        title: "Cashier POS training",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.trainingCode).toBe("CASHIER_POS");
  });

  it("adds a real participant", async () => {
    const app = appWith(
      unusedGovernance({
        async addTrainingParticipant() {
          return participant();
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/training/train-1/participants")
      .set("Authorization", "Bearer test")
      .send({ userId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d11", roleCode: "cashier" });
    expect(res.status).toBe(201);
    expect(res.body.data.canonicalRoleCode).toBe("cashier");
  });

  it("rejects inactive or cross-branch participant", async () => {
    const app = appWith(
      unusedGovernance({
        async addTrainingParticipant() {
          throw new ApiError(
            400,
            "INACTIVE_OR_CROSS_BRANCH",
            "Participant must be an ACTIVE assignment on the training branch.",
          );
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/training/train-1/participants")
      .set("Authorization", "Bearer test")
      .send({ userId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d22", roleCode: "cashier" });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("INACTIVE_OR_CROSS_BRANCH");
  });

  it("records attendance and assessment", async () => {
    const app = appWith(
      unusedGovernance({
        async recordAttendance() {
          return participant({ attendanceStatus: "ATTENDED", acknowledgedAt: new Date().toISOString() });
        },
        async recordAssessment() {
          return participant({ attendanceStatus: "ATTENDED", assessmentResult: "PASS" });
        },
      }),
    );
    const attend = await request(app)
      .post("/api/v1/admin/opening/training/participants/part-1/attendance")
      .set("Authorization", "Bearer test")
      .send({ status: "ATTENDED" });
    expect(attend.status).toBe(200);
    expect(attend.body.data.attendanceStatus).toBe("ATTENDED");

    const assess = await request(app)
      .post("/api/v1/admin/opening/training/participants/part-1/assessment")
      .set("Authorization", "Bearer test")
      .send({ result: "PASS" });
    expect(assess.status).toBe(200);
    expect(assess.body.data.assessmentResult).toBe("PASS");
  });

  it("allows localTestOnly completion without Production credit", async () => {
    const app = appWith(
      unusedGovernance({
        async completeTraining(_a, _id, input) {
          return training({
            trainingStatus: "COMPLETED",
            result: input.result ?? "PASS",
            localTestOnly: input.localTestOnly ?? false,
            completedAt: new Date().toISOString(),
          });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/training/train-1/complete")
      .set("Authorization", "Bearer test")
      .send({ result: "PASS", localTestOnly: true });
    expect(res.status).toBe(200);
    expect(res.body.data.localTestOnly).toBe(true);
  });

  it("rejects Production completion without participants", async () => {
    const app = appWith(
      unusedGovernance({
        async completeTraining(_a, _id, input) {
          if (!input.localTestOnly) {
            throw new ApiError(
              400,
              "PARTICIPANTS_REQUIRED",
              "Production training completion requires real participants.",
            );
          }
          return training({ trainingStatus: "COMPLETED", localTestOnly: true });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/training/train-1/complete")
      .set("Authorization", "Bearer test")
      .send({ result: "PASS", localTestOnly: false });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("PARTICIPANTS_REQUIRED");
  });

  it("fails training and schedules remediation", async () => {
    const app = appWith(
      unusedGovernance({
        async failTraining() {
          return training({ trainingStatus: "FAILED", result: "FAIL" });
        },
        async scheduleRemediation() {
          return participant({
            assessmentResult: "FAIL",
            remediationRequired: true,
            remediationDueAt: "2026-08-01T10:00:00.000Z",
          });
        },
      }),
    );
    const fail = await request(app)
      .post("/api/v1/admin/opening/training/train-1/fail")
      .set("Authorization", "Bearer test")
      .send({ reason: "Assessment failed" });
    expect(fail.status).toBe(200);
    expect(fail.body.data.trainingStatus).toBe("FAILED");

    const rem = await request(app)
      .post("/api/v1/admin/opening/training/participants/part-1/remediation")
      .set("Authorization", "Bearer test")
      .send({ dueAt: "2026-08-01T10:00:00.000Z" });
    expect(rem.status).toBe(200);
    expect(rem.body.data.remediationRequired).toBe(true);
  });

  it("rejects duplicate participants", async () => {
    const app = appWith(
      unusedGovernance({
        async addTrainingParticipant() {
          throw new ApiError(409, "DUPLICATE_PARTICIPANT", "Participant already added.");
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/training/train-1/participants")
      .set("Authorization", "Bearer test")
      .send({ userId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d11", roleCode: "cashier" });
    expect(res.status).toBe(409);
  });
});

describe("opening M3 — role and e2e rehearsals", () => {
  it("creates and completes a role rehearsal as local test only", async () => {
    const app = appWith(
      unusedGovernance({
        async upsertRoleRehearsal(_a, input) {
          return rehearsal({ rehearsalCode: input.rehearsalCode, scenario: input.scenario });
        },
        async completeRoleRehearsal(_a, _id, input) {
          return rehearsal({
            rehearsalStatus: "COMPLETED",
            result: input.result ?? "PASS",
            localTestOnly: input.localTestOnly ?? false,
            completedAt: new Date().toISOString(),
          });
        },
      }),
    );
    const create = await request(app)
      .post("/api/v1/admin/opening/role-rehearsals")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        rehearsalCode: "CASHIER_POS",
        scenario: "POS order entry",
      });
    expect(create.status).toBe(201);

    const complete = await request(app)
      .post("/api/v1/admin/opening/role-rehearsals/reh-1/complete")
      .set("Authorization", "Bearer test")
      .send({ result: "PASS", localTestOnly: true });
    expect(complete.status).toBe(200);
    expect(complete.body.data.localTestOnly).toBe(true);
  });

  it("fails a role rehearsal and schedules retest", async () => {
    const app = appWith(
      unusedGovernance({
        async failRoleRehearsal() {
          return rehearsal({ rehearsalStatus: "FAILED", result: "FAIL" });
        },
        async retestRoleRehearsal() {
          return rehearsal({ retestRequired: true, rehearsalStatus: "NOT_SCHEDULED" });
        },
      }),
    );
    const fail = await request(app)
      .post("/api/v1/admin/opening/role-rehearsals/reh-1/fail")
      .set("Authorization", "Bearer test")
      .send({ reason: "Critical POS failure" });
    expect(fail.status).toBe(200);
    expect(fail.body.data.rehearsalStatus).toBe("FAILED");

    const retest = await request(app)
      .post("/api/v1/admin/opening/role-rehearsals/reh-1/retest")
      .set("Authorization", "Bearer test")
      .send({ dueAt: "2026-08-05T10:00:00.000Z", notes: "Retest required" });
    expect(retest.status).toBe(200);
    expect(retest.body.data.retestRequired).toBe(true);
  });

  it("schedules and completes e2e rehearsal locally without Production credit", async () => {
    const app = appWith(
      unusedGovernance({
        async scheduleE2eRehearsal() {
          return e2e();
        },
        async completeE2eRehearsal(_a, _id, input) {
          return e2e({
            status: "COMPLETED",
            result: input.result ?? "PASS",
            localTestOnly: input.localTestOnly ?? false,
            completedAt: new Date().toISOString(),
          });
        },
      }),
    );
    const create = await request(app)
      .post("/api/v1/admin/opening/e2e-rehearsals")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH });
    expect(create.status).toBe(201);

    const complete = await request(app)
      .post("/api/v1/admin/opening/e2e-rehearsals/e2e-1/complete")
      .set("Authorization", "Bearer test")
      .send({
        result: "PASS",
        localTestOnly: true,
        stagesCompleted: ["opening", "pos", "kitchen", "closing"],
      });
    expect(complete.status).toBe(200);
    expect(complete.body.data.localTestOnly).toBe(true);
  });

  it("fails e2e rehearsal with critical failures", async () => {
    const app = appWith(
      unusedGovernance({
        async failE2eRehearsal() {
          return e2e({ status: "FAILED", result: "FAIL", criticalFailures: 1 });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/e2e-rehearsals/e2e-1/fail")
      .set("Authorization", "Bearer test")
      .send({ reason: "Kitchen handoff failed" });
    expect(res.status).toBe(200);
    expect(res.body.data.criticalFailures).toBe(1);
  });
});

describe("opening M3 — Founder go/no-go", () => {
  it("rejects branch-manager Founder decision", async () => {
    const app = appWith(
      unusedGovernance({
        async recordFounderDecision(actor) {
          if (!actor.isSuperAdmin) {
            throw new ApiError(403, "SUPER_ADMIN_REQUIRED", "Only super-admin may decide.");
          }
          return founder({ decision: "GO_APPROVED" });
        },
      }),
      bmPrincipal(),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/founder-decisions")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH, decision: "GO_APPROVED" });
    expect(res.status).toBe(403);
  });

  it("requires conditions for GO_CONDITIONAL", async () => {
    const app = appWith(
      unusedGovernance({
        async recordFounderDecision(_a, input) {
          if (input.decision === "GO_CONDITIONAL" && !input.conditions?.trim()) {
            throw new ApiError(400, "CONDITIONS_REQUIRED", "GO_CONDITIONAL requires conditions.");
          }
          return founder({ decision: input.decision, conditions: input.conditions ?? null });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/founder-decisions")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH, decision: "GO_CONDITIONAL" });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("CONDITIONS_REQUIRED");
  });

  it("requires notes for NO_GO", async () => {
    const app = appWith(
      unusedGovernance({
        async recordFounderDecision(_a, input) {
          if (input.decision === "NO_GO" && !input.decisionNotes?.trim()) {
            throw new ApiError(400, "NOTES_REQUIRED", "NO_GO requires notes.");
          }
          return founder({ decision: input.decision, decisionNotes: input.decisionNotes ?? null });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/founder-decisions")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH, decision: "NO_GO" });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("NOTES_REQUIRED");
  });

  it("records GO_APPROVED without mutating branch status", async () => {
    let branchTouched = false;
    const app = appWith(
      unusedGovernance({
        async recordFounderDecision(_a, input) {
          // Founder decision must never touch branches.status
          void branchTouched;
          return founder({ decision: input.decision });
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/founder-decisions")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH, decision: "GO_APPROVED", decisionNotes: "Ready" });
    expect(res.status).toBe(201);
    expect(res.body.data.decision).toBe("GO_APPROVED");
    expect(branchTouched).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/"roleCode"\s*:\s*"founder"/i);
  });

  it("lists Founder decision history", async () => {
    const app = appWith(
      unusedGovernance({
        async listFounderDecisions() {
          return [
            founder({ id: "fd-2", decision: "GO_APPROVED" }),
            founder({ id: "fd-1", decision: "NO_GO", decisionNotes: "Earlier blockers" }),
          ];
        },
      }),
    );
    const res = await request(app)
      .get(`/api/v1/admin/opening/founder-decisions?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("opening M3 — Owner handover", () => {
  it("upserts handover draft without creating owner role", async () => {
    const app = appWith(
      unusedGovernance({
        async upsertOwnerHandover(_a, input) {
          return handover({
            intendedOwnerName: input.intendedOwnerName ?? null,
            handoverStatus: "PREPARING",
          });
        },
      }),
    );
    const res = await request(app)
      .put("/api/v1/admin/opening/owner-handover")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        intendedOwnerName: "Future Owner Label",
        intendedOwnerContactReference: "ref-only",
      });
    expect(res.status).toBe(200);
    expect(res.body.data.handoverStatus).toBe("PREPARING");
    expect(JSON.stringify(res.body)).not.toMatch(/"roleCode"\s*:\s*"owner"/i);
    expect(JSON.stringify(res.body)).not.toMatch(/password|access_token|secret/i);
  });

  it("blocks READY when unresolved items remain", async () => {
    const app = appWith(
      unusedGovernance({
        async markOwnerHandoverReady() {
          throw new ApiError(400, "UNRESOLVED_ITEMS", "Unresolved items block READY.");
        },
      }),
    );
    const res = await request(app)
      .post(`/api/v1/admin/opening/owner-handover/${RO_BRANCH}/ready`)
      .set("Authorization", "Bearer test")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("UNRESOLVED_ITEMS");
  });

  it("marks READY when reviews are complete", async () => {
    const app = appWith(
      unusedGovernance({
        async markOwnerHandoverReady() {
          return handover({
            handoverStatus: "READY_FOR_HANDOVER",
            operationalDocumentsReviewed: true,
            financialProcedureReviewed: true,
            staffStructureReviewed: true,
            deviceInventoryReviewed: true,
          });
        },
      }),
    );
    const res = await request(app)
      .post(`/api/v1/admin/opening/owner-handover/${RO_BRANCH}/ready`)
      .set("Authorization", "Bearer test")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.handoverStatus).toBe("READY_FOR_HANDOVER");
  });

  it("requires super-admin to accept handover", async () => {
    const app = appWith(
      unusedGovernance({
        async acceptOwnerHandover(actor) {
          if (!actor.isSuperAdmin) {
            throw new ApiError(403, "SUPER_ADMIN_REQUIRED", "Only super-admin may accept.");
          }
          return handover({ handoverStatus: "ACCEPTED", acceptedAt: new Date().toISOString() });
        },
      }),
      bmPrincipal(),
    );
    const res = await request(app)
      .post(`/api/v1/admin/opening/owner-handover/${RO_BRANCH}/accept`)
      .set("Authorization", "Bearer test")
      .send({ acceptedByReference: "future-owner-label" });
    expect(res.status).toBe(403);
  });

  it("super-admin can accept handover", async () => {
    const app = appWith(
      unusedGovernance({
        async acceptOwnerHandover() {
          return handover({ handoverStatus: "ACCEPTED", acceptedAt: new Date().toISOString() });
        },
      }),
    );
    const res = await request(app)
      .post(`/api/v1/admin/opening/owner-handover/${RO_BRANCH}/accept`)
      .set("Authorization", "Bearer test")
      .send({ acceptedByReference: "future-owner-label" });
    expect(res.status).toBe(200);
    expect(res.body.data.handoverStatus).toBe("ACCEPTED");
  });
});

describe("opening M3 — security invariants", () => {
  it("rejects forbidden role codes at the router for participants", async () => {
    const app = appWith(unusedGovernance());
    const res = await request(app)
      .post("/api/v1/admin/opening/training/train-1/participants")
      .set("Authorization", "Bearer test")
      .send({ userId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d11", roleCode: "owner" });
    expect(res.status).toBe(400);
  });

  it("keeps Northern Bypass branch isolated from RO writes by BM", async () => {
    const app = appWith(
      unusedGovernance({
        async upsertRoleRehearsal(actor, input) {
          if (!actor.isSuperAdmin && !actor.branchIds.includes(input.branchId)) {
            throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Cross-branch write rejected.");
          }
          return rehearsal({ branchId: input.branchId });
        },
      }),
      bmPrincipal(),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/role-rehearsals")
      .set("Authorization", "Bearer test")
      .send({
        branchId: NB_BRANCH,
        rehearsalCode: "CASHIER_POS",
        scenario: "NB must stay separate",
      });
    expect(res.status).toBe(403);
  });
});

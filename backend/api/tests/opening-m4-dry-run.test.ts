import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import { ApiError } from "../src/common/http.js";
import {
  decryptHandoverPayload,
  fingerprintPassword,
  fingerprintsMatch,
  generateSecureTempPassword,
  type DryRunEvidenceRecord,
  type DryRunSessionRecord,
  type LiveConfigSnapshotRecord,
  type OpeningDryRunService,
  type StaffSeedRunRecord,
  writeEncryptedHandoverFiles,
  loadAndDecryptHandover,
  ROYAL_ORCHARD_SEED_ROLES,
  type EncryptedHandoverPackage,
} from "../src/services/opening/dry-run.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
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

function seedRun(overrides: Partial<StaffSeedRunRecord> = {}): StaffSeedRunRecord {
  return {
    id: "seed-1",
    branchId: RO_BRANCH,
    runStatus: "SIMULATED_LOCAL",
    environmentMode: "LOCAL_SIMULATION",
    productionApplyAuthorized: false,
    seedScriptHash: "abc",
    handoverFileHash: "def",
    handoverCipherPath: "C:/tmp/handover.json",
    keyFilePathHint: "C:/tmp/key",
    localTestOnly: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function liveConfig(overrides: Partial<LiveConfigSnapshotRecord> = {}): LiveConfigSnapshotRecord {
  return {
    id: "cfg-1",
    branchId: RO_BRANCH,
    snapshotStatus: "CAPTURED",
    timezone: "Asia/Karachi",
    operatingHoursStart: "10:00",
    operatingHoursEnd: "02:30",
    serviceModes: ["dine-in", "takeaway", "delivery"],
    paymentMethods: { CASH: { enabled: true } },
    notificationChannels: { EMAIL: { mode: "MOCK_ONLY" } },
    deviceRecords: { POS_DEVICE: { status: "DOCUMENTED" } },
    localTestOnly: true,
    snapshotHash: "hash",
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

function dryRun(overrides: Partial<DryRunSessionRecord> = {}): DryRunSessionRecord {
  return {
    id: "dry-1",
    branchId: RO_BRANCH,
    sessionStatus: "IN_PROGRESS",
    result: "NOT_ASSESSED",
    simulatedOrderId: null,
    simulatedTicketId: null,
    simulatedDeliveryId: null,
    readinessPercentage: null,
    localTestOnly: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function evidence(overrides: Partial<DryRunEvidenceRecord> = {}): DryRunEvidenceRecord {
  return {
    id: "ev-1",
    dryRunId: "dry-1",
    branchId: RO_BRANCH,
    evidenceHash: "evhash",
    decision: "GO",
    decidedAt: new Date().toISOString(),
    readinessPercentage: null,
    logHash: "loghash",
    localTestOnly: true,
    northernBypassUnchanged: true,
    branchStatusUnchanged: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function unusedDryRun(overrides: Partial<OpeningDryRunService> = {}): OpeningDryRunService {
  const base: OpeningDryRunService = {
    async listStaffSeedRuns() {
      return [];
    },
    async simulateLocalStaffSeed() {
      throw new Error("unused");
    },
    async requestProductionSeedAuthorization() {
      throw new Error("unused");
    },
    async recordFirstLogin() {
      throw new Error("unused");
    },
    async recordPasswordChanged() {
      throw new Error("unused");
    },
    async captureLiveConfigSnapshot() {
      throw new Error("unused");
    },
    async listLiveConfigSnapshots() {
      return [];
    },
    async startDryRun() {
      throw new Error("unused");
    },
    async recordDryRunStep() {
      throw new Error("unused");
    },
    async completeDryRunSimulation() {
      throw new Error("unused");
    },
    async recordDryRunFounderDecision() {
      throw new Error("unused");
    },
    async listDryRuns() {
      return [];
    },
    async getDryRunEvidence() {
      return null;
    },
  };
  return { ...base, ...overrides };
}

function appWith(svc: OpeningDryRunService, p: AuthPrincipal = principal()) {
  return createApp(readyEnv, {
    authTokenVerifier: verifier(p.authUserId, p.email ?? "x@example.com"),
    authProfileRepository: authRepo(p),
    openingDryRun: svc,
  }).app;
}

describe("opening M4 — password + handover security", () => {
  it("generates strong temporary passwords", () => {
    const password = generateSecureTempPassword(20);
    expect(password.length).toBeGreaterThanOrEqual(16);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*\-_=+]/);
    expect(fingerprintsMatch(password, fingerprintPassword(password))).toBe(true);
  });

  it("encrypts and decrypts handover packages with expiry", () => {
    const dir = mkdtempSync(join(tmpdir(), "m4-handover-"));
    const keyDir = mkdtempSync(join(tmpdir(), "m4-keys-"));
    try {
      const password = generateSecureTempPassword(18);
      const written = writeEncryptedHandoverFiles({
        handoverDir: dir,
        keyDir,
        payload: {
          accounts: [{ email: "cashier.royalorchard.local@telepizza.test", roleCode: "cashier", tempPassword: password }],
        },
      });
      const fileBody = readFileSync(written.handoverCipherPath, "utf8");
      expect(fileBody).not.toContain(password);
      expect(fileBody).not.toMatch(/tempPassword":"[^"]{8,}/);
      const decrypted = loadAndDecryptHandover(written.handoverCipherPath, written.keyFilePath) as {
        accounts: Array<{ tempPassword: string }>;
      };
      expect(decrypted.accounts[0]?.tempPassword).toBe(password);

      const pkg = JSON.parse(fileBody) as EncryptedHandoverPackage;
      pkg.expiresAt = new Date(Date.now() - 1000).toISOString();
      expect(() =>
        decryptHandoverPayload(pkg, Buffer.from(readFileSync(written.keyFilePath, "utf8"), "base64")),
      ).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(keyDir, { recursive: true, force: true });
    }
  });

  it("seeds eight canonical Royal Orchard roles only", () => {
    expect(ROYAL_ORCHARD_SEED_ROLES).toHaveLength(8);
    const codes = ROYAL_ORCHARD_SEED_ROLES.map((r) => r.roleCode);
    expect(codes).toEqual([
      "super-admin",
      "branch-manager",
      "kitchen",
      "cashier",
      "rider",
      "customer-support",
      "host",
      "waiter",
    ]);
    expect(codes).not.toContain("owner");
    expect(codes).not.toContain("founder");
  });
});

describe("opening M4 — staff seed APIs", () => {
  it("simulates local staff seed without returning passwords", async () => {
    const app = appWith(
      unusedDryRun({
        async simulateLocalStaffSeed() {
          return {
            run: seedRun(),
            accountCount: 8,
            handoverCipherPath: "D:/telepizza-private/release-artifacts/staff-handover/royal-orchard-staff.json",
            keyFilePath: "D:/telepizza-private/release-artifacts/staff-handover/founder-keys/royal-orchard-staff.json.key",
            passwordsReturned: false,
          };
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/staff-seed/simulate-local")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        handoverDir: "D:/telepizza-private/release-artifacts/staff-handover",
        keyDir: "D:/telepizza-private/release-artifacts/staff-handover/founder-keys",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.passwordsReturned).toBe(false);
    expect(res.body.data.accountCount).toBe(8);
    expect(JSON.stringify(res.body)).not.toMatch(/tempPassword|password":\s*"[^"]{8,}/i);
  });

  it("blocks Production seed authorization in this delivery", async () => {
    const app = appWith(
      unusedDryRun({
        async requestProductionSeedAuthorization() {
          throw new ApiError(
            403,
            "OPENING_M4_PRODUCTION_AUTHORIZATION_BLOCKER",
            "Production staff seeding is blocked.",
          );
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/staff-seed/seed-1/request-production-auth")
      .set("Authorization", "Bearer test")
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe("OPENING_M4_PRODUCTION_AUTHORIZATION_BLOCKER");
  });

  it("lists seed runs for a branch", async () => {
    const app = appWith(
      unusedDryRun({
        async listStaffSeedRuns() {
          return [seedRun()];
        },
      }),
    );
    const res = await request(app)
      .get(`/api/v1/admin/opening/staff-seed/runs?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data[0].localTestOnly).toBe(true);
  });
});

describe("opening M4 — live configuration", () => {
  it("captures Asia/Karachi live-config snapshot with CASH-only dry-run payments", async () => {
    const app = appWith(
      unusedDryRun({
        async captureLiveConfigSnapshot() {
          return liveConfig();
        },
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/live-config/snapshot")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH });
    expect(res.status).toBe(201);
    expect(res.body.data.timezone).toBe("Asia/Karachi");
    expect(res.body.data.operatingHoursStart).toBe("10:00");
    expect(res.body.data.operatingHoursEnd).toBe("02:30");
  });

  it("lists live config snapshots", async () => {
    const app = appWith(
      unusedDryRun({
        async listLiveConfigSnapshots() {
          return [liveConfig()];
        },
      }),
    );
    const res = await request(app)
      .get(`/api/v1/admin/opening/live-config?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("opening M4 — GO/NO-GO dry run", () => {
  it("starts dry-run and records steps", async () => {
    const app = appWith(
      unusedDryRun({
        async startDryRun() {
          return dryRun();
        },
        async recordDryRunStep(_a, _id, input) {
          return dryRun({
            simulatedOrderId:
              input.stepCode === "CASHIER_CREATE_TEST_ORDER" ? "local-order-1" : null,
            simulatedTicketId: input.stepCode === "KITCHEN_ACCEPT_TICKET" ? "local-ticket-1" : null,
            simulatedDeliveryId:
              input.stepCode === "RIDER_ACCEPT_DELIVERY" ? "local-delivery-1" : null,
          });
        },
        async completeDryRunSimulation() {
          return dryRun({
            sessionStatus: "COMPLETED",
            result: "PASS",
            localTestOnly: true,
            completedAt: new Date().toISOString(),
          });
        },
      }),
    );
    const start = await request(app)
      .post("/api/v1/admin/opening/dry-runs")
      .set("Authorization", "Bearer test")
      .send({ branchId: RO_BRANCH });
    expect(start.status).toBe(201);

    const step = await request(app)
      .post("/api/v1/admin/opening/dry-runs/dry-1/steps")
      .set("Authorization", "Bearer test")
      .send({
        stepCode: "CASHIER_CREATE_TEST_ORDER",
        stepStatus: "PASSED",
        screenshotHash: "sha256:demo",
      });
    expect(step.status).toBe(200);
    expect(step.body.data.simulatedOrderId).toBe("local-order-1");

    const complete = await request(app)
      .post("/api/v1/admin/opening/dry-runs/dry-1/complete")
      .set("Authorization", "Bearer test")
      .send({});
    expect(complete.status).toBe(200);
    expect(complete.body.data.localTestOnly).toBe(true);
  });

  it("requires notes for NO_GO and records immutable GO evidence", async () => {
    const app = appWith(
      unusedDryRun({
        async recordDryRunFounderDecision(_a, _id, input) {
          if (input.decision === "NO_GO" && !input.notes?.trim()) {
            throw new ApiError(400, "NOTES_REQUIRED", "NO_GO requires notes.");
          }
          return evidence({ decision: input.decision, localTestOnly: true });
        },
      }),
    );
    const noGo = await request(app)
      .post("/api/v1/admin/opening/dry-runs/dry-1/founder-decision")
      .set("Authorization", "Bearer test")
      .send({ decision: "NO_GO" });
    expect(noGo.status).toBe(400);

    const go = await request(app)
      .post("/api/v1/admin/opening/dry-runs/dry-1/founder-decision")
      .set("Authorization", "Bearer test")
      .send({ decision: "GO", notes: "Local dry-run accepted" });
    expect(go.status).toBe(201);
    expect(go.body.data.evidenceHash).toBeTruthy();
    expect(go.body.data.branchStatusUnchanged).toBe(true);
    expect(go.body.data.northernBypassUnchanged).toBe(true);
  });

  it("rejects branch-manager Founder dry-run decision", async () => {
    const app = appWith(
      unusedDryRun({
        async recordDryRunFounderDecision(actor) {
          if (!actor.isSuperAdmin) {
            throw new ApiError(403, "SUPER_ADMIN_REQUIRED", "Only super-admin may decide.");
          }
          return evidence();
        },
      }),
      principal({
        userId: "bm",
        authUserId: "bm-auth",
        email: "bm@example.com",
        isSuperAdmin: false,
        roles: ["branch-manager"],
        branchIds: [RO_BRANCH],
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/dry-runs/dry-1/founder-decision")
      .set("Authorization", "Bearer test")
      .send({ decision: "GO" });
    expect(res.status).toBe(403);
  });

  it("keeps Northern Bypass isolated from RO BM writes", async () => {
    const app = appWith(
      unusedDryRun({
        async startDryRun(actor, input) {
          if (!actor.isSuperAdmin && !actor.branchIds.includes(input.branchId)) {
            throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Cross-branch write rejected.");
          }
          return dryRun({ branchId: input.branchId });
        },
      }),
      principal({
        userId: "bm",
        authUserId: "bm-auth",
        email: "bm@example.com",
        isSuperAdmin: false,
        roles: ["branch-manager"],
        branchIds: [RO_BRANCH],
      }),
    );
    const res = await request(app)
      .post("/api/v1/admin/opening/dry-runs")
      .set("Authorization", "Bearer test")
      .send({ branchId: NB_BRANCH });
    expect(res.status).toBe(403);
  });
});

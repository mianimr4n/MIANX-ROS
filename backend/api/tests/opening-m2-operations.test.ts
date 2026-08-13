import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import { ApiError } from "../src/common/http.js";
import {
  providerStatusForNotificationUpsert,
  type OpeningOperationsService,
  type PaymentMethodRecord,
  type CashProcedureRecord,
  type NotificationChannelRecord,
  type DeviceVerificationRecord,
  type PaymentProviderRecord,
  type CardTerminalRecord,
} from "../src/services/opening/operations.js";
import { isCurrentVerified } from "../src/services/branches/readiness.js";

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

function paymentMethod(overrides: Partial<PaymentMethodRecord> = {}): PaymentMethodRecord {
  return {
    id: "pm-1",
    branchId: RO_BRANCH,
    methodCode: "CASH",
    displayName: "Cash",
    enabled: true,
    configurationStatus: "CONFIGURED",
    verificationStatus: "CONFIGURED",
    verifiedBy: null,
    verifiedAt: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function cashProcedure(overrides: Partial<CashProcedureRecord> = {}): CashProcedureRecord {
  return {
    id: "cash-1",
    branchId: RO_BRANCH,
    procedureDocumented: true,
    procedureReviewed: true,
    cashDrawerProcessApproved: true,
    shiftReconciliationApproved: true,
    discrepancyEscalationDefined: true,
    documentationStatus: "REVIEWED",
    approvedBy: null,
    approvedAt: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function notif(overrides: Partial<NotificationChannelRecord> = {}): NotificationChannelRecord {
  return {
    id: "nc-1",
    branchId: RO_BRANCH,
    purposeCode: "CUSTOMER_ORDER",
    channelCode: "WHATSAPP",
    enabled: true,
    providerName: "mock-local",
    providerStatus: "CONFIGURED",
    destinationReference: "branch:+92300***",
    testStatus: "NOT_TESTED",
    localTestOnly: false,
    testedBy: null,
    testedAt: null,
    failureReason: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function device(overrides: Partial<DeviceVerificationRecord> = {}): DeviceVerificationRecord {
  return {
    id: "dev-1",
    branchId: RO_BRANCH,
    deviceType: "POS_DEVICE",
    deviceLabel: "Front POS",
    location: "Counter",
    verificationStatus: "NOT_VERIFIED",
    evidenceType: null,
    evidenceSummary: null,
    serialOrAssetReference: null,
    verifiedBy: null,
    verifiedAt: null,
    expiresAt: null,
    recheckDueAt: null,
    failureReason: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function unusedOpeningOps(overrides: Partial<OpeningOperationsService> = {}): OpeningOperationsService {
  const base: OpeningOperationsService = {
    async listPaymentMethods() {
      return [];
    },
    async upsertPaymentMethod() {
      throw new Error("unused");
    },
    async setPaymentMethodEnabled() {
      throw new Error("unused");
    },
    async listProviderVerifications() {
      return [];
    },
    async upsertProviderVerification() {
      throw new Error("unused");
    },
    async recordProviderVerification() {
      throw new Error("unused");
    },
    async recordProviderFailure() {
      throw new Error("unused");
    },
    async listCardTerminals() {
      return [];
    },
    async recordCardTerminalVerification() {
      throw new Error("unused");
    },
    async recordCardTerminalFailure() {
      throw new Error("unused");
    },
    async getCashProcedure() {
      return null;
    },
    async upsertCashProcedure() {
      throw new Error("unused");
    },
    async approveCashProcedure() {
      throw new Error("unused");
    },
    async listNotificationChannels() {
      return [];
    },
    async upsertNotificationChannel() {
      throw new Error("unused");
    },
    async recordNotificationLocalTest() {
      throw new Error("unused");
    },
    async recordNotificationVerified() {
      throw new Error("unused");
    },
    async recordNotificationFailure() {
      throw new Error("unused");
    },
    async listDevices() {
      return [];
    },
    async upsertDevice() {
      throw new Error("unused");
    },
    async recordDeviceVerification() {
      throw new Error("unused");
    },
    async recordDeviceFailure() {
      throw new Error("unused");
    },
    async removeDevice() {
      throw new Error("unused");
    },
    async markDeviceExpired() {
      throw new Error("unused");
    },
    async listMissingRequiredDeviceTypes() {
      return [];
    },
  };
  return { ...base, ...overrides };
}

describe("opening M2 — notification upsert status honesty", () => {
  it("preserves Production VERIFIED when re-saving an enabled channel", () => {
    expect(
      providerStatusForNotificationUpsert({ enabled: true, existingStatus: "VERIFIED" }),
    ).toBeNull();
    expect(
      providerStatusForNotificationUpsert({
        enabled: true,
        existingStatus: "VERIFICATION_REQUIRED",
      }),
    ).toBeNull();
    expect(
      providerStatusForNotificationUpsert({ enabled: true, existingStatus: "CONFIGURED" }),
    ).toBeNull();
  });

  it("sets CONFIGURED only for create or re-enable from NOT_CONFIGURED", () => {
    expect(
      providerStatusForNotificationUpsert({ enabled: true, existingStatus: null }),
    ).toBe("CONFIGURED");
    expect(
      providerStatusForNotificationUpsert({ enabled: true, existingStatus: "NOT_CONFIGURED" }),
    ).toBe("CONFIGURED");
  });

  it("clears to NOT_CONFIGURED on disable", () => {
    expect(
      providerStatusForNotificationUpsert({ enabled: false, existingStatus: "VERIFIED" }),
    ).toBe("NOT_CONFIGURED");
  });
});

describe("opening M2 — payment method APIs", () => {
  it("rejects forbidden payment method codes", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps(),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/payment-methods")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        methodCode: "CRYPTO",
        displayName: "Crypto",
        enabled: true,
      });
    expect(res.status).toBe(400);
  });

  it("lists payment methods for assigned branch", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async listPaymentMethods() {
          return [paymentMethod()];
        },
      }),
    });

    const res = await request(app)
      .get(`/api/v1/admin/opening/payment-methods?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data[0].methodCode).toBe("CASH");
    expect(JSON.stringify(res.body)).not.toMatch(/api[_-]?key|password|cvv|access_token/i);
  });

  it("rejects branch-manager cross-branch write", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-bm", "bm@example.com"),
      authProfileRepository: authRepo(
        principal({
          userId: "user-bm",
          isSuperAdmin: false,
          roles: ["branch-manager"],
          branchIds: [RO_BRANCH],
          permissions: ["branch.manage"],
        }),
      ),
      openingOperations: unusedOpeningOps({
        async upsertPaymentMethod(actor, input) {
          if (!actor.isSuperAdmin && !actor.branchIds.includes(input.branchId)) {
            throw new ApiError(403, "BRANCH_FORBIDDEN", "Cross-branch write rejected.");
          }
          return paymentMethod({ branchId: input.branchId, methodCode: input.methodCode });
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/payment-methods")
      .set("Authorization", "Bearer test")
      .send({
        branchId: NB_BRANCH,
        methodCode: "CASH",
        displayName: "Cash",
        enabled: true,
      });
    expect(res.status).toBe(403);
  });

  it("surfaces duplicate method conflict as 409", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async upsertPaymentMethod() {
          throw new ApiError(409, "PAYMENT_METHOD_EXISTS", "Duplicate active method.");
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/payment-methods")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        methodCode: "CARD",
        displayName: "Card",
        enabled: true,
      });
    expect(res.status).toBe(409);
  });
});

describe("opening M2 — cash procedure + provider", () => {
  it("super-admin can approve cash procedure", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async approveCashProcedure() {
          return cashProcedure({
            documentationStatus: "VERIFIED_ONSITE",
            approvedBy: "user-founder",
            approvedAt: new Date().toISOString(),
          });
        },
      }),
    });

    const res = await request(app)
      .post(`/api/v1/admin/opening/cash-procedure/${RO_BRANCH}/approve`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data.documentationStatus).toBe("VERIFIED_ONSITE");
  });

  it("branch-manager cannot approve cash procedure", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-bm", "bm@example.com"),
      authProfileRepository: authRepo(
        principal({
          userId: "user-bm",
          isSuperAdmin: false,
          roles: ["branch-manager"],
          branchIds: [RO_BRANCH],
        }),
      ),
      openingOperations: unusedOpeningOps({
        async approveCashProcedure(actor) {
          if (!actor.isSuperAdmin) {
            throw new ApiError(403, "FOUNDER_APPROVAL_REQUIRED", "Founder required");
          }
          return cashProcedure({ documentationStatus: "VERIFIED_ONSITE" });
        },
      }),
    });

    const res = await request(app)
      .post(`/api/v1/admin/opening/cash-procedure/${RO_BRANCH}/approve`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(403);
  });

  it("records provider failure without secrets", async () => {
    const provider: PaymentProviderRecord = {
      id: "prov-1",
      branchId: RO_BRANCH,
      paymentMethodId: "pm-1",
      providerName: "Stripe",
      providerEnvironment: "TEST",
      providerStatus: "FAILED",
      terminalRequired: true,
      terminalVerified: false,
      verificationMethod: "manual",
      verificationSummary: null,
      verifiedBy: null,
      verifiedAt: null,
      expiresAt: null,
      failureReason: "Terminal offline",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async recordProviderFailure() {
          return provider;
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/payment-providers/prov-1/fail")
      .set("Authorization", "Bearer test")
      .send({ reason: "Terminal offline" });
    expect(res.status).toBe(200);
    expect(res.body.data.providerStatus).toBe("FAILED");
    expect(JSON.stringify(res.body)).not.toMatch(/sk_live|api_key|password/i);
  });
});

describe("opening M2 — notifications", () => {
  it("records local notification test as local-only", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async recordNotificationLocalTest() {
          return notif({
            testStatus: "PASSED",
            localTestOnly: true,
            testedBy: "user-founder",
            testedAt: new Date().toISOString(),
            providerStatus: "CONFIGURED",
          });
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/notification-channels/nc-1/local-test")
      .set("Authorization", "Bearer test")
      .send({ passed: true });
    expect(res.status).toBe(200);
    expect(res.body.data.localTestOnly).toBe(true);
    expect(res.body.data.testStatus).toBe("PASSED");
    expect(res.body.data.providerStatus).not.toBe("VERIFIED");
  });

  it("rejects unauthorized cashier notification write", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          userId: "user-cashier",
          isSuperAdmin: false,
          roles: ["cashier"],
          branchIds: [RO_BRANCH],
          permissions: [],
        }),
      ),
      openingOperations: unusedOpeningOps({
        async upsertNotificationChannel(actor) {
          if (!actor.isSuperAdmin && !actor.roles.includes("branch-manager")) {
            throw new ApiError(403, "FORBIDDEN", "Cashiers cannot configure notifications.");
          }
          return notif();
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/notification-channels")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        purposeCode: "CUSTOMER_ORDER",
        channelCode: "SMS",
        enabled: true,
      });
    expect(res.status).toBe(403);
  });
});

describe("opening M2 — devices", () => {
  it("lists missing required device types", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async listMissingRequiredDeviceTypes() {
          return ["POS_DEVICE", "KDS_DEVICE", "BACKUP_INTERNET"];
        },
      }),
    });

    const res = await request(app)
      .get(`/api/v1/admin/opening/devices/missing?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data).toContain("POS_DEVICE");
    expect(res.body.data).toContain("BACKUP_INTERNET");
  });

  it("records onsite device verification", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async recordDeviceVerification() {
          return device({
            verificationStatus: "VERIFIED",
            evidenceType: "ONSITE_CHECK",
            evidenceSummary: "POS boots and prints smoke ticket",
            verifiedBy: "user-founder",
            verifiedAt: new Date().toISOString(),
          });
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/devices/dev-1/verify")
      .set("Authorization", "Bearer test")
      .send({
        evidenceType: "ONSITE_CHECK",
        evidenceSummary: "POS boots and prints smoke ticket",
      });
    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe("VERIFIED");
    expect(res.body.data.evidenceType).toBe("ONSITE_CHECK");
  });

  it("removes device from active inventory (NOT_APPLICABLE), not FAILED", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async removeDevice() {
          return device({
            verificationStatus: "NOT_APPLICABLE",
            failureReason: "Removed from opening device inventory",
          });
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/devices/dev-1/remove")
      .set("Authorization", "Bearer test");
    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe("NOT_APPLICABLE");
    expect(res.body.data.verificationStatus).not.toBe("FAILED");
  });

  it("rejects Northern Bypass cross-branch device mutation for BM", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-bm", "bm@example.com"),
      authProfileRepository: authRepo(
        principal({
          userId: "user-bm",
          isSuperAdmin: false,
          roles: ["branch-manager"],
          branchIds: [RO_BRANCH],
        }),
      ),
      openingOperations: unusedOpeningOps({
        async upsertDevice(actor, input) {
          if (!actor.isSuperAdmin && !actor.branchIds.includes(input.branchId)) {
            throw new ApiError(403, "BRANCH_FORBIDDEN", "Northern Bypass isolation");
          }
          return device({ branchId: input.branchId });
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/devices")
      .set("Authorization", "Bearer test")
      .send({
        branchId: NB_BRANCH,
        deviceType: "POS_DEVICE",
        deviceLabel: "NB POS",
      });
    expect(res.status).toBe(403);
  });
});

describe("opening M2 — readiness helpers", () => {
  it("LOCAL_TEST_ONLY evidence does not count as current verified", () => {
    expect(isCurrentVerified("VERIFIED", null, "LOCAL_TEST_ONLY")).toBe(false);
  });

  it("expired verification does not count", () => {
    expect(isCurrentVerified("VERIFIED", "2020-01-01T00:00:00.000Z", "ONSITE_CHECK")).toBe(false);
  });

  it("current onsite verification counts", () => {
    expect(isCurrentVerified("VERIFIED", null, "ONSITE_CHECK")).toBe(true);
  });

  it("failed status does not count", () => {
    expect(isCurrentVerified("FAILED", null, "ONSITE_CHECK")).toBe(false);
  });
});

describe("opening M2 — card terminal", () => {
  it("records card terminal verification", async () => {
    const terminal: CardTerminalRecord = {
      id: "term-1",
      branchId: RO_BRANCH,
      terminalLabel: "Counter terminal",
      terminalProvider: "HBL",
      physicalLocation: "Front counter",
      verificationResult: "VERIFIED",
      verificationNote: "Tap and chip OK",
      evidenceType: "ONSITE_CHECK",
      verifiedBy: "user-founder",
      verifiedAt: new Date().toISOString(),
      recheckDueAt: null,
      failureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      openingOperations: unusedOpeningOps({
        async recordCardTerminalVerification() {
          return terminal;
        },
      }),
    });

    const res = await request(app)
      .post("/api/v1/admin/opening/card-terminals")
      .set("Authorization", "Bearer test")
      .send({
        branchId: RO_BRANCH,
        terminalLabel: "Counter terminal",
        terminalProvider: "HBL",
        physicalLocation: "Front counter",
        evidenceType: "ONSITE_CHECK",
        verificationNote: "Tap and chip OK",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.verificationResult).toBe("VERIFIED");
  });
});

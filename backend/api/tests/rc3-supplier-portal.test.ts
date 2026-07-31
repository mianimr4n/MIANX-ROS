import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  createSupplierPortalService,
  SUPPLIER_RESPONSE_TYPES,
} from "../src/services/supplier-portal/management.js";

const here = dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(
  join(here, "../src/services/supplier-portal/management.ts"),
  "utf8",
);

describe("supplier portal response contracts", () => {
  it("exposes acknowledge/accept/amend/reject only", () => {
    expect(SUPPLIER_RESPONSE_TYPES).toEqual([
      "acknowledge",
      "accept",
      "request_amendment",
      "reject",
    ]);
  });

  it("factory returns service methods for portal + admin", () => {
    const envStatus = {
      isReady: false,
      config: {
        port: 4000,
        corsOrigin: "http://localhost:3000",
        jwtSecret: "x".repeat(32),
        supabaseUrl: "",
        supabaseAnonKey: "",
        supabaseServiceRoleKey: "",
        envClass: "test" as const,
        emailMode: "disabled" as const,
        whatsappMode: "disabled" as const,
        paymentMode: "disabled" as const,
        webhookMode: "disabled" as const,
      },
      issues: [],
      safetyBlockers: [],
    };
    const service = createSupplierPortalService(envStatus);
    expect(typeof service.resolveContext).toBe("function");
    expect(typeof service.respondToOrder).toBe("function");
    expect(typeof service.provisionPortalUser).toBe("function");
    expect(typeof service.getSupplierAttention).toBe("function");
    expect(typeof service.replaceOrderLines).toBe("function");
  });

  it("does not claim supplier delivery as internal GRN acceptance", () => {
    expect(serviceSource).toMatch(/delivered_pending_grn/);
    expect(serviceSource).toMatch(/grantsInternalApproval: false/);
    expect(serviceSource).not.toMatch(/createReceiving\(/);
  });
});

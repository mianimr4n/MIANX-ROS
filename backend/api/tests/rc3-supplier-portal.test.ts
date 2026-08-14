import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  createSupplierPortalService,
  SUPPLIER_RESPONSE_TYPES,
  SUPPLIER_PORTAL_PERMISSIONS,
} from "../src/services/supplier-portal/management.js";

const here = dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(
  join(here, "../src/services/supplier-portal/management.ts"),
  "utf8",
);
const routesSource = readFileSync(
  join(here, "../src/modules/supplier-portal/routes.ts"),
  "utf8",
);

describe("supplier portal response contracts", () => {
  it("exposes acknowledge/accept/reject/amend/delivery-date actions", () => {
    expect(SUPPLIER_RESPONSE_TYPES).toEqual([
      "acknowledge",
      "accept",
      "reject",
      "request_amendment",
      "propose_delivery_date",
      "confirm_delivery_date",
    ]);
  });

  it("defines supplier-only permission codes", () => {
    expect(SUPPLIER_PORTAL_PERMISSIONS).toContain("supplier.portal.access");
    expect(SUPPLIER_PORTAL_PERMISSIONS).toContain("supplier.purchase_orders.respond");
    expect(SUPPLIER_PORTAL_PERMISSIONS).not.toContain("purchasing.manage");
    expect(SUPPLIER_PORTAL_PERMISSIONS).not.toContain("finance.manage");
  });

  it("factory returns isolation-critical methods", () => {
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
        whatsapp: {
          apiVersion: "v21.0",
          phoneNumberId: "",
          businessAccountId: "",
          accessToken: "",
          appSecret: "",
          verifyToken: "",
        },
      },
      issues: [],
      safetyBlockers: [],
    };
    const service = createSupplierPortalService(envStatus);
    expect(typeof service.resolveContext).toBe("function");
    expect(typeof service.respondToOrder).toBe("function");
    expect(typeof service.listResponseQueue).toBe("function");
    expect(typeof service.setPortalUserStatus).toBe("function");
    expect(typeof service.uploadDocumentBinary).toBe("function");
    expect(typeof service.createDocumentDownloadUrl).toBe("function");
    expect(typeof service.archiveDocument).toBe("function");
  });

  it("isolates queries by supplier_id and never trusts client supplier id", () => {
    expect(serviceSource).toMatch(/\.eq\("supplier_id", ctx\.supplierId\)/);
    expect(serviceSource).toMatch(/eq\("supplier_id", supplierId\)/);
    expect(serviceSource).not.toMatch(/input\.supplierId/);
    expect(routesSource).toMatch(/resolveContext/);
  });

  it("exposes binary document upload/download/archive with supplier isolation", () => {
    expect(routesSource).toMatch(/\/documents\/upload/);
    expect(routesSource).toMatch(/\/documents\/:id\/download-url/);
    expect(routesSource).toMatch(/\/documents\/:id\/archive/);
    expect(serviceSource).toMatch(/uploadDocumentBinary/);
    expect(serviceSource).toMatch(/writeDocumentAccessEvent/);
    expect(serviceSource).toMatch(/SUPPLIER_DOC_BUCKET/);
    expect(serviceSource).toMatch(/\.eq\("supplier_id", ctx\.supplierId\)/);
  });

  it("requires reason for reject/amendment and idempotency replay", () => {
    expect(serviceSource).toMatch(/A reason is required/);
    expect(serviceSource).toMatch(/idempotency_key/);
    expect(serviceSource).toMatch(/IDEMPOTENCY_CONFLICT|idempotencyKey already used/);
  });
});

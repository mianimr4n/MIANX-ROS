import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const foundation = readFileSync(
  join(root, "supabase/migrations/20260731120000_supplier_portal_foundation.sql"),
  "utf8",
);
const hardening = readFileSync(
  join(root, "supabase/migrations/20260731130000_supplier_portal_hardening.sql"),
  "utf8",
);
const service = readFileSync(
  join(root, "backend/api/src/services/supplier-portal/management.ts"),
  "utf8",
);
const routes = readFileSync(
  join(root, "backend/api/src/modules/supplier-portal/routes.ts"),
  "utf8",
);

describe("RC3 supplier portal migrations and contracts", () => {
  it("applies foundation before hardening (migration order)", () => {
    assert.ok("20260731120000" < "20260731130000");
    assert.match(foundation, /supplier_portal_users/);
    assert.match(hardening, /uq_po_responses_idempotency/);
  });

  it("seeds granular supplier permissions without staff grants", () => {
    assert.match(hardening, /supplier\.portal\.access/);
    assert.match(hardening, /supplier\.purchase_orders\.respond/);
    assert.match(hardening, /supplier\.documents\.create/);
    assert.doesNotMatch(hardening, /purchasing\.manage.*supplier/);
    assert.doesNotMatch(hardening, /finance\.manage.*role_permissions[\s\S]*supplier/);
  });

  it("enforces portal-user lifecycle and active-only RLS helper", () => {
    assert.match(hardening, /'invited'/);
    assert.match(hardening, /'suspended'/);
    assert.match(hardening, /'deactivated'/);
    assert.match(hardening, /spu\.status = 'active'/);
  });

  it("adds response idempotency and delivery-date actions", () => {
    assert.match(hardening, /idempotency_key/);
    assert.match(hardening, /propose_delivery_date/);
    assert.match(hardening, /confirm_delivery_date/);
    assert.match(service, /IDEMPOTENCY_CONFLICT|idempotencyKey/);
    assert.match(service, /PO_NOT_OPEN_FOR_RESPONSE/);
  });

  it("forbids supplier self-approval and keeps GRN staff-owned", () => {
    assert.match(routes, /SUPPLIER_CANNOT_APPROVE_PO/);
    assert.match(routes, /\/orders\/:id\/acknowledge/);
    assert.match(routes, /\/orders\/:id\/reject/);
    assert.match(service, /grantsInternalApproval: false/);
    assert.doesNotMatch(service, /createReceiving\(/);
  });

  it("documents binary upload as unavailable (URL references only)", () => {
    assert.match(hardening, /Binary upload infrastructure Coming Soon/);
    assert.match(service, /fileUrl must be an http\(s\) URL/);
  });
});

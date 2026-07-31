import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260731120000_supplier_portal_foundation.sql"),
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
const modules = readFileSync(join(root, "backend/api/src/modules/index.ts"), "utf8");

describe("RC3 supplier portal migrations and contracts", () => {
  it("extends user_type with supplier and seeds portal permission", () => {
    assert.match(migration, /'supplier'/);
    assert.match(migration, /supplier\.portal/);
    assert.match(migration, /create table if not exists public\.supplier_portal_users/);
    assert.match(migration, /current_user_supplier_ids/);
  });

  it("adds PO lines, responses, documents, delivery refs, and audit events", () => {
    assert.match(migration, /purchase_order_lines/);
    assert.match(migration, /purchase_order_responses/);
    assert.match(migration, /supplier_documents/);
    assert.match(migration, /purchase_order_delivery_refs/);
    assert.match(migration, /supplier_portal_events/);
    assert.match(migration, /'acknowledge'/);
    assert.match(migration, /'request_amendment'/);
  });

  it("adds supplier-scoped RLS policies for PO isolation", () => {
    assert.match(migration, /Supplier select own purchase_orders/);
    assert.match(migration, /current_user_supplier_ids\(\)/);
    assert.match(migration, /enable row level security/);
  });

  it("wires supplier-portal module and forbids supplier self-approval", () => {
    assert.match(modules, /\/api\/v1\/supplier-portal/);
    assert.match(routes, /SUPPLIER_CANNOT_APPROVE_PO/);
    assert.match(service, /grantsInternalApproval: false/);
    assert.match(service, /PORTAL_VISIBLE_PO_STATUSES/);
    assert.doesNotMatch(service, /decision:\s*['"]approved['"].*supplier/i);
  });

  it("keeps performance metrics honest when data is incomplete", () => {
    assert.match(service, /onTimeDeliveryUnavailableReason/);
    assert.match(service, /quantityUnavailableReason/);
    assert.match(service, /onTimeDelivery: null/);
  });
});

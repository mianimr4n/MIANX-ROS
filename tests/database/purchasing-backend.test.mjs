import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730170000_purchasing_backend.sql"),
  "utf8",
);

describe("Purchasing backend migration", () => {
  it("creates suppliers and purchase_orders with required columns", () => {
    assert.match(migration, /create table if not exists public\.suppliers/);
    assert.match(migration, /create table if not exists public\.purchase_orders/);
    for (const col of [
      "branch_id",
      "name",
      "contact_person",
      "phone",
      "email",
      "address",
      "status",
    ]) {
      assert.match(migration, new RegExp(col));
    }
    for (const col of [
      "supplier_id",
      "po_number",
      "total_amount",
      "expected_delivery_date",
      "created_by",
    ]) {
      assert.match(migration, new RegExp(col));
    }
  });

  it("enables branch-scoped RLS and service_role grants", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(migration, /grant all on public\.suppliers to service_role/);
    assert.match(migration, /grant all on public\.purchase_orders to service_role/);
  });

  it("seeds purchasing.manage permission", () => {
    assert.match(migration, /purchasing\.manage/);
  });
});

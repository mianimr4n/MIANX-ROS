import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730180000_fix_purchasing_missing_tables.sql"),
  "utf8",
);

describe("Purchasing missing-tables fix migration", () => {
  it("ensures suppliers/purchase_orders and adds requisitions + goods_receiving", () => {
    assert.match(migration, /create table if not exists public\.suppliers/);
    assert.match(migration, /create table if not exists public\.purchase_orders/);
    assert.match(migration, /create table if not exists public\.purchase_requisitions/);
    assert.match(migration, /create table if not exists public\.goods_receiving/);
    for (const col of ["branch_id", "title", "requested_by", "grn_number", "purchase_order_id"]) {
      assert.match(migration, new RegExp(col));
    }
  });

  it("enables branch-scoped RLS and service_role grants", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(migration, /grant all on public\.purchase_requisitions to service_role/);
    assert.match(migration, /grant all on public\.goods_receiving to service_role/);
    assert.match(migration, /notify pgrst, 'reload schema'/);
  });
});

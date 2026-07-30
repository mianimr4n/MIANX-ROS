/**
 * Static assertions for procurement-loop approval migration.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730190000_complete_procurement_loop.sql"),
  "utf8",
);

describe("procurement loop approval migration", () => {
  it("adds rejected status and approval audit columns on purchase_orders", () => {
    assert.match(migration, /rejected/);
    assert.match(migration, /approved_by/);
    assert.match(migration, /approved_at/);
    assert.match(migration, /approval_notes/);
    assert.match(migration, /purchase_orders_status_check/);
  });
});

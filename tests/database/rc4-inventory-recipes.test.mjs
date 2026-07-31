/**
 * RC4-9 recipes static DB evidence.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("RC4-9 inventory recipes (database static)", () => {
  it("adds versioned recipes, consume/reverse events, COGS seam", () => {
    const sql = read("supabase/migrations/20260731180000_rc4_inventory_recipes_cogs.sql");
    assert.match(sql, /create table if not exists public\.inventory_recipes/);
    assert.match(sql, /uq_inventory_recipes_one_active/);
    assert.match(sql, /inventory_consumption_events/);
    assert.match(sql, /unique \(idempotency_key\)/);
    assert.match(sql, /inventory_reverse_kitchen_consumption_atomic/);
    assert.match(sql, /inventory_cogs_events/);
    assert.match(sql, /cogs_ready/);
    assert.match(sql, /'deferred'/);
    assert.match(sql, /posting_deferred_reason/);
    assert.doesNotMatch(sql, /create_journal_entry_atomic/);
  });

  it("keeps preparing as sole consume trigger in kitchen RPC", () => {
    const sql = read("supabase/migrations/20260731180000_rc4_inventory_recipes_cogs.sql");
    assert.match(sql, /kitchen_ticket_set_preparing_atomic/);
    assert.match(sql, /Sole consume trigger/);
  });
});

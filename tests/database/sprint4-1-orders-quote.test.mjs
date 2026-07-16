import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260716120000_sprint4_1_orders_quote_snapshots.sql"),
  "utf8",
);

test("sprint 4.1 migration adds idempotency, snapshots, and status logs", () => {
  assert.match(migration, /idempotency_key/i);
  assert.match(migration, /idempotency_request_hash/i);
  assert.match(migration, /contact_phone_e164/i);
  assert.match(migration, /pricing_snapshot/i);
  assert.match(migration, /extras_snapshot/i);
  assert.match(migration, /food_unit_price/i);
  assert.match(migration, /create table if not exists public\.order_status_logs/i);
  assert.match(migration, /uq_orders_idempotency_key/i);
});

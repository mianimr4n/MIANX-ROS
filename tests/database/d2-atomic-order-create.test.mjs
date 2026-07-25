/**
 * D2 — Atomic order creation migration contract (static).
 * Live rollback assertions require local Supabase + applied migration.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260725050000_d2_atomic_order_create.sql"),
  "utf8",
);

describe("D2 atomic order create migration", () => {
  it("defines create_order_atomic and next_order_number", () => {
    assert.match(migration, /create or replace function public\.create_order_atomic\(/);
    assert.match(migration, /create or replace function public\.next_order_number\(/);
    assert.match(migration, /create sequence if not exists public\.orders_number_seq/);
  });

  it("enforces operating branch and idempotency inside the function", () => {
    assert.match(migration, /BRANCH_NOT_OPERATIONAL/);
    assert.match(migration, /BRANCH_INACTIVE/);
    assert.match(migration, /IDEMPOTENCY_CONFLICT/);
    assert.match(migration, /idempotency_key/);
  });

  it("writes order items, modifiers, optional delivery, payment, kitchen ticket, and status log", () => {
    assert.match(migration, /insert into public\.order_items/);
    assert.match(migration, /insert into public\.order_item_modifiers/);
    assert.match(migration, /insert into public\.deliveries/);
    assert.match(migration, /insert into public\.payments/);
    assert.match(migration, /insert into public\.kitchen_tickets/);
    assert.match(migration, /insert into public\.kitchen_ticket_items/);
    assert.match(migration, /insert into public\.order_status_logs/);
  });

  it("is service_role only", () => {
    assert.match(migration, /grant execute on function public\.create_order_atomic/);
    assert.match(migration, /to service_role/);
    assert.match(migration, /revoke all on function public\.create_order_atomic/);
  });

  it("documents rollback notes without dropping business tables", () => {
    assert.match(migration, /Rollback notes/);
    assert.match(migration, /drop function if exists public\.create_order_atomic/);
    assert.doesNotMatch(migration, /drop table public\.orders/i);
  });
});

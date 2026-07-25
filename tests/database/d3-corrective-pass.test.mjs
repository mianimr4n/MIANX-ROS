/**
 * D3 corrective pass — static migration assertions
 * (timezone, settle_bill_payment_atomic, deposits, cancel tokens, worker columns).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260725110000_d3_corrective_timezone_payments_deposits.sql"),
  "utf8",
);

describe("D3 corrective timezone / payments / deposits migration", () => {
  it("adds branches.timezone with IANA shape check", () => {
    assert.match(migration, /add column if not exists timezone text/i);
    assert.match(migration, /chk_branches_timezone_shape/);
    assert.match(migration, /Asia\/Karachi/);
  });

  it("creates settle_bill_payment_atomic", () => {
    assert.match(migration, /create or replace function public\.settle_bill_payment_atomic/i);
  });

  it("creates reservation_deposits", () => {
    assert.match(migration, /create table if not exists public\.reservation_deposits/);
  });

  it("adds public booking cancellation token columns", () => {
    assert.match(migration, /cancellation_token_hash/);
    assert.match(migration, /cancellation_token_expires_at/);
    assert.match(migration, /cancellation_token_revoked_at/);
    assert.match(migration, /privacy_accepted_at/);
  });

  it("adds reservation_communications worker columns and statuses", () => {
    for (const col of [
      "retry_count",
      "next_attempt_at",
      "provider_code",
      "provider_message_id",
      "idempotency_key",
      "template_code",
      "recipient_masked",
      "payload",
    ]) {
      assert.match(migration, new RegExp(col), col);
    }
    for (const status of ["queued", "sending", "dead_letter"]) {
      assert.match(migration, new RegExp(`'${status}'`), status);
    }
  });

  it("creates branch_notification_settings", () => {
    assert.match(migration, /create table if not exists public\.branch_notification_settings/);
    assert.match(migration, /provider_mode/);
    assert.match(migration, /dev_smtp/);
  });
});

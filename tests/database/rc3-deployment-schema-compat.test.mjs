import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const compat = readFileSync(
  join(root, "supabase/migrations/20260731150000_rc3_deployment_schema_compatibility.sql"),
  "utf8",
);

describe("RC3 deployment schema compatibility migration", () => {
  it("is transactional, idempotent, and non-destructive", () => {
    assert.match(compat, /begin;/i);
    assert.match(compat, /commit;/i);
    assert.match(compat, /create table if not exists public\.cash_reconciliations/i);
    assert.match(compat, /create table if not exists public\.expense_claims/i);
    assert.match(compat, /add column if not exists due_date/i);
    assert.match(compat, /create table if not exists public\.hr_shift_templates/i);
    assert.match(compat, /create table if not exists public\.hr_attendance_corrections/i);
    assert.match(compat, /add column if not exists scheduled_shift_id/i);
    assert.match(compat, /add column if not exists rejection_reason/i);
    assert.match(compat, /create table if not exists public\.hr_compensation_profiles/i);
    assert.match(compat, /add column if not exists actor_user_id/i);
    assert.doesNotMatch(compat, /\bDROP TABLE\b/i);
    assert.doesNotMatch(compat, /\bTRUNCATE\b/i);
    assert.doesNotMatch(compat, /DROP COLUMN/i);
  });
});

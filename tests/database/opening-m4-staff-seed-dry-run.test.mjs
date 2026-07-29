import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sql = readFileSync(
  resolve(root, "supabase/migrations/20260729030000_opening_m4_staff_seed_dry_run.sql"),
  "utf8",
);

describe("Opening M4 staff seed / dry-run migration", () => {
  it("creates staff seed tables without plaintext password columns", () => {
    assert.match(sql, /create table if not exists public\.branch_staff_seed_runs/);
    assert.match(sql, /create table if not exists public\.branch_staff_seed_accounts/);
    assert.match(sql, /password_fingerprint/);
    assert.doesNotMatch(sql, /temp_password\s+text/i);
    assert.doesNotMatch(sql, /\bpassword\s+text\b/i);
  });

  it("restricts canonical roles and forbids owner/founder", () => {
    assert.match(sql, /'super-admin'/);
    assert.match(sql, /'branch-manager'/);
    assert.match(sql, /chk_branch_staff_seed_no_forbidden_roles/);
    assert.match(sql, /'owner'/);
  });

  it("creates live config snapshot with Asia/Karachi constraint", () => {
    assert.match(sql, /branch_live_config_snapshots/);
    assert.match(sql, /Asia\/Karachi/);
    assert.match(sql, /northern_bypass_status_expected/);
  });

  it("creates immutable dry-run evidence", () => {
    assert.match(sql, /branch_dry_run_sessions/);
    assert.match(sql, /branch_dry_run_steps/);
    assert.match(sql, /branch_dry_run_evidence/);
    assert.match(sql, /prevent_dry_run_evidence_mutation/);
    assert.match(sql, /immutable/);
  });

  it("enables RLS and documents no Production apply", () => {
    assert.match(sql, /enable row level security/);
    assert.match(sql, /Production apply requires explicit Founder auth/);
    assert.match(sql, /Do NOT apply to Production/);
  });

  it("forbids secret columns", () => {
    assert.doesNotMatch(sql, /api_key|access_token|private_key|cvv/i);
  });
});

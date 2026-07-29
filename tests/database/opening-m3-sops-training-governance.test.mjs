/**
 * Opening Operations M3 — SOP / training / governance migration contract (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260729020000_opening_m3_sops_training_governance.sql"),
  "utf8",
);

const FORBIDDEN_SECRET_COLUMNS = [
  "api_key",
  "access_token",
  "private_key",
  "password",
  "cvv",
  "card_number",
  "secret_key",
  "whatsapp_token",
];

describe("Opening M3 SOPs / training / governance migration", () => {
  it("creates SOP review table with required codes", () => {
    assert.match(migration, /create table if not exists public\.branch_sop_reviews/);
    for (const code of [
      "ORDER_CONFIRMATION",
      "KITCHEN_PROGRESSION",
      "DELIVERY_DISPATCH",
      "CANCELLATION_REFUND",
      "OPENING_CHECKLIST",
      "CLOSING_CHECKLIST",
      "CASH_RECONCILIATION",
      "RESERVATION_AND_WAITLIST",
      "INCIDENT_ESCALATION",
    ]) {
      assert.match(migration, new RegExp(`'${code}'`), code);
    }
    assert.match(migration, /uq_branch_sop_reviews_branch_code/);
  });

  it("separates review status from operational verification", () => {
    for (const s of ["NOT_REVIEWED", "REVIEW_REQUIRED", "REVIEWED", "APPROVED", "RETIRED"]) {
      assert.match(migration, new RegExp(`'${s}'`), s);
    }
    for (const s of ["NOT_VERIFIED", "REHEARSAL_REQUIRED", "VERIFIED_ONSITE", "FAILED", "EXPIRED"]) {
      assert.match(migration, new RegExp(`'${s}'`), s);
    }
  });

  it("creates training sessions and participants with canonical roles only", () => {
    assert.match(migration, /create table if not exists public\.branch_training_sessions/);
    assert.match(migration, /create table if not exists public\.branch_training_participants/);
    assert.match(migration, /local_test_only/);
    for (const role of [
      "branch-manager",
      "kitchen",
      "cashier",
      "rider",
      "customer-support",
      "host",
      "waiter",
    ]) {
      assert.match(migration, new RegExp(`'${role}'`), role);
    }
    const ddl = migration.replace(/--[^\n]*/g, "");
    assert.doesNotMatch(ddl, /'owner'/);
    assert.doesNotMatch(ddl, /'founder'/);
    assert.doesNotMatch(ddl, /'general-staff'/);
  });

  it("creates role and e2e rehearsal tables", () => {
    assert.match(migration, /create table if not exists public\.branch_role_rehearsals/);
    assert.match(migration, /create table if not exists public\.branch_e2e_rehearsals/);
    assert.match(migration, /critical_failures/);
    assert.match(migration, /stages_completed/);
  });

  it("creates immutable founder decision table", () => {
    assert.match(migration, /create table if not exists public\.branch_founder_opening_decisions/);
    assert.match(migration, /snapshot_payload/);
    assert.match(migration, /prevent_founder_decision_mutation/);
    assert.match(migration, /'GO_APPROVED'/);
    assert.match(migration, /'GO_CONDITIONAL'/);
    assert.match(migration, /'NO_GO'/);
    assert.match(migration, /grant select, insert on table public\.branch_founder_opening_decisions/);
  });

  it("creates owner handover without owner role code", () => {
    assert.match(migration, /create table if not exists public\.branch_owner_handover_records/);
    assert.match(migration, /intended_owner_name/);
    assert.match(migration, /accepted_by_reference/);
    assert.match(migration, /No owner role/i);
  });

  it("forbids secret columns in DDL", () => {
    const ddl = migration.replace(/--[^\n]*/g, "");
    for (const col of FORBIDDEN_SECRET_COLUMNS) {
      assert.doesNotMatch(ddl, new RegExp(`\\b${col}\\b`, "i"), col);
    }
  });

  it("enables RLS and documents honesty", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(migration, /Documentation alone does not imply rehearsal/i);
    assert.match(migration, /Does not auto-change branch status/i);
  });
});

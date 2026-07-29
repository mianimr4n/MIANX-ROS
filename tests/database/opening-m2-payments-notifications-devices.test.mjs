/**
 * Opening Operations M2 — payment / notification / device migration contract (static).
 * Does not apply migrations to Production. Secrets must never appear as columns.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve("supabase/migrations/20260729010000_opening_m2_payments_notifications_devices.sql"),
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

describe("Opening M2 payments / notifications / devices migration", () => {
  it("creates branch payment methods with required method codes", () => {
    assert.match(migration, /create table if not exists public\.branch_payment_methods/);
    for (const code of ["CASH", "CARD", "BANK_TRANSFER", "ONLINE_PAYMENT"]) {
      assert.match(migration, new RegExp(`'${code}'`), code);
    }
    assert.match(migration, /uq_branch_payment_methods_branch_code/);
    assert.match(migration, /unique \(branch_id, method_code\)/);
  });

  it("stores configuration and verification statuses without secrets", () => {
    for (const status of [
      "NOT_CONFIGURED",
      "CONFIGURED",
      "VERIFICATION_REQUIRED",
      "VERIFIED",
      "ERROR",
      "DISABLED",
    ]) {
      assert.match(migration, new RegExp(`'${status}'`), status);
    }
    // Strip SQL comments before scanning for secret column definitions.
    const ddl = migration.replace(/--[^\n]*/g, "");
    for (const col of FORBIDDEN_SECRET_COLUMNS) {
      assert.doesNotMatch(ddl, new RegExp(`\\b${col}\\b`, "i"), col);
    }
  });

  it("creates provider verification with TEST/SANDBOX/PRODUCTION environments", () => {
    assert.match(migration, /create table if not exists public\.branch_payment_provider_verifications/);
    for (const env of ["TEST", "SANDBOX", "PRODUCTION"]) {
      assert.match(migration, new RegExp(`'${env}'`), env);
    }
    assert.match(migration, /terminal_required/);
    assert.match(migration, /terminal_verified/);
  });

  it("creates card terminal and cash procedure tables", () => {
    assert.match(migration, /create table if not exists public\.branch_card_terminal_verifications/);
    assert.match(migration, /create table if not exists public\.branch_cash_procedure_approvals/);
    assert.match(migration, /'DOCUMENTED'/);
    assert.match(migration, /'REVIEWED'/);
    assert.match(migration, /'VERIFIED_ONSITE'/);
    assert.match(migration, /uq_branch_cash_procedure_one/);
  });

  it("creates notification channels for purpose × channel", () => {
    assert.match(migration, /create table if not exists public\.branch_notification_channels/);
    for (const purpose of ["CUSTOMER_ORDER", "KITCHEN_ALERT", "RIDER_ALERT", "ESCALATION"]) {
      assert.match(migration, new RegExp(`'${purpose}'`), purpose);
    }
    for (const channel of ["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PHONE_MANUAL"]) {
      assert.match(migration, new RegExp(`'${channel}'`), channel);
    }
    assert.match(migration, /local_test_only/);
    assert.match(migration, /destination_reference/);
  });

  it("creates device verifications for ops and infrastructure types", () => {
    assert.match(migration, /create table if not exists public\.branch_device_verifications/);
    for (const type of [
      "POS_DEVICE",
      "KDS_DEVICE",
      "RECEIPT_PRINTER",
      "CARD_TERMINAL",
      "RIDER_DEVICE",
      "PRIMARY_INTERNET",
      "BACKUP_INTERNET",
      "UPS_POWER_BACKUP",
    ]) {
      assert.match(migration, new RegExp(`'${type}'`), type);
    }
    assert.match(migration, /'LOCAL_TEST_ONLY'/);
    assert.match(migration, /'ONSITE_CHECK'/);
  });

  it("enables RLS and grants authenticated select / service_role mutate", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /current_user_has_branch_access\(branch_id\)/);
    assert.match(migration, /grant select, insert, update, delete on table/);
    assert.match(migration, /to service_role/);
  });

  it("documents no-secrets and rollback strategy", () => {
    assert.match(migration, /Never store API keys/i);
    assert.match(migration, /Rollback notes/i);
    assert.match(migration, /LOCAL_TEST_ONLY does not satisfy Production readiness/i);
  });
});

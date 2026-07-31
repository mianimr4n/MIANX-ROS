/**
 * RC3 Finance PR1 migrations — account mappings, cash recon, expenses, postings, AP idempotency.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readMigration(name) {
  return readFileSync(join(root, "supabase/migrations", name), "utf8");
}

describe("RC3 finance operations migrations", () => {
  it("creates finance_account_mappings empty by default", () => {
    const sql = readMigration("20260731010000_finance_account_mappings.sql");
    assert.match(sql, /create table if not exists public\.finance_account_mappings/);
    assert.match(sql, /cash_on_hand/);
    assert.match(sql, /expense_category:%/);
    assert.doesNotMatch(sql, /insert into public\.finance_account_mappings/);
  });

  it("creates cash_reconciliations with server-side expected cash helper", () => {
    const sql = readMigration("20260731020000_cash_reconciliations.sql");
    assert.match(sql, /create table if not exists public\.cash_reconciliations/);
    assert.match(sql, /cash_reconciliation_events/);
    assert.match(sql, /compute_cash_reconciliation_totals/);
    assert.match(sql, /uq_cash_reconciliations_active_day/);
    assert.match(sql, /opening_float/);
    assert.match(sql, /counted_cash/);
    assert.match(sql, /variance/);
  });

  it("creates expense_claims with audit and idempotency", () => {
    const sql = readMigration("20260731030000_expense_claims.sql");
    assert.match(sql, /create table if not exists public\.expense_claims/);
    assert.match(sql, /expense_claim_events/);
    assert.match(sql, /uq_expense_claims_idempotency/);
    assert.match(sql, /status in \('draft', 'submitted', 'approved', 'rejected', 'paid', 'voided'\)/);
  });

  it("adds finance_postings, journal reverse, and payment idempotency / match gate", () => {
    const sql = readMigration("20260731040000_finance_posting_and_ap_idempotency.sql");
    assert.match(sql, /create table if not exists public\.finance_postings/);
    assert.match(sql, /unique \(source_module, source_id\)/);
    assert.match(sql, /reverse_journal_entry_atomic/);
    assert.match(sql, /p_idempotency_key/);
    assert.match(sql, /INVOICE_MATCH_DISCREPANCY/);
    assert.match(sql, /exception_approved_at/);
    assert.match(sql, /PAYMENT_EXCEEDS_BALANCE/);
  });

  it("wires finance operations service and admin routes", () => {
    const ops = readFileSync(join(root, "backend/api/src/services/finance/operations.ts"), "utf8");
    const router = readFileSync(join(root, "backend/api/src/modules/admin/finance.ts"), "utf8");
    assert.match(ops, /computeExpectedCash/);
    assert.match(ops, /createCashReconciliation/);
    assert.match(ops, /createExpenseClaim/);
    assert.match(ops, /getAttention/);
    assert.match(ops, /Journal posting requires account mapping/);
    assert.match(router, /\/finance\/cash-reconciliations/);
    assert.match(router, /\/finance\/expenses/);
    assert.match(router, /\/finance\/attention/);
    assert.match(router, /\/finance\/account-mappings/);
    assert.match(router, /journal-entries\/:id\/reverse/);
  });
});

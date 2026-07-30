/**
 * Finance core migration — double-entry tables + balanced journal RPC + dynamic reports.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sql = readFileSync(join(root, "supabase/migrations/20260730260000_finance_core.sql"), "utf8");

describe("Finance core migration", () => {
  it("creates CoA, journal headers/lines, and finance.manage", () => {
    assert.match(sql, /create table if not exists public\.chart_of_accounts/);
    assert.match(sql, /create table if not exists public\.journal_entries/);
    assert.match(sql, /create table if not exists public\.journal_entry_lines/);
    assert.match(sql, /finance\.manage/);
    assert.match(sql, /ASSET.*LIABILITY.*EQUITY.*REVENUE.*EXPENSE/s);
  });

  it("enforces balanced journals atomically and computes TB / P&L dynamically", () => {
    assert.match(sql, /create_journal_entry_atomic/);
    assert.match(sql, /JOURNAL_UNBALANCED/);
    assert.match(sql, /finance_trial_balance/);
    assert.match(sql, /finance_profit_loss/);
    assert.doesNotMatch(sql, /create table if not exists public\.trial_balance/);
    assert.doesNotMatch(sql, /create table if not exists public\.profit_loss/);
  });

  it("wires service + admin router with finance.manage gate", () => {
    const service = readFileSync(join(root, "backend/api/src/services/finance/management.ts"), "utf8");
    const router = readFileSync(join(root, "backend/api/src/modules/admin/finance.ts"), "utf8");
    assert.match(service, /create_journal_entry_atomic/);
    assert.match(service, /JOURNAL_UNBALANCED/);
    assert.match(service, /finance_trial_balance/);
    assert.match(service, /finance_profit_loss/);
    assert.match(router, /finance\.manage/);
    assert.match(router, /\/finance\/accounts/);
    assert.match(router, /\/finance\/journal-entries/);
    assert.match(router, /\/finance\/reports\/trial-balance/);
    assert.match(router, /\/finance\/reports\/profit-loss/);
  });
});

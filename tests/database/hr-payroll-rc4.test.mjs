import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260731200000_rc4_payroll_calculation_foundation.sql"),
  "utf8",
);
const calc = readFileSync(join(root, "backend/api/src/services/hr/payroll-calc.ts"), "utf8");
const engine = readFileSync(join(root, "backend/api/src/services/hr/payroll-engine.ts"), "utf8");
const payroll = readFileSync(join(root, "backend/api/src/services/hr/payroll.ts"), "utf8");

describe("RC4-3 payroll calculation foundation migration", () => {
  it("expands run statuses including payment_ready/paid/reversed", () => {
    assert.match(migration, /payment_ready/);
    assert.match(migration, /'paid'/);
    assert.match(migration, /'reversed'/);
    assert.match(migration, /review_required/);
  });

  it("adds unique run+employee lines and active period run uniqueness", () => {
    assert.match(migration, /uq_hr_payroll_lines_run_employee/);
    assert.match(migration, /uq_hr_payroll_runs_active_period/);
  });

  it("creates exceptions, payslips, settlements, posting events", () => {
    assert.match(migration, /create table if not exists public\.hr_payroll_exceptions/);
    assert.match(migration, /create table if not exists public\.hr_payslips/);
    assert.match(migration, /create table if not exists public\.hr_payroll_settlements/);
    assert.match(migration, /create table if not exists public\.hr_payroll_posting_events/);
  });

  it("keeps statutory configs inactive by default with no hardcoded rates", () => {
    assert.match(migration, /hr_statutory_rule_configs/);
    assert.match(migration, /is_active boolean not null default false/);
    assert.doesNotMatch(migration, /insert into public\.hr_statutory_rule_configs/i);
  });

  it("documents paymentTriggered safety on settlements", () => {
    assert.match(migration, /paymentTriggered remains false without settlement/i);
    assert.match(migration, /Without a row, payroll must not become paid/i);
  });

  it("defers GL posting and enables RLS", () => {
    assert.match(migration, /GL posting DEFERRED/);
    assert.match(migration, /enable row level security/);
    assert.match(migration, /grant select on public\.hr_payslips to authenticated/);
  });
});

describe("RC4-3 payroll calculation service contracts", () => {
  it("uses integer minor units and CALC_VERSION", () => {
    assert.match(calc, /MoneyMinor/);
    assert.match(calc, /rc4-3\.payroll\.v1/);
    assert.match(calc, /NEGATIVE_NET_PAY/);
    assert.match(calc, /STATUTORY_DEFERRED/);
  });

  it("engine never sets paid and emits deferred posting events", () => {
    assert.match(engine, /paymentTriggered: false/);
    assert.match(engine, /payroll_accrual_ready/);
    assert.match(engine, /status: "deferred"/);
    assert.doesNotMatch(engine, /status:\s*"paid"/);
  });

  it("service keeps paymentTriggered false and separates payment_ready", () => {
    assert.match(payroll, /paymentTriggered: false/);
    assert.match(payroll, /markPaymentReady/);
    assert.match(payroll, /HR_PAYROLL_IMMUTABLE/);
    assert.match(payroll, /accountingStatus: "DEFERRED"/);
  });
});

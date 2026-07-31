import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260731190000_rc4_finance_phase2_foundation.sql"),
  "utf8",
);

describe("RC4-8 finance phase2 migration", () => {
  it("is additive and defines core tables/RPCs", () => {
    assert.match(migration, /customer_invoices/);
    assert.match(migration, /customer_receipts/);
    assert.match(migration, /customer_credit_notes/);
    assert.match(migration, /tax_definitions/);
    assert.match(migration, /finance_periods/);
    assert.match(migration, /finance_cash_accounts/);
    assert.match(migration, /finance_exceptions/);
    assert.match(migration, /finance_balance_sheet/);
    assert.match(migration, /finance_cash_flow_indirect/);
    assert.match(migration, /finance_assert_period_allows_posting/);
    assert.doesNotMatch(migration, /drop table/i);
  });
});

describe("RC4-8 finance phase2 evidence", () => {
  it("acceptance pack exists", () => {
    const dir = join(root, "docs/testing/acceptance-evidence/rc4-finance-phase2");
    for (const f of [
      "ACCOUNTING_EVENT_MAP.md",
      "BASELINE.md",
      "FINAL_REPORT.md",
      "KNOWN_LIMITATIONS.md",
      "TEST_RESULTS.md",
    ]) {
      assert.equal(existsSync(join(dir, f)), true, f);
    }
  });
});

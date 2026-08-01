/**
 * RC4-2 Analytics schema assertions (static SQL).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260801120000_rc4_analytics_bi_foundation.sql"),
  "utf8",
);

describe("RC4-2 analytics BI schema", () => {
  it("creates scheduled reports with deferred execution", () => {
    assert.match(migration, /analytics_scheduled_reports/);
    assert.match(migration, /execution_status/);
    assert.match(migration, /deferred/);
    assert.match(migration, /No analytics worker/);
  });

  it("creates exception and data quality tables", () => {
    assert.match(migration, /analytics_exceptions/);
    assert.match(migration, /analytics_data_quality_checks/);
  });

  it("adds aggregation helper indexes", () => {
    assert.match(migration, /orders_created_at_branch_status_idx/);
    assert.match(migration, /payments_order_id_status_idx/);
  });
});

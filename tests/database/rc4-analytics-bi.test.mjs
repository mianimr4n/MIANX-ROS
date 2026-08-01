/**
 * RC4-2 Analytics schema assertions (static SQL + engine contract).
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
const foundation = readFileSync(
  join(root, "supabase/migrations/20260713190000_foundation_schema.sql"),
  "utf8",
);
const engine = readFileSync(join(root, "backend/api/src/services/analytics/engine.ts"), "utf8");

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

  it("foundation order_items uses product_name snapshot, not name", () => {
    assert.match(foundation, /create table if not exists public\.order_items/);
    assert.match(foundation, /product_name varchar\(150\) not null/);
    assert.doesNotMatch(
      foundation,
      /create table if not exists public\.order_items[\s\S]{0,800}?\bname varchar/,
    );
  });

  it("analytics engine selects product_name and never order_items.name", () => {
    assert.match(engine, /\.from\(\s*["']order_items["']\s*\)\s*\.select\(\s*["']menu_item_id,\s*quantity,\s*product_name["']/);
    assert.doesNotMatch(engine, /select\(\s*["']menu_item_id,\s*quantity,\s*name["']/);
  });
});

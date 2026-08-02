/**
 * RC4-2 / RC5-TEST-01 Analytics schema assertions
 * (static SQL intent + Analytics runtime source contract).
 * Does not prove live PostgREST behavior.
 *
 * Column-aware Vitest guard lives in:
 * `backend/api/tests/helpers/analytics-order-items-schema-guard.ts`
 * (primary CI path via `pnpm test` → Vitest). This file keeps aligned
 * migration + engine source intent checks for `pnpm test:db`.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
const analyticsDir = join(root, "backend/api/src/services/analytics");
const FORBIDDEN =
  "order_items.name is not a valid Analytics schema field; use product_name and preserve menu_item_id aggregation.";

function extractOrderItemsSelectLists(source) {
  const lists = [];
  const re = /\.from\(\s*(["'])order_items\1\s*\)\s*\.select\(\s*(["'`])([\s\S]*?)\2\s*\)/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    lists.push(match[3].replace(/\s+/g, " ").trim());
  }
  return lists;
}

function parseSelectColumns(selectList) {
  return selectList
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const noAlias = part.split(/\s+as\s+/i)[0].trim();
      const bare = noAlias.includes(".") ? noAlias.split(".").pop() : noAlias;
      return bare.replace(/["'`]/g, "").trim();
    })
    .filter(Boolean);
}

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

  it("Analytics runtime order_items selects use product_name and reject bare name", () => {
    const files = readdirSync(analyticsDir).filter((name) => name.endsWith(".ts"));
    assert.ok(files.includes("engine.ts"));

    let selectCount = 0;
    for (const name of files) {
      const source = readFileSync(join(analyticsDir, name), "utf8");
      for (const selectList of extractOrderItemsSelectLists(source)) {
        selectCount += 1;
        const cols = parseSelectColumns(selectList);
        assert.equal(cols.includes("name"), false, FORBIDDEN);
        assert.equal(
          cols.includes("product_name"),
          true,
          "Analytics order_items selections must include product_name",
        );
        assert.equal(cols.includes("menu_item_id"), true, "must preserve menu_item_id");
      }
    }
    assert.ok(selectCount >= 1, "expected at least one Analytics order_items select");
  });
});

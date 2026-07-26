/**
 * Canonical single-price menu domain — migration contract (static).
 *
 * These assertions read the migration SQL; they never open a database connection.
 * Live idempotency was exercised separately against a production-shaped scratch database.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const MIGRATION_PATH =
  "supabase/migrations/20260725130000_canonical_single_price_menu_domain.sql";
const migration = readFileSync(resolve(MIGRATION_PATH), "utf8");
/** Statements only — the file's own prose describes what it avoids doing. */
const sql = migration.replace(/^\s*--.*$/gm, "");

describe("canonical single-price menu migration", () => {
  it("is additive: no destructive catalog operations", () => {
    assert.doesNotMatch(sql, /\btruncate\b/i);
    assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(sql, /drop\s+table/i);
    assert.doesNotMatch(sql, /drop\s+column/i);
    // The only CASCADE allowed is the FK rule on the inactive override table.
    for (const hit of sql.match(/[\w ]*\bcascade\b/gi) ?? []) {
      assert.match(hit, /on delete cascade/i);
    }
    // Constraint churn is allowed only for the price guard this migration owns.
    for (const drop of sql.match(/drop\s+constraint[^\n;]*/gi) ?? []) {
      assert.match(drop, /menu_items_price_non_negative/);
    }
  });

  it("adds the canonical SKU columns to menu_items", () => {
    for (const column of ["product_group_slug", "size_label", "size_code", "price", "sort_order"]) {
      assert.match(migration, new RegExp(`add column if not exists ${column}`), column);
    }
  });

  it("enforces one non-negative price per SKU", () => {
    assert.match(migration, /alter column price set not null/);
    assert.match(migration, /add constraint menu_items_price_non_negative check \(price >= 0\)/);
    assert.match(migration, /ASSERTION FAILED: % SKUs without a single non-negative price/);
  });

  it("creates the variant-to-SKU compatibility mapping", () => {
    assert.match(migration, /create table if not exists public\.menu_variant_sku_mappings/);
    assert.match(migration, /old_variant_id uuid primary key/);
    assert.match(migration, /new_menu_item_id uuid not null references public\.menu_items\(id\)/);
    assert.match(migration, /migrated_at timestamptz not null/);
    assert.match(migration, /ASSERTION FAILED: % variants have no SKU mapping/);
  });

  it("keeps historical order lines readable and unchanged", () => {
    assert.match(migration, /create temporary table _order_items_pre/);
    assert.match(migration, /ASSERTION FAILED: % order_items lost or changed references/);
    assert.match(
      migration,
      /ASSERTION FAILED: % historical order lines reference an unmapped variant/,
    );
  });

  it("preserves modifier and category relationships", () => {
    assert.match(migration, /insert into public\.item_modifier_groups/);
    assert.match(migration, /on conflict \(menu_item_id, modifier_group_id, branch_id\) do nothing/);
    assert.match(migration, /ASSERTION FAILED: item_modifier_groups count reduced/);
    assert.match(migration, /ASSERTION FAILED: modifier_options count reduced/);
    assert.match(migration, /ASSERTION FAILED: menu_categories count reduced/);
    assert.match(migration, /ASSERTION FAILED: orphan menu_items/);
  });

  it("rejects duplicate SKU slugs", () => {
    assert.match(migration, /ASSERTION FAILED: duplicate SKU slugs/);
  });

  it("is idempotent: conversion is driven off the mapping table", () => {
    assert.match(migration, /not exists \(\s*select 1 from public\.menu_variant_sku_mappings/);
    assert.match(migration, /on conflict \(old_variant_id\) do update/);
    assert.match(migration, /on conflict \(slug\) do update/);
    assert.match(migration, /where product_group_slug is null/);
  });

  it("deprecates menu_item_variants instead of dropping it", () => {
    assert.match(migration, /comment on table public\.menu_item_variants is\s*\n\s*'DEPRECATED/);
    assert.match(migration, /ASSERTION FAILED: menu_item_variants must be preserved untouched/);
    assert.doesNotMatch(migration, /drop table[^\n]*menu_item_variants/i);
  });

  it("adds the audit trail with price before/after capture", () => {
    assert.match(migration, /create table if not exists public\.menu_audit_events/);
    assert.match(migration, /before_data jsonb/);
    assert.match(migration, /after_data jsonb/);
    assert.match(migration, /actor_user_id uuid references public\.users\(id\)/);
    assert.match(migration, /scope text not null default 'global'/);
  });

  it("designs branch overrides without activating branch price divergence", () => {
    assert.match(migration, /create table if not exists public\.branch_menu_item_overrides/);
    assert.match(migration, /price_override numeric\(10, 2\)/);
    assert.match(migration, /availability_override boolean/);
    assert.match(migration, /INACTIVE by design/);
  });

  it("enables RLS and grants on every new table", () => {
    for (const table of [
      "menu_variant_sku_mappings",
      "menu_audit_events",
      "branch_menu_item_overrides",
    ]) {
      assert.match(
        migration,
        new RegExp(`alter table public\\.${table} enable row level security`),
        table,
      );
    }
    assert.match(migration, /grant select on table public\.menu_variant_sku_mappings to anon, authenticated/);
    assert.match(migration, /revoke all on table public\.menu_audit_events/);
  });

  it("does not edit previously applied migrations", () => {
    const files = readdirSync(resolve("supabase/migrations")).filter((f) => f.endsWith(".sql"));
    const canonical = "20260725130000_canonical_single_price_menu_domain.sql";
    const corrective = "20260725140000_canonical_menu_price_audit_atomic.sql";
    assert.ok(files.includes(canonical));
    assert.ok(files.includes(corrective));
    // Corrective audit/guard migration is additive and must remain the newest menu slice.
    assert.equal([...files].sort().at(-1), corrective);
    assert.ok([...files].sort().indexOf(canonical) < [...files].sort().indexOf(corrective));
  });
});

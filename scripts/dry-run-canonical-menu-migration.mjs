/**
 * DEPRECATED — superseded by the canonical single-price menu domain (2026-07-25).
 *
 * This helper checks the 2026-07-18 catalog SYNC migration, which still used the
 * `menu_item_variants` price matrix. It is retained only so that migration's contract stays
 * verifiable. For the current model use tests/database/canonical-single-price-menu.test.mjs.
 *
 * DO NOT RUN IN PRODUCTION. File-level checks only; never connects to a database.
 *
 * Usage: node scripts/dry-run-canonical-menu-migration.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260718180000_sync_canonical_menu_catalog.sql",
);
const catalog = JSON.parse(
  readFileSync(join(root, "data", "catalog", "telepizza-canonical-menu.json"), "utf8"),
);
const sql = readFileSync(migrationPath, "utf8");

const checks = [
  { name: "has begin/commit", ok: /begin;/i.test(sql) && /commit;/i.test(sql) },
  { name: "upsert by slug", ok: /on conflict \(slug\) do update/i.test(sql) },
  { name: "deactivates broast", ok: /quarter-broast/i.test(sql) && /is_available = false/i.test(sql) },
  { name: "no DELETE menu_items", ok: !/\bdelete from public\.menu_items\b/i.test(sql) },
  { name: "no TRUNCATE", ok: !/\btruncate\b/i.test(sql) },
  { name: "owner approval banner", ok: /OWNER APPROVAL REQUIRED/i.test(sql) },
  {
    name: "founder price lock status acknowledged",
    ok: catalog.completionStatus.includes("OWNER_PRICES_LOCKED_EXPAND_20260725120000"),
  },
];

console.log("Canonical menu migration dry-run (local file checks only)\n");
console.log(`Migration: ${migrationPath}`);
console.log(`Manifest status: ${catalog.completionStatus}`);
console.log("");

let failed = 0;
for (const check of checks) {
  const mark = check.ok ? "PASS" : "FAIL";
  if (!check.ok) failed += 1;
  console.log(`  [${mark}] ${check.name}`);
}

console.log(`
Verification SQL for the CURRENT canonical single-price model
(run manually against a non-prod DB after apply):

  select count(*) as public_categories
  from menu_categories where is_active and slug <> 'toppings';

  select count(*) as sellable_skus
  from menu_items where is_available and product_type <> 'topping';

  select count(distinct product_group_slug) as product_families
  from menu_items where is_available and product_type <> 'topping';

  select count(*) as topping_skus
  from menu_items where product_type = 'topping' and is_available;

  select count(*) as skus_without_one_price
  from menu_items where price is null or price < 0;   -- must be 0

  select count(*) as unmapped_variants
  from menu_item_variants v
  left join menu_variant_sku_mappings m on m.old_variant_id = v.id
  where m.old_variant_id is null;                     -- must be 0

DO NOT apply to production without owner approval.
`);

if (failed > 0) {
  console.error(`Dry-run failed: ${failed} check(s)`);
  process.exit(1);
}

console.log("Dry-run PASS (file-level). Production apply: BLOCKED pending owner approval.");

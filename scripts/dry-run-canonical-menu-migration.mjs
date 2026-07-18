/**
 * Dry-run helper for the canonical catalog sync migration.
 * Prints verification SQL and asserts the migration file is non-destructive.
 * Does NOT connect to or apply against production.
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
    name: "canonical blocked status acknowledged",
    ok: catalog.completionStatus.includes("BLOCKED"),
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
Recommended verification SQL (run manually against a non-prod DB after apply):

  select count(*) as public_categories
  from menu_categories where is_active and slug <> 'toppings';

  select count(*) as browse_items
  from menu_items where is_available and product_type <> 'topping';

  select count(*) as toppings
  from menu_items where product_type = 'topping' and is_available;

  select count(*) as variants
  from menu_item_variants v
  join menu_items i on i.id = v.menu_item_id
  where v.is_available and i.is_available;

Expect freeze baseline: 13 / 58 / 3 / 40 (variants include topping size rows).

DO NOT apply to production without owner approval.
`);

if (failed > 0) {
  console.error(`Dry-run failed: ${failed} check(s)`);
  process.exit(1);
}

console.log("Dry-run PASS (file-level). Production apply: BLOCKED pending owner approval.");

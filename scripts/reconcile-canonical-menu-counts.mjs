/**
 * Deterministic canonical menu count reconciliation.
 *
 * Compares:
 *   A) freeze JSON (data/catalog/telepizza-canonical-menu.json) — offline/source builder layer
 *   B) optional live database counts via DATABASE_URL / psql-friendly env
 *
 * Definitions (locked for acceptance):
 *   - categories_total: all menu_categories rows (or JSON categories)
 *   - browse_categories: active categories excluding slug/code "toppings"
 *   - product_families_total: distinct product_group_slug (or distinct item.code in JSON)
 *   - browse_product_families: families where product_type <> topping / lifecycle=sellable
 *   - sellable_skus_total: every menu_items row (or JSON variant expansion)
 *   - browse_sellable_skus: available non-topping SKUs
 *   - topping_skus: product_type=topping / lifecycle=modifier-only expanded
 *   - unavailable_skus: is_available=false
 *
 * Why 129 DB families vs 58 freeze families:
 *   - 58 = sellable product families in the OWNER FREEZE JSON (blocked/incomplete freeze board)
 *   - 129 = ALL product_group_slug values after the real-menu EXPAND migration + SKU conversion
 *     on a production-shaped scratch DB (includes single-SKU products, drinks, desserts, etc.)
 *   Offline fallback is generated ONLY from the freeze JSON and is NON-AUTHORITATIVE.
 *   Runtime authority after expand+SKU migration is the database / GET /api/v1/menu/catalog.
 *
 * Usage:
 *   node scripts/reconcile-canonical-menu-counts.mjs
 *   node scripts/reconcile-canonical-menu-counts.mjs --db   # requires docker menu_canon
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "data", "catalog", "telepizza-canonical-menu.json");
const evidenceDir = join(root, "docs", "testing", "acceptance-evidence");
const withDb = process.argv.includes("--db");

function expandSkuCount(item) {
  return Math.max(1, item.variants?.length ?? 0);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const raw = readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(raw);
const checksum = sha256(raw);

const categories = catalog.categories ?? [];
const items = catalog.items ?? [];
const sellable = items.filter((i) => i.lifecycle === "sellable");
const toppings = items.filter((i) => i.lifecycle === "modifier-only");
const browseCategories = categories.filter((c) => c.code !== "toppings" && c.lifecycle !== "internal");

const freeze = {
  layer: "freeze_json",
  path: "data/catalog/telepizza-canonical-menu.json",
  checksumSha256: checksum,
  completionStatus: catalog.completionStatus,
  generatedAt: catalog.generatedAt ?? null,
  categories_total: categories.length,
  browse_categories: browseCategories.length,
  product_families_total: sellable.length + toppings.length,
  browse_product_families: sellable.length,
  sellable_skus_total: [...sellable, ...toppings].reduce((s, i) => s + expandSkuCount(i), 0),
  browse_sellable_skus: sellable.reduce((s, i) => s + expandSkuCount(i), 0),
  topping_skus: toppings.reduce((s, i) => s + expandSkuCount(i), 0),
  unavailable_skus: 0,
  modifier_groups: (catalog.modifierGroups ?? []).length,
  modifier_options: (catalog.modifierGroups ?? []).reduce(
    (s, g) => s + (g.options?.length ?? 0),
    0,
  ),
};

let database = null;
if (withDb) {
  const sql = `
select 'categories_total', count(*)::text from menu_categories
union all select 'browse_categories', count(*)::text from menu_categories where is_active and slug <> 'toppings'
union all select 'product_families_total', count(distinct product_group_slug)::text from menu_items
union all select 'browse_product_families', count(distinct product_group_slug)::text from menu_items where product_type <> 'topping'
union all select 'sellable_skus_total', count(*)::text from menu_items
union all select 'browse_sellable_skus', count(*)::text from menu_items where is_available and product_type <> 'topping'
union all select 'topping_skus', count(*)::text from menu_items where product_type = 'topping'
union all select 'unavailable_skus', count(*)::text from menu_items where not is_available
union all select 'modifier_groups', count(*)::text from modifier_groups
union all select 'modifier_options', count(*)::text from modifier_options;
`.trim();

  const result = spawnSync(
    "docker",
    [
      "exec",
      "supabase_db_telepizza-platform",
      "psql",
      "-U",
      "postgres",
      "-d",
      "menu_canon",
      "-t",
      "-A",
      "-F",
      "|",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }

  database = { layer: "scratch_db_menu_canon", source: "production-shaped + expand + SKU migration" };
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [key, value] = line.split("|");
    database[key] = Number(value);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  definitions: {
    freeze_json:
      "Owner freeze board. Incomplete (completionStatus may be BLOCKED). Powers offline menu-data.ts only.",
    scratch_db:
      "Local menu_canon after expand migration + 20260725130000 SKU conversion. Runtime authority for acceptance against production-shaped data.",
    why_129_vs_58:
      "58 = freeze JSON sellable families. 129 = distinct product_group_slug in scratch DB after full real-menu expand (includes one-SKU products across all categories). Not a counting bug.",
  },
  freeze,
  database,
};

console.log(JSON.stringify(report, null, 2));

if (!existsSync(evidenceDir)) mkdirSync(evidenceDir, { recursive: true });
writeFileSync(join(evidenceDir, "canonical-menu-count-reconciliation.json"), JSON.stringify(report, null, 2));
console.error(`Wrote ${join(evidenceDir, "canonical-menu-count-reconciliation.json")}`);

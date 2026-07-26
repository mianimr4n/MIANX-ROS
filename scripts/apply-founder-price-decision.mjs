/**
 * Apply Founder price decision (2026-07-26):
 * Migration 20260725120000 expanded real-menu prices are the initial
 * authoritative production-intended prices. Older bootstrap board prices
 * (e.g. tele-special 499/950/1570) are stale.
 *
 * Updates:
 *   - data/catalog/telepizza-canonical-menu.json
 *   - clears OWNER_CONFIRMATION_REQUIRED / GM_PRICE_CONFLICT flags
 *   - sets completionStatus to OWNER_PRICES_LOCKED_EXPAND_20260725120000
 *
 * Source of approved prices: local scratch DB `menu_canon` (expand already applied).
 *
 * Usage: node scripts/apply-founder-price-decision.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "data", "catalog", "telepizza-canonical-menu.json");
const CONTAINER = "supabase_db_telepizza-platform";
const SOURCE_DB = "menu_canon";

const MEDIUM_LABEL_FIX = new Set([
  "tele-special",
  "peri-peri",
  "bihari-kabab",
  "kababish",
  "tikka",
  "bonfire",
  "chicken-supreme",
  "real-fajita",
  "mexicana",
  "cheese-lover",
  "malai-boti",
]);

function loadCanonPrices() {
  const res = spawnSync(
    "docker",
    [
      "exec",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      SOURCE_DB,
      "-t",
      "-A",
      "-F",
      "|",
      "-c",
      `select
         coalesce(product_group_slug, slug) as group_slug,
         slug,
         coalesce(size_code, ''),
         coalesce(size_label, ''),
         price::text
       from menu_items
       where price is not null
       order by 1, 2;`,
    ],
    { encoding: "utf8" },
  );
  if (res.status !== 0) throw new Error(res.stderr || "psql failed");
  const byGroup = new Map();
  const bySkuSlug = new Map();
  for (const line of (res.stdout || "").trim().split(/\r?\n/).filter(Boolean)) {
    const [group, slug, sizeCode, sizeLabel, price] = line.split("|");
    const entry = {
      group,
      slug,
      sizeCode: sizeCode || null,
      sizeLabel: sizeLabel || null,
      price: Number(price),
    };
    bySkuSlug.set(slug, entry);
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(entry);
  }
  return { byGroup, bySkuSlug };
}

function sizeKey(variant) {
  return String(variant.sizeCode || variant.code || "").toLowerCase();
}

const { byGroup, bySkuSlug } = loadCanonPrices();
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

let updatedVariants = 0;
let updatedBase = 0;
let clearedFlags = 0;
let labelFixes = 0;

for (const item of catalog.items ?? []) {
  const groupPrices = byGroup.get(item.code) ?? [];
  const single = bySkuSlug.get(item.code);

  if (item.variants?.length) {
    for (const variant of item.variants) {
      const key = sizeKey(variant);
      const match =
        groupPrices.find((p) => (p.sizeCode || "").toLowerCase() === key) ||
        groupPrices.find((p) => p.slug === `${item.code}-${key}`) ||
        groupPrices.find((p) => (p.sizeLabel || "").toLowerCase().includes(key));
      if (match && Number(variant.pricePkr) !== match.price) {
        variant.pricePkr = match.price;
        updatedVariants += 1;
      }
      if (match?.sizeLabel && MEDIUM_LABEL_FIX.has(item.code) && key === "medium") {
        if (variant.label !== "10 inch Medium") {
          variant.label = "10 inch Medium";
          labelFixes += 1;
        }
      }
    }
  } else if (single && item.basePricePkr != null && Number(item.basePricePkr) !== single.price) {
    item.basePricePkr = single.price;
    updatedBase += 1;
  } else if (!item.variants?.length && single && item.basePricePkr == null && single.price != null) {
    // single-price item with null base — leave unless lifecycle sellable
    if (item.lifecycle === "sellable") {
      item.basePricePkr = single.price;
      updatedBase += 1;
    }
  }

  if (Array.isArray(item.flags) && item.flags.length) {
    const before = item.flags.length;
    item.flags = item.flags.filter(
      (f) => f !== "OWNER_CONFIRMATION_REQUIRED" && f !== "GM_PRICE_CONFLICT",
    );
    if (item.flags.length !== before) clearedFlags += 1;
    if (item.flags.length === 0) delete item.flags;
  }

  item.pricingEra = "expand-20260725120000-founder-locked";
  if (Array.isArray(item.evidence)) {
    if (!item.evidence.includes("FOUNDER_PRICE_DECISION_2026-07-26")) {
      item.evidence.push("FOUNDER_PRICE_DECISION_2026-07-26");
    }
  }
}

catalog.completionStatus = "OWNER_PRICES_LOCKED_EXPAND_20260725120000";
catalog.founderPriceDecision = {
  decidedAt: "2026-07-26",
  rule: "Migration 20260725120000 expanded real-menu prices are the initial authoritative production-intended prices. Older bootstrap board prices are stale. Owner may edit later via Admin Menu with atomic audit.",
  authoritativeSource: "supabase/migrations/20260725120000_expand_and_activate_real_menu_catalog.sql",
  examples: {
    "tele-special-small": 620,
    "tele-special-medium": 1250,
    "tele-special-large": 1890,
  },
};

const next = `${JSON.stringify(catalog, null, 2)}\n`;
writeFileSync(catalogPath, next);
const checksum = createHash("sha256").update(next).digest("hex");

console.log(
  JSON.stringify(
    {
      catalogPath,
      checksum,
      updatedVariants,
      updatedBase,
      labelFixes,
      clearedFlags,
      completionStatus: catalog.completionStatus,
      teleSpecial: (catalog.items.find((i) => i.code === "tele-special") || {}).variants,
      drink500: catalog.items.find((i) => i.code === "drink-500ml")?.basePricePkr,
      familyFries: catalog.items.find((i) => i.code === "family-fries")?.basePricePkr,
      loadedFries: catalog.items.find((i) => i.code === "loaded-fries")?.basePricePkr,
    },
    null,
    2,
  ),
);

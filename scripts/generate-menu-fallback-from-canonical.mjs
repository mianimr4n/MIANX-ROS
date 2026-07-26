/**
 * Generates apps/website/client/src/data/menu-data.ts from the canonical manifest.
 * Do not edit prices in the generated file — edit data/catalog/telepizza-canonical-menu.json
 * (via scripts/build-canonical-menu.mjs) then regenerate.
 *
 * NON-AUTHORITATIVE offline fallback only. Runtime authority is GET /api/v1/menu/catalog.
 * Includes SOURCE_CHECKSUM so tests can prove the generated file matches the freeze JSON.
 *
 * Usage: node scripts/generate-menu-fallback-from-canonical.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checksumCanonicalCatalogFile } from "./lib/canonical-menu-checksum.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "data", "catalog", "telepizza-canonical-menu.json");
const { checksum: sourceChecksum, normalizedText: catalogRaw } =
  checksumCanonicalCatalogFile(catalogPath);
const canonical = JSON.parse(catalogRaw);
const outPath = join(root, "apps", "website", "client", "src", "data", "menu-data.ts");

const sellableCats = canonical.categories
  .filter((c) => c.lifecycle === "sellable")
  .sort((a, b) => a.sortOrder - b.sortOrder);

const browseItems = canonical.items.filter((i) => i.lifecycle === "sellable");
const toppingItems = canonical.items.filter((i) => i.lifecycle === "modifier-only");

function esc(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Expands one canonical product into its sellable SKUs using the same slug/name rules as
 * supabase/migrations/20260725130000_canonical_single_price_menu_domain.sql, so the offline
 * fallback and the database agree on SKU identity.
 */
function expandToSkus(item) {
  const groupSlug = item.code;
  if (!item.variants?.length) {
    return [
      {
        id: groupSlug,
        slug: groupSlug,
        name: item.name,
        productGroupSlug: groupSlug,
        sizeLabel: null,
        sizeCode: null,
        price: item.basePricePkr ?? 0,
        sortOrder: 1,
      },
    ];
  }

  return item.variants.map((variant, index) => {
    const suffix = slugify(variant.sizeCode) || slugify(variant.label) || `option-${index + 1}`;
    return {
      id: `${groupSlug}-${suffix}`,
      slug: `${groupSlug}-${suffix}`,
      name: `${item.name} — ${variant.label}`,
      productGroupSlug: groupSlug,
      sizeLabel: variant.label,
      sizeCode: variant.sizeCode ?? null,
      price: variant.pricePkr,
      sortOrder: index + 1,
    };
  });
}

function renderSku(item, sku) {
  const lines = [
    `    id: "${esc(sku.id)}"`,
    `    slug: "${esc(sku.slug)}"`,
    `    name: "${esc(sku.name)}"`,
    `    productGroupSlug: "${esc(sku.productGroupSlug)}"`,
  ];
  if (sku.sizeLabel) lines.push(`    sizeLabel: "${esc(sku.sizeLabel)}"`);
  if (sku.sizeCode) lines.push(`    sizeCode: "${esc(sku.sizeCode)}"`);
  lines.push(
    `    category: "${esc(canonical.categories.find((c) => c.code === item.categoryCode)?.name ?? item.categoryCode)}"`,
  );
  if (item.categoryCode === "toppings") {
    lines.push(`    categorySlug: "toppings"`);
  }
  lines.push(`    description:\n      "${esc(item.description)}"`);
  lines.push(`    image: "${esc(item.imageUrl)}"`);
  if (item.badge) lines.push(`    badge: "${esc(item.badge)}"`);
  if (item.productType === "topping") lines.push(`    productType: "topping"`);
  if (item.featured) lines.push(`    featured: true`);
  lines.push(`    price: ${sku.price}`);
  lines.push(`    available: true`);
  lines.push(`    sortOrder: ${sku.sortOrder}`);

  return `  {\n${lines.join(",\n")},\n  }`;
}

function renderItem(item) {
  return expandToSkus(item)
    .map((sku) => renderSku(item, sku))
    .join(",\n");
}

const categoryNames = sellableCats.map((c) => c.name);
const menuCategoriesBlock = [
  '  "All"',
  ...categoryNames.map((n) => `  "${n}"`),
].join(",\n");

const allItems = [...browseItems, ...toppingItems];
const itemsBlock = allItems.map(renderItem).join(",\n");
const browseSkuCount = browseItems.reduce((sum, item) => sum + expandToSkus(item).length, 0);
const toppingSkuCount = toppingItems.reduce((sum, item) => sum + expandToSkus(item).length, 0);

const content = `/**
 * GENERATED FILE — do not edit prices by hand.
 *
 * NON-AUTHORITATIVE generated derivative — offline / STALE fallback only.
 * Runtime source of truth: database via GET /api/v1/menu/catalog.
 * Bootstrap catalog (editable import board): data/catalog/telepizza-canonical-menu.json
 * Generator: node scripts/generate-menu-fallback-from-canonical.mjs
 *
 * Every entry is one sellable SKU with exactly one price. Sizes are separate SKUs sharing a
 * \`productGroupSlug\`; there is no variant price matrix.
 *
 * Manifest status: ${canonical.completionStatus}
 * Generated from canonical dated: ${canonical.generatedAt}
 * SOURCE_CHECKSUM_SHA256: ${sourceChecksum}
 */
import type { MenuItem } from "@/lib/telepizza-types";
import { withMenuItemImages } from "@/lib/menu-images";

/** SHA-256 of data/catalog/telepizza-canonical-menu.json at generation time. */
export const MENU_FALLBACK_SOURCE_CHECKSUM = "${sourceChecksum}";

/** Explicitly marks this module as offline fallback — never display as LIVE. */
export const MENU_FALLBACK_AUTHORITY = "OFFLINE_FALLBACK" as const;

export type MenuSize = "Small" | "Medium" | "Large";
export type { MenuItem } from "@/lib/telepizza-types";

/** Customer browse categories only. Toppings are internal catalog SKUs, not a menu tab. */
export const menuCategories = [
${menuCategoriesBlock},
] as const;

const baseMenuItems: MenuItem[] = [
${itemsBlock},
];

export const menuItems: MenuItem[] = withMenuItemImages(baseMenuItems);
`;

writeFileSync(outPath, content, "utf8");
console.log(
  `Wrote ${outPath} (${browseItems.length} browse families -> ${browseSkuCount} SKUs, ` +
    `${toppingItems.length} topping families -> ${toppingSkuCount} SKUs)`,
);
console.log(`SOURCE_CHECKSUM_SHA256=${sourceChecksum}`);
if (browseItems.length !== 58 || toppingItems.length !== 3) {
  console.error("Unexpected counts");
  process.exit(1);
}

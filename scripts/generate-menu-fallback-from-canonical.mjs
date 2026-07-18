/**
 * Generates apps/website/client/src/data/menu-data.ts from the canonical manifest.
 * Do not edit prices in the generated file — edit data/catalog/telepizza-canonical-menu.json
 * (via scripts/build-canonical-menu.mjs) then regenerate.
 *
 * Usage: node scripts/generate-menu-fallback-from-canonical.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = JSON.parse(
  readFileSync(join(root, "data", "catalog", "telepizza-canonical-menu.json"), "utf8"),
);
const outPath = join(root, "apps", "website", "client", "src", "data", "menu-data.ts");

const sellableCats = canonical.categories
  .filter((c) => c.lifecycle === "sellable")
  .sort((a, b) => a.sortOrder - b.sortOrder);

const browseItems = canonical.items.filter((i) => i.lifecycle === "sellable");
const toppingItems = canonical.items.filter((i) => i.lifecycle === "modifier-only");

function esc(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderVariants(variants) {
  if (!variants?.length) return null;
  const lines = variants.map((v) => {
    const parts = [`label: "${esc(v.label)}"`, `price: ${v.pricePkr}`];
    if (v.sizeCode) parts.push(`sizeCode: "${esc(v.sizeCode)}"`);
    if (v.isDefault) parts.push("isDefault: true");
    return `    { ${parts.join(", ")} }`;
  });
  return `[\n${lines.join(",\n")},\n  ]`;
}

function renderItem(item) {
  const lines = [
    `    id: "${esc(item.code)}"`,
    `    name: "${esc(item.name)}"`,
    `    category: "${esc(canonical.categories.find((c) => c.code === item.categoryCode)?.name ?? item.categoryCode)}"`,
  ];
  if (item.categoryCode === "toppings") {
    lines.push(`    categorySlug: "toppings"`);
  }
  lines.push(`    description:\n      "${esc(item.description)}"`);
  lines.push(`    image: "${esc(item.imageUrl)}"`);
  if (item.badge) lines.push(`    badge: "${esc(item.badge)}"`);
  if (item.productType === "topping") lines.push(`    productType: "topping"`);
  if (item.featured) lines.push(`    featured: true`);

  const variants = renderVariants(item.variants);
  if (variants) {
    lines.push(`    variants: ${variants}`);
  } else if (typeof item.basePricePkr === "number") {
    lines.push(`    price: ${item.basePricePkr}`);
  }

  return `  {\n${lines.join(",\n")},\n  }`;
}

const categoryNames = sellableCats.map((c) => c.name);
const menuCategoriesBlock = [
  '  "All"',
  ...categoryNames.map((n) => `  "${n}"`),
].join(",\n");

const allItems = [...browseItems, ...toppingItems];
const itemsBlock = allItems.map(renderItem).join(",\n");

const content = `/**
 * GENERATED FILE — do not edit prices by hand.
 *
 * Source of truth: data/catalog/telepizza-canonical-menu.json
 * Generator: node scripts/generate-menu-fallback-from-canonical.mjs
 * Live path: Supabase / API via MenuCatalogContext (preferred).
 * This file is the offline emergency fallback only (priced copy of canonical).
 *
 * Manifest status: ${canonical.completionStatus}
 * Generated from canonical dated: ${canonical.generatedAt}
 */
import type { MenuItem, MenuVariant } from "@/lib/telepizza-types";
import { withMenuItemImages } from "@/lib/menu-images";

export type MenuSize = "Small" | "Medium" | "Large";
export type { MenuItem, MenuVariant } from "@/lib/telepizza-types";

/** Customer browse categories only (13 + All). Toppings are internal catalog SKUs, not a menu tab. */
export const menuCategories = [
${menuCategoriesBlock},
] as const;

const baseMenuItems: MenuItem[] = [
${itemsBlock},
];

export const menuItems: MenuItem[] = withMenuItemImages(baseMenuItems);
`;

writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath} (${browseItems.length} browse + ${toppingItems.length} toppings)`);
if (browseItems.length !== 58 || toppingItems.length !== 3) {
  console.error("Unexpected counts");
  process.exit(1);
}

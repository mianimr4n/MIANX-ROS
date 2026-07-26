import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/** Mirrors website resolveCatalogToppingPrice (null-safe, no invented prices). */
function resolveCatalogToppingPrice(item, tier) {
  if (!item) return null;
  if (item.variants?.length) {
    const bySize = item.variants.find((variant) => variant.sizeCode === tier);
    if (bySize && typeof bySize.price === "number") return bySize.price;
    const labelMatch = item.variants.find((variant) => {
      const label = variant.label.toLowerCase();
      if (tier === "large") return label.includes("large");
      if (tier === "medium") return label.includes("medium");
      return label.includes("small");
    });
    if (labelMatch && typeof labelMatch.price === "number") return labelMatch.price;
    return null;
  }
  if (typeof item.price === "number") return item.price;
  return null;
}

test("Option B repair migration seeds 3 topping SKUs idempotently", () => {
  const migration = read("supabase/migrations/20260715153000_option_b_toppings_catalog_repair.sql");

  assert.match(migration, /on conflict \(slug\) do update/i);
  assert.match(migration, /on conflict \(menu_item_id, label\) do update/i);
  assert.match(migration, /'extra-chicken'/i);
  assert.match(migration, /'extra-cheese'/i);
  assert.match(migration, /'extra-cheese-slice'/i);
  assert.match(migration, /'topping'/i);
  assert.match(migration, /Verification SQL/i);
  assert.match(migration, /Rollback guidance/i);
  assert.match(migration, /begin;/i);
  assert.match(migration, /commit;/i);
});

test("static public categories remain 13 without Toppings chip", () => {
  const menuData = read("apps/website/client/src/data/menu-data.ts");
  const blockStart = menuData.indexOf("export const menuCategories");
  const blockEnd = menuData.indexOf("] as const", blockStart);
  const block = menuData.slice(blockStart, blockEnd);
  const names = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter((name) => name !== "All");

  assert.equal(names.length, 13);
  assert.equal(names.includes("Toppings"), false);
  assert.equal(names.includes("Broast"), false);
  assert.equal(names.includes("Dips"), true);
});

test("static fallback matches owner board: dips + zinger + pasta, no broast / specialty behari", () => {
  const menuData = read("apps/website/client/src/data/menu-data.ts");

  // Families are asserted by product group; sizes are separate SKUs inside each family.
  assert.match(menuData, /productGroupSlug: "extra-chicken"/);
  assert.match(menuData, /productGroupSlug: "extra-cheese"/);
  assert.match(menuData, /productGroupSlug: "extra-cheese-slice"/);
  assert.match(menuData, /productType: "topping"/);
  assert.match(menuData, /productGroupSlug: "zinger-burger"/);
  assert.match(menuData, /productGroupSlug: "special-pasta"/);
  assert.match(menuData, /productGroupSlug: "special-sauce-dip"/);
  assert.match(menuData, /productGroupSlug: "bone-fire-dip"/);
  assert.match(menuData, /productGroupSlug: "dip-sauce"/);
  assert.match(menuData, /productGroupSlug: "garlic-ranch-dip"/);
  assert.match(menuData, /productGroupSlug: "bihari-kabab"/);

  assert.equal(/productGroupSlug: "behari-kabab-pizza"/.test(menuData), false);
  assert.equal(/productGroupSlug: "quarter-broast"/.test(menuData), false);
  assert.equal(/category: "Broast"/.test(menuData), false);

  const familySlugs = [...menuData.matchAll(/productGroupSlug: "([^"]+)"/g)].map((match) => match[1]);
  const browseFamilies = new Set(
    familySlugs.filter(
      (slug) => !["extra-chicken", "extra-cheese", "extra-cheese-slice"].includes(slug),
    ),
  );
  assert.equal(browseFamilies.size, 58);
});

test("customizer price resolver maps S/M/L and cheese slice without inventing", () => {
  const chicken = {
    variants: [
      { label: "Small", sizeCode: "small", price: 50 },
      { label: "Medium", sizeCode: "medium", price: 100 },
      { label: "Large", sizeCode: "large", price: 150 },
    ],
  };
  const slice = { price: 60 };

  assert.equal(resolveCatalogToppingPrice(chicken, "small"), 50);
  assert.equal(resolveCatalogToppingPrice(chicken, "medium"), 100);
  assert.equal(resolveCatalogToppingPrice(chicken, "large"), 150);
  assert.equal(resolveCatalogToppingPrice(slice, "small"), 60);
  assert.equal(resolveCatalogToppingPrice(undefined, "small"), null);
  assert.equal(resolveCatalogToppingPrice({ variants: [{ label: "Small", sizeCode: "small", price: 50 }] }, "large"), null);
});

test("cart line identity keeps topping selections distinct", () => {
  const buildCartId = (menuSlug, variantId, extras) => {
    const extraSlug = extras.map((extra) => extra.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("-");
    return [menuSlug, variantId, extraSlug || null].filter(Boolean).join("--");
  };

  const plain = buildCartId("tele-special", "6-inch-small", []);
  const withCheese = buildCartId("tele-special", "6-inch-small", [{ label: "Extra Cheese (6 inch Small)" }]);
  const withBoth = buildCartId("tele-special", "6-inch-small", [
    { label: "Extra Cheese (6 inch Small)" },
    { label: "Extra Chicken (6 inch Small)" },
  ]);

  assert.notEqual(plain, withCheese);
  assert.notEqual(withCheese, withBoth);
  assert.equal(withCheese, buildCartId("tele-special", "6-inch-small", [{ label: "Extra Cheese (6 inch Small)" }]));
});

test("owner menu sync migration retires broast and seeds dips/zinger/pasta", () => {
  const migration = read("supabase/migrations/20260716160000_sync_owner_menu_catalog.sql");

  assert.match(migration, /'dips'/i);
  assert.match(migration, /'zinger-burger'/i);
  assert.match(migration, /'special-pasta'/i);
  assert.match(migration, /'special-sauce-dip'/i);
  assert.match(migration, /'garlic-ranch-dip'/i);
  assert.match(migration, /slug = 'broast'/i);
  assert.match(migration, /is_active = false/i);
  assert.match(migration, /'behari-kabab-pizza'/i);
  assert.match(migration, /is_available = false/i);
  assert.match(migration, /on conflict \(slug\) do update/i);
  assert.match(migration, /begin;/i);
  assert.match(migration, /commit;/i);
});

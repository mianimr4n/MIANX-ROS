import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("canonical manifest exists at the single required path", () => {
  assert.equal(existsSync(join(root, "data", "catalog", "telepizza-canonical-menu.json")), true);
});

test("canonical freeze counts: 58 sellable / 3 toppings / 40 variants / 7 deals / 13 public cats", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  const sellable = catalog.items.filter((i) => i.lifecycle === "sellable");
  const toppings = catalog.items.filter((i) => i.lifecycle === "modifier-only");
  const publicCats = catalog.categories.filter((c) => c.lifecycle === "sellable");
  const variants = [...sellable, ...toppings].reduce((n, i) => n + (i.variants?.length || 0), 0);
  const deals = sellable.filter((i) => i.productType === "deal");

  assert.equal(publicCats.length, 13);
  assert.equal(sellable.length, 58);
  assert.equal(toppings.length, 3);
  assert.equal(variants, 40);
  assert.equal(deals.length, 7);
  assert.equal(catalog.freezeBaseline.browseItems, 58);
});

test("canonical uses stable codes not UUIDs as identity", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const item of catalog.items) {
    assert.ok(item.code, "item.code required");
    assert.equal(uuid.test(item.code), false);
  }
});

test("no Broast in sellable browse; broast retained as discontinued", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  const sellable = catalog.items.filter((i) => i.lifecycle === "sellable");
  assert.equal(sellable.some((i) => i.categoryCode === "broast"), false);
  const discontinuedBroast = catalog.items.filter(
    (i) => i.lifecycle === "discontinued" && i.categoryCode === "broast",
  );
  assert.ok(discontinuedBroast.length >= 3);
});

test("sauces are Dips SKUs — no separate sauce tables invented", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  const dips = catalog.items.filter((i) => i.lifecycle === "sellable" && i.categoryCode === "dips");
  assert.equal(dips.length, 4);
  assert.equal(existsSync(join(root, "supabase", "migrations")), true);
  const migrations = read("supabase/migrations/20260718180000_sync_canonical_menu_catalog.sql");
  assert.equal(/create table.*sauces/i.test(migrations), false);
  assert.equal(/create table.*broast/i.test(migrations), false);
});

test("temporary Eid/Iftar offers are not evergreen sellable", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  assert.ok(Array.isArray(catalog.temporaryOffers));
  assert.ok(catalog.temporaryOffers.length >= 4);
  for (const offer of catalog.temporaryOffers) {
    assert.equal(offer.temporary, true);
    assert.notEqual(offer.lifecycle, "sellable");
  }
});

test("owner gaps are inactive and not sellable", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  for (const gap of catalog.ownerGapsNotInV1Sellable) {
    assert.equal(gap.sellable, false);
    assert.equal(gap.lifecycle, "owner-confirmation-required");
  }
});

test("completion status records founder expand price lock", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  assert.match(catalog.completionStatus, /OWNER_PRICES_LOCKED_EXPAND_20260725120000/);
  assert.ok(catalog.founderPriceDecision?.rule);
  assert.equal(catalog.founderPriceDecision.examples["tele-special-medium"], 1250);
  const tele = catalog.items.find((item) => item.code === "tele-special");
  assert.equal(tele.variants.find((v) => v.sizeCode === "small").pricePkr, 620);
  assert.equal(tele.variants.find((v) => v.sizeCode === "medium").pricePkr, 1250);
  assert.equal(tele.variants.find((v) => v.sizeCode === "large").pricePkr, 1890);
  for (const item of catalog.items) {
    assert.equal((item.flags ?? []).includes("OWNER_CONFIRMATION_REQUIRED"), false);
  }
});

test("canonical sync migration is forward-only (no destructive delete)", () => {
  const migration = read("supabase/migrations/20260718180000_sync_canonical_menu_catalog.sql");
  assert.match(migration, /on conflict \(slug\) do update/i);
  assert.match(migration, /is_available = false/i);
  assert.match(migration, /OWNER APPROVAL REQUIRED/i);
  assert.equal(/\bdelete from public\.menu_items\b/i.test(migration), false);
  assert.equal(/\btruncate\b/i.test(migration), false);
});

test("generated website fallback matches canonical sellable codes", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  const menuData = read("apps/website/client/src/data/menu-data.ts");
  assert.match(menuData, /GENERATED FILE/);
  assert.match(menuData, /telepizza-canonical-menu\.json/);
  // Each canonical product is a product family; each independently priced size is its own SKU.
  const sellable = catalog.items.filter((i) => i.lifecycle === "sellable");
  for (const item of sellable) {
    assert.match(menuData, new RegExp(`productGroupSlug: "${item.code}"`));
  }
  assert.equal(/id: "quarter-broast"/.test(menuData), false);
  assert.equal(/category: "Broast"/.test(menuData), false);
  assert.equal(/variants: \[/.test(menuData), false, "fallback must not carry a variant price matrix");
});

test("every generated fallback SKU carries exactly one price", () => {
  const menuData = read("apps/website/client/src/data/menu-data.ts");
  // Normalize CRLF so Windows checkouts match the LF object-literal contract.
  const normalized = menuData.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const skuBlocks = normalized.split(/\n  \{\n/).slice(1);
  assert.ok(skuBlocks.length > 0, "expected SKU object literals in the fallback");
  for (const block of skuBlocks) {
    const prices = block.match(/^    price: \d+(?:\.\d+)?,$/gm) ?? [];
    assert.equal(prices.length, 1, `expected one price per SKU, saw ${prices.length}`);
  }
});

test("generated fallback SKU count matches canonical variant expansion", () => {
  const catalog = readJson("data/catalog/telepizza-canonical-menu.json");
  const menuData = read("apps/website/client/src/data/menu-data.ts");
  const expected = catalog.items
    .filter((item) => item.lifecycle === "sellable" || item.lifecycle === "modifier-only")
    .reduce((sum, item) => sum + Math.max(1, item.variants?.length ?? 0), 0);
  const actual = (menuData.match(/^    productGroupSlug: /gm) ?? []).length;
  assert.equal(actual, expected);
});

test("static modifier linked SKU deltas align to canonical drink/fries/slice prices", () => {
  const modifiers = read("apps/website/client/src/data/modifier-catalog.ts");
  assert.match(modifiers, /extra-cheese-slice[\s\S]*priceDelta: 60/);
  assert.match(modifiers, /drink-500ml[\s\S]*priceDelta: 140/);
  assert.match(modifiers, /drink-1l[\s\S]*priceDelta: 200/);
  assert.match(modifiers, /drink-1-5l[\s\S]*priceDelta: 250/);
  assert.match(modifiers, /family-fries[\s\S]*priceDelta: 390/);
  assert.match(modifiers, /loaded-fries[\s\S]*priceDelta: 790/);
});

test("website loader documents the single runtime source of truth", () => {
  const loader = read("apps/website/client/src/lib/menu-catalog.ts");
  // Only the database via the canonical Menu API is authoritative at runtime.
  assert.match(loader, /Runtime source of truth: database via GET \/api\/v1\/menu\/catalog/);
  assert.match(loader, /Bootstrap catalog: data\/catalog\/telepizza-canonical-menu\.json/);
  assert.match(loader, /NON-AUTHORITATIVE/);
  assert.match(loader, /telepizza-canonical-menu\.json/);
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Frontend contract for the canonical single-price menu domain.
 *
 * Every selectable option a customer, cashier or owner sees is an exact sellable SKU with
 * exactly one price. Product families are presentation grouping only. No surface may read
 * a variant price matrix.
 */

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/**
 * Source with comments and string literals removed, so a deprecation note mentioning
 * `menu_item_variants` is not mistaken for a runtime dependency on it.
 */
function readCode(relativePath) {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
}

/** Terms that would mean a runtime path still depends on the deprecated variant model. */
const VARIANT_PRICING = /menu_item_variants|\bitem\.variants\b|\bproduct\.variants\b|\bvariantId\b|getDefaultVariant|resolveVariantPrice/;

function assertNoVariantPricing(relativePath) {
  assert.doesNotMatch(
    readCode(relativePath),
    VARIANT_PRICING,
    `${relativePath} still depends on the deprecated variant pricing model`,
  );
}

describe("canonical single-price menu — customer website", () => {
  it("groups families but sells SKUs: the menu grid selects one option per family", () => {
    const menu = read("apps/website/client/src/pages/Menu.tsx");

    assert.match(menu, /groups,/, "menu reads product families from the catalog");
    assert.match(menu, /getSelectedSku\(group\)/, "each family tracks one selected SKU");
    assert.match(menu, /group\.options\.length > 1/, "size chips only render for multi-SKU families");
    assert.match(menu, /group\.options\.map\(\(option\)/, "size chips iterate real SKUs");
    assert.match(menu, /option\.sizeLabel \?\? option\.name/, "each chip is labelled by its SKU");
    assertNoVariantPricing("apps/website/client/src/pages/Menu.tsx");
  });

  it("the configurator prices from the selected SKU, not a base price plus a delta", () => {
    const configurator = read("apps/website/client/src/components/menu/ProductConfigurator.tsx");

    assert.match(configurator, /group\.options/, "options are sibling SKUs");
    assert.match(configurator, /selectedSkuId/, "selection is by SKU id");
    assert.match(configurator, /const basePrice = item\.price/, "the line price is the SKU price");
    assert.match(configurator, /menuItemId: item\.id/, "the cart carries the exact SKU id");
    assertNoVariantPricing("apps/website/client/src/components/menu/ProductConfigurator.tsx");
  });

  it("a product card advertises its family's default SKU price", () => {
    const card = read("apps/website/client/src/components/menu/ProductCard.tsx");

    assert.match(card, /group: MenuProductGroup/);
    assert.match(card, /getDefaultSku\(group\)/);
    assert.match(card, /addMenuItem\(defaultSku\)/, "adding a card adds one exact SKU");
    assertNoVariantPricing("apps/website/client/src/components/menu/ProductCard.tsx");
  });

  it("the cart snapshot records the SKU id, name, size label and unit price", () => {
    const utils = read("apps/website/client/src/lib/menu-utils.ts");
    const cart = read("apps/website/client/src/contexts/CartContext.tsx");

    assert.match(utils, /menuItemId: item\.id/);
    assert.match(utils, /price: item\.price/);
    assert.match(utils, /variant: item\.sizeLabel/);
    assert.match(cart, /menuItemId\?: string/, "cart lines carry the exact SKU id");
  });

  it("checkout forwards the SKU id to the server for authoritative pricing", () => {
    const checkoutOrder = read("apps/website/client/src/lib/checkout-order.ts");
    const checkout = read("apps/website/client/src/pages/Checkout.tsx");

    assert.match(checkoutOrder, /menuItemId: item\.menuItemId/);
    assert.match(checkout, /menuItemId: item\.menuItemId/);
  });

  it("category price hints are derived from the catalog, never hard-coded", () => {
    const strip = read("apps/website/client/src/components/home/CategoryStrip.tsx");

    assert.match(strip, /Math\.min\(\.\.\.prices\)/);
    assert.doesNotMatch(strip, /From Rs \d/, "no literal price may ship in the category strip");
  });

  it("the catalog context exposes loading, error, fallback and reload states", () => {
    const context = read("apps/website/client/src/contexts/MenuCatalogContext.tsx");

    assert.match(context, /isLoading: boolean/);
    assert.match(context, /error: string \| null/);
    assert.match(context, /usingFallback: boolean/);
    assert.match(context, /reloadCatalog: \(\) => Promise<void>/);
    assert.match(context, /groups: MenuProductGroup\[\]/);
  });

  it("the menu page renders loading, empty and error states with a retry", () => {
    const menu = read("apps/website/client/src/pages/Menu.tsx");

    assert.match(menu, /isLoading/);
    assert.match(menu, /<Spinner/);
    assert.match(menu, /<Empty/);
    assert.match(menu, /reloadCatalog/);
    assert.match(menu, /AlertCircle/, "a stale/fallback catalog is surfaced, not hidden");
  });
});

describe("canonical single-price menu — POS", () => {
  it("POS tiles are families and the cashier picks an exact SKU", () => {
    const pos = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    const grid = read("apps/website/client/src/components/admin/pos/ProductGrid.tsx");
    const modal = read("apps/website/client/src/components/admin/pos/ProductConfigureModal.tsx");

    assert.match(pos, /groups,/);
    assert.match(pos, /itemNeedsConfiguration\(group\)/);
    assert.match(pos, /menuItemId: sku\.id/, "the POS line carries the exact SKU id");
    assert.match(grid, /groups: MenuProductGroup\[\]/);
    assert.match(modal, /group: MenuProductGroup \| null/);
    assert.match(modal, /menuItemId: sku\.id/);
    assertNoVariantPricing("apps/website/client/src/pages/admin/AdminPos.tsx");
    assertNoVariantPricing("apps/website/client/src/components/admin/pos/ProductConfigureModal.tsx");
  });

  it("a POS tile shows one price, taken from its default SKU", () => {
    const helpers = read("apps/website/client/src/lib/admin-pos.ts");

    assert.match(helpers, /export function defaultSku\(group: MenuProductGroup\)/);
    assert.match(helpers, /defaultSku\(group\)\?\.price \?\? 0/);
    assert.match(helpers, /menuItemId: string/);
    assertNoVariantPricing("apps/website/client/src/lib/admin-pos.ts");
  });

  it("POS quotes and orders submit the SKU id, never a client price", () => {
    const api = read("apps/website/client/src/lib/admin-api.ts");

    assert.match(api, /menuItemId\?: string/);
    assertNoVariantPricing("apps/website/client/src/lib/admin-api.ts");
  });
});

describe("canonical single-price menu — Admin workspace", () => {
  it("the owner edits one Price (PKR) field guarded by menu.write", () => {
    const pricing = read("apps/website/client/src/components/admin/menu/PricingPanel.tsx");

    assert.match(pricing, /Price \(PKR\)/);
    assert.match(pricing, /canWrite/);
    assert.match(pricing, /onSave\(\{ price: parsed, isAvailable: available \}\)/);
    assertNoVariantPricing("apps/website/client/src/components/admin/menu/PricingPanel.tsx");
  });

  it("the drawer lists sibling SKUs instead of a variant matrix", () => {
    const drawer = read("apps/website/client/src/components/admin/menu/ProductDrawer.tsx");
    const family = read("apps/website/client/src/components/admin/menu/SkuFamilyPanel.tsx");

    assert.match(drawer, /SkuFamilyPanel/);
    assert.doesNotMatch(drawer, /VariantManager/);
    assert.match(family, /family\.map\(\(sibling\)/);
    assert.match(family, /formatPkr\(sibling\.price\)/, "every sibling shows its own single price");
  });

  it("price edits and audit history go through the admin menu API", () => {
    const admin = read("apps/website/client/src/pages/admin/AdminMenu.tsx");
    const api = read("apps/website/client/src/lib/admin-menu-api.ts");

    assert.match(admin, /updateMenuSku/);
    assert.match(admin, /listMenuAuditEvents/);
    assert.match(admin, /canWrite/);
    assert.match(api, /\/admin\/menu\/products/);
    assert.match(api, /\/admin\/menu\/audit/);
    assertNoVariantPricing("apps/website/client/src/lib/admin-menu-api.ts");
  });

  it("menu KPIs count SKUs and families, not variants", () => {
    const kpis = read("apps/website/client/src/components/admin/menu/MenuKPIs.tsx");
    const helpers = read("apps/website/client/src/lib/admin-menu.ts");

    assert.match(kpis, /Sellable SKUs/);
    assert.match(kpis, /Product families/);
    assert.doesNotMatch(kpis, /variantCount|Variants/);
    assert.match(helpers, /productFamilies: number/);
    assertNoVariantPricing("apps/website/client/src/lib/admin-menu.ts");
  });
});

describe("canonical single-price menu — offline fallback", () => {
  it("every fallback SKU is a flat record with exactly one price", () => {
    const menuData = read("apps/website/client/src/data/menu-data.ts");

    assert.doesNotMatch(menuData, /variants: \[/, "the fallback carries no variant price matrix");

    const skuBlocks = menuData.match(/^ {2}\{\n(?: {4}.*\n)+ {2}\},$/gm) ?? [];
    assert.ok(skuBlocks.length > 0, "expected SKU object literals in the fallback");
    for (const block of skuBlocks) {
      const prices = block.match(/^ {4}price: \d+(?:\.\d+)?,$/gm) ?? [];
      assert.equal(prices.length, 1, `expected exactly one price per SKU, saw ${prices.length}`);
    }
  });

  it("the shared MenuItem type makes price required", () => {
    const types = read("apps/website/client/src/lib/telepizza-types.ts");

    assert.match(types, /price: number;/);
    assert.doesNotMatch(types, /price\?: number;/);
  });
});

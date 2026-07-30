/**
 * Menu Management V1 — composition and honesty wiring (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Menu Management V1 (static)", () => {
  it("composes /admin/menu from reusable menu components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminMenu.tsx");
    assert.match(page, /MenuHeader/);
    assert.match(page, /MenuCatalogBanner/);
    assert.match(page, /MenuKPIs/);
    assert.match(page, /MenuFiltersWithCategories/);
    assert.match(page, /CategoryTree/);
    assert.match(page, /MenuProductGrid/);
    assert.match(page, /ProductDrawer/);
    assert.match(page, /MenuInsights/);
    assert.match(page, /canAccessAdminMenu/);
    assert.match(page, /useMenuCatalog/);
    assert.match(page, /mergeCatalogProducts/);
  });

  it("drawer includes modifier, SKU family, pricing, availability, and publishing panels", () => {
    const drawer = read("apps/website/client/src/components/admin/menu/ProductDrawer.tsx");
    assert.match(drawer, /ModifierManager/);
    assert.match(drawer, /SkuFamilyPanel/);
    assert.match(drawer, /PricingPanel/);
    assert.match(drawer, /AvailabilityPanel/);
    assert.match(drawer, /PublishingPanel/);
    assert.match(drawer, /Escape/);
    assert.doesNotMatch(drawer, /VariantManager/);
  });

  it("owner price editing is a single Price (PKR) field, never a variant matrix", () => {
    const pricing = read("apps/website/client/src/components/admin/menu/PricingPanel.tsx");
    assert.match(pricing, /Price \(PKR\)/);
    assert.match(pricing, /canWrite/);
    assert.match(pricing, /menu\.write/);
    assert.match(pricing, /audit trail/i);
    assert.doesNotMatch(pricing, /product\.variants|variantId|menu_item_variants/);
  });

  it("admin menu writes go through menu.write endpoints with an audit read", () => {
    const api = read("apps/website/client/src/lib/admin-menu-api.ts");
    assert.match(api, /\/admin\/menu\/categories/);
    assert.match(api, /\/admin\/menu\/products/);
    assert.match(api, /\/admin\/menu\/items\//);
    assert.match(api, /\/availability/);
    assert.match(api, /\/admin\/menu\/audit/);
    assert.doesNotMatch(api, /menu_item_variants/);

    const page = read("apps/website/client/src/pages/admin/AdminMenu.tsx");
    assert.match(page, /updateMenuSku/);
    assert.match(page, /updateMenuItemAvailability/);
    assert.match(page, /createMenuSku/);
    assert.match(page, /createMenuCategory/);
    assert.match(page, /updateMenuCategory/);
    assert.match(page, /listMenuAuditEvents/);
    assert.match(page, /canManageMenu/);
  });

  it("labels unavailable KPIs and disabled bulk actions honestly", () => {
    const kpis = read("apps/website/client/src/components/admin/menu/MenuKPIs.tsx");
    assert.match(kpis, /Hidden products/);
    assert.match(kpis, /UNAVAILABLE/);
    assert.match(kpis, /Published \/ Draft/);
    assert.match(kpis, /catalogMode|PARTIAL/);
    assert.match(kpis, /fallback/);
    const page = read("apps/website/client/src/pages/admin/AdminMenu.tsx");
    assert.match(page, /catalogMode=\{usingFallback \? "fallback" : "live"\}/);
    const header = read("apps/website/client/src/components/admin/menu/MenuHeader.tsx");
    assert.match(header, /Export · Planned for Phase 2/);
    assert.match(header, /Import · Planned for Phase 2/);
    assert.match(header, /Bulk actions · Planned for Phase 2/);
    assert.match(header, /Live write APIs/);
  });

  it("publishing panel does not claim full channel admin control", () => {
    const publishing = read("apps/website/client/src/components/admin/menu/PublishingPanel.tsx");
    assert.match(publishing, /no per-SKU publish toggles/i);
    assert.match(publishing, /Future/);
    assert.match(publishing, /Partial/);
    assert.doesNotMatch(publishing, /toggle.*publish|published: true/i);
  });

  it("Mianx menu insights are rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/menu/MenuInsights.tsx");
    assert.match(insights, /Mianx\.ai Menu Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /\bLLM\b|AI pricing|recommendation engine/i);
    const helper = read("apps/website/client/src/lib/admin-menu.ts");
    assert.match(helper, /buildMenuInsights/);
    assert.match(helper, /one sellable SKU with exactly one price/i);
  });

  it("gates /admin/menu with canAccessAdminMenu (menu.write)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminMenu/);
    assert.match(access, /canManageMenu/);
    assert.match(access, /requiresMenu/);
    assert.match(access, /href: "\/admin\/menu"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminMenu/);
    assert.match(app, /path="\/admin\/menu"/);
    assert.doesNotMatch(app, /MenuComingSoon/);
    const page = read("apps/website/client/src/pages/admin/AdminMenu.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("category tree documents flat catalog and coming-soon hierarchy", () => {
    const tree = read("apps/website/client/src/components/admin/menu/CategoryTree.tsx");
    assert.match(tree, /role="tree"/);
    assert.match(tree, /Multi-level trees/);
    assert.match(tree, /Planned for Phase 2/);
  });

  it("wires availability toggle and menu update toast", () => {
    const page = read("apps/website/client/src/pages/admin/AdminMenu.tsx");
    assert.match(page, /updateMenuItemAvailability/);
    assert.match(page, /Menu updated successfully/);
    const grid = read("apps/website/client/src/components/admin/menu/ProductGrid.tsx");
    assert.match(grid, /onToggleAvailability/);
    assert.match(grid, /Available/);
  });
});

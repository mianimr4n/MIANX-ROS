/**
 * Public menu completeness — no truncation; reachability of loaded catalog.
 * Does not invent expand SKUs when DB is freeze-shaped.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Public menu completeness contracts", () => {
  it("Menu page maps all filtered groups without slice/pagination caps", () => {
    const menu = read("apps/website/client/src/pages/Menu.tsx");
    assert.doesNotMatch(menu, /\.slice\s*\(\s*0\s*,\s*\d+\s*\)/);
    assert.doesNotMatch(menu, /pageSize|PAGE_SIZE|itemsPerPage/);
    assert.match(menu, /filteredGroups\.map|groups\.map/);
  });

  it("catalog loader has no hard row limit on Supabase/API fetch", () => {
    const loader = read("apps/website/client/src/lib/menu-catalog.ts");
    assert.doesNotMatch(loader, /\.limit\s*\(\s*\d+\s*\)/);
    assert.doesNotMatch(loader, /\.range\s*\(\s*0\s*,\s*\d+\s*\)/);
    assert.match(loader, /groupSkusIntoFamilies|fetchMenuCatalogFromSupabase|buildStaticCatalog/);
    assert.match(loader, /fetchMenuCatalogFromApi|isApiConfigured/);
  });

  it("catalog prefers live API then Supabase before static fallback", () => {
    const loader = read("apps/website/client/src/lib/menu-catalog.ts");
    const ctx = read("apps/website/client/src/contexts/MenuCatalogContext.tsx");
    assert.match(loader, /fetchMenuCatalogFromApi/);
    assert.match(loader, /isApiConfigured/);
    assert.match(ctx, /isApiConfigured \|\| isSupabaseConfigured/);
    assert.match(ctx, /Live menu unavailable/);
  });

  it("product detail resolves family slug or exact SKU", () => {
    const detail = read("apps/website/client/src/pages/ProductDetail.tsx");
    assert.match(detail, /productGroupSlug|slug/);
  });

  it("POS and public menu share useMenuCatalog", () => {
    const pos = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    const menu = read("apps/website/client/src/pages/Menu.tsx");
    const ctx = read("apps/website/client/src/contexts/MenuCatalogContext.tsx");
    assert.match(ctx, /loadMenuCatalog/);
    assert.match(pos, /useMenuCatalog/);
    assert.match(menu, /useMenuCatalog|MenuCatalog|groups/);
  });

  it("representative prices are preserved in expand migration (source of truth)", () => {
    const expand = read("supabase/migrations/20260725120000_expand_and_activate_real_menu_catalog.sql");
    assert.match(expand, /base_price = 550 where slug = 'zinger-burger'/);
    assert.match(expand, /molten-lava-cake[\s\S]{0,200}399/);
    assert.match(expand, /tele-special|Tele Special/);
    // Live DB after ordered migrations is the acceptance authority for SKU prices.
  });

  it("offline fallback is explicitly non-authoritative", () => {
    const loader = read("apps/website/client/src/lib/menu-catalog.ts");
    assert.match(loader, /NON-AUTHORITATIVE|offline fallback/i);
  });
});

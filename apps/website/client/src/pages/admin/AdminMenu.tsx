import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { CategoryTree } from "@/components/admin/menu/CategoryTree";
import { MenuCatalogBanner } from "@/components/admin/menu/MenuCatalogBanner";
import { MenuFiltersWithCategories } from "@/components/admin/menu/MenuFilters";
import { MenuHeader } from "@/components/admin/menu/MenuHeader";
import { MenuInsights } from "@/components/admin/menu/MenuInsights";
import { MenuKPIs } from "@/components/admin/menu/MenuKPIs";
import { MenuProductGrid } from "@/components/admin/menu/ProductGrid";
import { ProductDrawer } from "@/components/admin/menu/ProductDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { canAccessAdminMenu, primaryRoleLabel } from "@/lib/admin-access";
import {
  buildMenuInsights,
  buildMenuKpis,
  categoryTreeEntries,
  filterMenuProducts,
  mergeCatalogProducts,
  type MenuCatalogItemView,
  type MenuFilterState,
} from "@/lib/admin-menu";
import { AdminShell } from "./AdminShell";

function readFilters(search: string): MenuFilterState & { selected: string } {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    categorySlug: params.get("category") ?? "",
    productType: params.get("type") ?? "",
    featuredOnly: params.get("featured") === "1",
    hasModifiersOnly: params.get("modifiers") === "1",
    search: params.get("q") ?? "",
    selected: params.get("selected") ?? "",
  };
}

export default function AdminMenu() {
  const { permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel } = useAdminBranch();
  const { items, toppings, categories, isLoading, error, source, usingFallback, reloadCatalog } =
    useMenuCatalog();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);

  const allowed = canAccessAdminMenu({ roles, permissions, isSuperAdmin });
  useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [drawerProduct, setDrawerProduct] = useState<MenuCatalogItemView | null>(null);

  const products = useMemo(() => mergeCatalogProducts(items, toppings), [items, toppings]);

  const filters: MenuFilterState = {
    categorySlug: urlState.categorySlug,
    productType: urlState.productType,
    featuredOnly: urlState.featuredOnly,
    hasModifiersOnly: urlState.hasModifiersOnly,
    search: urlState.search,
  };

  const filtered = useMemo(() => filterMenuProducts(products, filters), [products, filters]);
  const kpis = useMemo(() => buildMenuKpis(products), [products]);
  const insights = useMemo(() => buildMenuInsights(products), [products]);
  const treeEntries = useMemo(() => categoryTreeEntries(categories, products), [categories, products]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ slug: category.slug ?? category.name, name: category.name })),
    [categories],
  );

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.categorySlug) params.set("category", merged.categorySlug);
      if (merged.productType) params.set("type", merged.productType);
      if (merged.featuredOnly) params.set("featured", "1");
      if (merged.hasModifiersOnly) params.set("modifiers", "1");
      if (merged.search) params.set("q", merged.search);
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/menu?${qs}` : "/admin/menu");
    },
    [setLocation, urlState],
  );

  useEffect(() => {
    setSearchDraft(urlState.search);
  }, [urlState.search]);

  useEffect(() => {
    if (!urlState.selected) {
      setDrawerProduct(null);
      return;
    }
    const match = products.find((p) => p.id === urlState.selected || p.slug === urlState.selected);
    setDrawerProduct(match ?? null);
  }, [products, urlState.selected]);

  const sourceLabel =
    source === "supabase"
      ? "Supabase / GET /api/v1/menu/catalog"
      : usingFallback
        ? "Static fallback"
        : "Static catalog";

  const openProduct = (product: MenuCatalogItemView) => {
    writeUrl({ selected: product.slug ?? product.id });
  };

  const closeDrawer = () => {
    writeUrl({ selected: "" });
  };

  return (
    <AdminShell title="Menu Management">
      <MenuHeader
        branchLabel={branchLabel}
        roleLabel={roleLabel}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onSearch={() => writeUrl({ search: searchDraft })}
        onRefresh={() => void reloadCatalog()}
        live={!usingFallback && !error}
        sourceLabel={sourceLabel}
      />

      <MenuCatalogBanner usingFallback={usingFallback} />

      <MenuKPIs
        snapshot={kpis}
        loading={isLoading}
        sourceNote={usingFallback ? "Static fallback catalog" : "Live catalog"}
      />

      <MenuFiltersWithCategories
        filters={filters}
        onChange={(next) => writeUrl(next)}
        onApplySearch={() => writeUrl({ search: searchDraft })}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        categoryOptions={categoryOptions}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(14rem,18rem)_1fr]">
        <CategoryTree
          entries={treeEntries}
          activeSlug={filters.categorySlug}
          onSelect={(slug) => writeUrl({ categorySlug: slug })}
          loading={isLoading}
        />

        <div>
          <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)]/95 px-4 py-3 backdrop-blur">
            <p className="text-sm font-semibold">
              {filtered.length} product{filtered.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-[var(--admin-muted)]">Read-only grid · Select a card for detail drawer</p>
          </div>
          <MenuProductGrid
            products={filtered}
            loading={isLoading}
            error={error}
            onRetry={() => void reloadCatalog()}
            onOpen={openProduct}
          />
        </div>
      </div>

      <MenuInsights items={insights} />

      <ProductDrawer open={Boolean(drawerProduct)} product={drawerProduct} onClose={closeDrawer} />
    </AdminShell>
  );
}

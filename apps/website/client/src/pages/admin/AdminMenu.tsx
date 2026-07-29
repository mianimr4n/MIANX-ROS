import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { CategoryManager } from "@/components/admin/menu/CategoryManager";
import { CategoryTree } from "@/components/admin/menu/CategoryTree";
import { CreateSkuDialog } from "@/components/admin/menu/CreateSkuDialog";
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
  familyKey,
  filterMenuProducts,
  mergeCatalogProducts,
  type MenuCatalogItemView,
  type MenuFilterState,
} from "@/lib/admin-menu";
import {
  createMenuCategory,
  createMenuSku,
  listMenuAuditEvents,
  listMenuCategories,
  updateMenuCategory,
  updateMenuSku,
  type AdminMenuAuditEvent,
  type AdminMenuCategory,
  type CreateMenuSkuBody,
  type UpdateMenuSkuBody,
} from "@/lib/admin-menu-api";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
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

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return error instanceof Error ? error.message : "Request failed.";
}

export default function AdminMenu() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { label: branchLabel } = useAdminBranch();
  const { items, toppings, categories, isLoading, error, source, usingFallback, reloadCatalog } =
    useMenuCatalog();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);

  const allowed = canAccessAdminMenu({ roles, permissions, isSuperAdmin });
  useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);
  const accessToken = session?.access_token ?? null;
  const canWrite = Boolean(
    accessToken && isApiConfigured && (isSuperAdmin || permissions.includes("menu.write")),
  );

  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [drawerProduct, setDrawerProduct] = useState<MenuCatalogItemView | null>(null);
  const [adminCategories, setAdminCategories] = useState<AdminMenuCategory[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminMenuAuditEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

  const drawerFamily = useMemo(() => {
    if (!drawerProduct) return [];
    const key = familyKey(drawerProduct);
    return products.filter((product) => familyKey(product) === key);
  }, [drawerProduct, products]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ slug: category.slug ?? category.name, name: category.name })),
    [categories],
  );

  const drawerCategoryOptions = useMemo(
    () => adminCategories.map((category) => ({ id: category.id, name: category.name, slug: category.slug })),
    [adminCategories],
  );

  const loadAdminCategories = useCallback(async () => {
    if (!accessToken || !isApiConfigured) return;
    try {
      setAdminCategories(await listMenuCategories(accessToken));
      setCategoryError(null);
    } catch (err) {
      setCategoryError(errorMessage(err));
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAdminCategories();
  }, [loadAdminCategories]);

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

  // Audit trail is per-SKU: reload it whenever the drawer targets a different item.
  useEffect(() => {
    const skuId = drawerProduct?.id;
    if (!skuId || !accessToken || !isApiConfigured) {
      setAuditEvents([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMenuAuditEvents(accessToken, { resourceId: skuId, limit: 20 });
        if (!cancelled) setAuditEvents(rows);
      } catch {
        if (!cancelled) setAuditEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, drawerProduct?.id]);

  const sourceLabel =
    source === "api"
      ? "API GET /api/v1/menu/catalog"
      : source === "supabase"
        ? "Supabase (same catalog tables)"
        : usingFallback
          ? "Static fallback"
          : "Static catalog";

  const openProduct = (product: MenuCatalogItemView) => {
    setSaveError(null);
    writeUrl({ selected: product.slug ?? product.id });
  };

  const closeDrawer = () => {
    setSaveError(null);
    writeUrl({ selected: "" });
  };

  async function saveSku(patch: UpdateMenuSkuBody) {
    if (!accessToken || !drawerProduct) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateMenuSku(accessToken, drawerProduct.id, patch);
      await reloadCatalog();
      const rows = await listMenuAuditEvents(accessToken, { resourceId: drawerProduct.id, limit: 20 });
      setAuditEvents(rows);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(id: string, patch: { name?: string; sortOrder?: number; isActive?: boolean }) {
    if (!accessToken) return;
    setCategoryBusy(true);
    setCategoryError(null);
    try {
      await updateMenuCategory(accessToken, id, patch);
      await loadAdminCategories();
      await reloadCatalog();
    } catch (err) {
      setCategoryError(errorMessage(err));
    } finally {
      setCategoryBusy(false);
    }
  }

  async function addCategory(input: { name: string; slug: string; sortOrder: number }) {
    if (!accessToken) return;
    setCategoryBusy(true);
    setCategoryError(null);
    try {
      await createMenuCategory(accessToken, input);
      await loadAdminCategories();
      await reloadCatalog();
    } catch (err) {
      setCategoryError(errorMessage(err));
    } finally {
      setCategoryBusy(false);
    }
  }

  async function addSku(body: CreateMenuSkuBody) {
    if (!accessToken) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createMenuSku(accessToken, body);
      await reloadCatalog();
      await loadAdminCategories();
      setCreateOpen(false);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

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
        catalogMode={usingFallback ? "fallback" : "live"}
        sourceNote={
          isLoading
            ? "Loading catalog…"
            : usingFallback
              ? "Static fallback catalog (NON-AUTHORITATIVE)"
              : "Live catalog"
        }
      />

      <CategoryManager
        categories={adminCategories}
        canWrite={canWrite}
        busy={categoryBusy}
        error={categoryError}
        onCreate={(input) => void addCategory(input)}
        onUpdate={(id, patch) => void saveCategory(id, patch)}
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
              {filtered.length} sellable SKU{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--admin-muted)]">One price per SKU · select a card to edit</p>
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="min-h-9 rounded-lg bg-[var(--brand-red)] px-3 text-xs font-semibold text-white"
                >
                  New SKU
                </button>
              ) : null}
            </div>
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

      <ProductDrawer
        open={Boolean(drawerProduct)}
        product={drawerProduct}
        family={drawerFamily}
        categories={drawerCategoryOptions}
        canWrite={canWrite}
        saving={saving}
        saveError={saveError}
        auditEvents={auditEvents}
        onSave={(patch) => void saveSku(patch)}
        onOpenSibling={openProduct}
        onClose={closeDrawer}
      />

      <CreateSkuDialog
        open={createOpen}
        categories={adminCategories}
        busy={saving}
        error={saveError}
        onCreate={(body) => void addSku(body)}
        onClose={() => setCreateOpen(false)}
      />
    </AdminShell>
  );
}

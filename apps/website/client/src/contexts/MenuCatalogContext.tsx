import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getStaticMenuCatalog,
  loadMenuCatalog,
  type MenuCatalogSource,
} from "@/lib/menu-catalog";
import type { MenuCategory, MenuItem, MenuProductGroup } from "@/lib/telepizza-types";
import { isApiConfigured } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase";

interface MenuCatalogContextValue {
  /** Public browseable sellable SKUs — one price each (no topping SKUs). */
  items: MenuItem[];
  /** Presentation-only families grouping sibling size SKUs. */
  groups: MenuProductGroup[];
  /** Internal topping SKUs for Pizza Customizer. */
  toppings: MenuItem[];
  categories: MenuCategory[];
  availableCategories: string[];
  isLoading: boolean;
  error: string | null;
  source: MenuCatalogSource;
  usingFallback: boolean;
  reloadCatalog: () => Promise<void>;
}

const MenuCatalogContext = createContext<MenuCatalogContextValue | null>(null);

const staticCatalog = getStaticMenuCatalog();
const canLoadLiveCatalog = isApiConfigured || isSupabaseConfigured;

export function MenuCatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>(staticCatalog.items);
  const [groups, setGroups] = useState<MenuProductGroup[]>(staticCatalog.groups);
  const [toppings, setToppings] = useState<MenuItem[]>(staticCatalog.toppings);
  const [categories, setCategories] = useState<MenuCategory[]>(staticCatalog.categories);
  const [isLoading, setIsLoading] = useState(canLoadLiveCatalog);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<MenuCatalogSource>("static");
  const [usingFallback, setUsingFallback] = useState(false);

  const applyCatalog = useCallback(
    (catalog: {
      items: MenuItem[];
      groups: MenuProductGroup[];
      toppings: MenuItem[];
      categories: MenuCategory[];
      source: MenuCatalogSource;
    }) => {
      setItems(catalog.items);
      setGroups(catalog.groups);
      setToppings(catalog.toppings);
      setCategories(catalog.categories);
      setSource(catalog.source);
    },
    [],
  );

  const reloadCatalog = useCallback(async () => {
    if (!canLoadLiveCatalog) {
      const fallback = getStaticMenuCatalog();
      applyCatalog(fallback);
      setUsingFallback(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const catalog = await loadMenuCatalog();
      applyCatalog(catalog);
      setUsingFallback(false);
      setError(null);
    } catch (loadError) {
      console.warn("Live menu unavailable; using verified static fallback.", loadError);

      const fallback = getStaticMenuCatalog();
      applyCatalog(fallback);
      setUsingFallback(true);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the live menu. Showing the verified offline catalog.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyCatalog]);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  const availableCategories = useMemo(
    () => ["All", ...categories.map((category) => category.name)],
    [categories],
  );

  return (
    <MenuCatalogContext.Provider
      value={{
        items,
        groups,
        toppings,
        categories,
        availableCategories,
        isLoading,
        error,
        source,
        usingFallback,
        reloadCatalog,
      }}
    >
      {children}
    </MenuCatalogContext.Provider>
  );
}

export function useMenuCatalog() {
  const ctx = useContext(MenuCatalogContext);
  if (!ctx) {
    throw new Error("useMenuCatalog must be used within MenuCatalogProvider");
  }
  return ctx;
}

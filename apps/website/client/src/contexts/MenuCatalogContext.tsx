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
import type { MenuCategory, MenuItem } from "@/lib/telepizza-types";
import { isSupabaseConfigured } from "@/lib/supabase";

interface MenuCatalogContextValue {
  items: MenuItem[];
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

export function MenuCatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>(staticCatalog.items);
  const [categories, setCategories] = useState<MenuCategory[]>(staticCatalog.categories);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<MenuCatalogSource>("static");
  const [usingFallback, setUsingFallback] = useState(false);

  const reloadCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const fallback = getStaticMenuCatalog();
      setItems(fallback.items);
      setCategories(fallback.categories);
      setSource("static");
      setUsingFallback(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const catalog = await loadMenuCatalog();
      setItems(catalog.items);
      setCategories(catalog.categories);
      setSource(catalog.source);
      setUsingFallback(false);
      setError(null);
    } catch (loadError) {
      console.warn("Supabase menu unavailable; using verified static fallback.", loadError);

      const fallback = getStaticMenuCatalog();
      setItems(fallback.items);
      setCategories(fallback.categories);
      setSource("static");
      setUsingFallback(true);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the live menu. Showing the verified offline catalog.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  const context = useContext(MenuCatalogContext);

  if (!context) {
    throw new Error("useMenuCatalog must be used within a MenuCatalogProvider");
  }

  return context;
}

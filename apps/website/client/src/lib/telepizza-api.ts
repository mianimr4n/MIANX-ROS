import { fetchApiData } from "@/lib/api";
import type { Branch, MenuCategory, MenuItem } from "@/lib/telepizza-types";

interface MenuCatalogResponse {
  categories: MenuCategory[];
  items: MenuItem[];
}

export function fetchBranches() {
  return fetchApiData<Branch[]>("/branches");
}

export function fetchMenuCatalog() {
  return fetchApiData<MenuCatalogResponse>("/menu/catalog");
}

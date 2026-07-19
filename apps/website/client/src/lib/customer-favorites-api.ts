import { fetchApiData, isApiConfigured } from "@/lib/api";
import type { MenuItem } from "@/lib/telepizza-types";

export type CloudFavorite = {
  id: string;
  menuItemCode: string;
  createdAt: string;
};

let favoritesCache: Set<string> | null = null;
let favoritesCacheOwner: string | null = null;

export function invalidateFavoritesCache(): void {
  favoritesCache = null;
  favoritesCacheOwner = null;
}

export function favoriteCodeForItem(item: Pick<MenuItem, "id" | "slug">): string {
  return (item.slug ?? item.id).trim().toLowerCase();
}

export function isFavoriteCode(code: string): boolean {
  if (!favoritesCache) return false;
  return favoritesCache.has(code.trim().toLowerCase());
}

export async function fetchCloudFavorites(
  accessToken: string,
  ownerKey = accessToken,
): Promise<CloudFavorite[]> {
  const data = await fetchApiData<{ favorites: CloudFavorite[] }>("/me/favorites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const favorites = data.favorites ?? [];
  favoritesCache = new Set(favorites.map((entry) => entry.menuItemCode.toLowerCase()));
  favoritesCacheOwner = ownerKey;
  return favorites;
}

export async function addCloudFavorite(
  accessToken: string,
  itemCode: string,
): Promise<CloudFavorite> {
  const code = itemCode.trim().toLowerCase();
  const data = await fetchApiData<{ favorite: CloudFavorite }>(
    `/me/favorites/${encodeURIComponent(code)}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (favoritesCache) favoritesCache.add(code);
  return data.favorite;
}

export async function removeCloudFavorite(
  accessToken: string,
  itemCode: string,
): Promise<void> {
  const code = itemCode.trim().toLowerCase();
  await fetchApiData<{ removed: boolean }>(`/me/favorites/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (favoritesCache) favoritesCache.delete(code);
}

export function favoritesAvailable(): boolean {
  return isApiConfigured;
}

export function favoritesCacheReady(ownerKey: string): boolean {
  return favoritesCache !== null && favoritesCacheOwner === ownerKey;
}

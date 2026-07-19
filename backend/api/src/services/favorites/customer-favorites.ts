import { createClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import { ApiError } from "../../common/http.js";

export type FavoriteRecord = {
  id: string;
  menuItemCode: string;
  createdAt: string;
};

export interface CustomerFavoritesDataSource {
  listFavorites(authUserId: string): Promise<FavoriteRecord[]>;
  addFavorite(authUserId: string, menuItemCode: string): Promise<FavoriteRecord>;
  removeFavorite(authUserId: string, menuItemCode: string): Promise<void>;
}

type SupabaseLike = { from: (table: string) => any };

export function createUnavailableFavorites(): CustomerFavoritesDataSource {
  const fail = (): never => {
    throw new ApiError(503, "FAVORITES_UNAVAILABLE", "Favorites are not configured.");
  };
  return { listFavorites: fail, addFavorite: fail, removeFavorite: fail };
}

export function createCustomerFavoritesFromEnv(envStatus: EnvironmentStatus): CustomerFavoritesDataSource {
  if (!envStatus.isReady) return createUnavailableFavorites();
  const client = createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createCustomerFavoritesDataSource(client);
}

export function createCustomerFavoritesDataSource(client: SupabaseLike | null): CustomerFavoritesDataSource {
  if (!client) return createUnavailableFavorites();
  const db = client;

  return {
    async listFavorites(authUserId) {
      const { data, error } = await db
        .from("customer_favorites")
        .select("id, menu_item_code, created_at")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false });
      if (error) throw new ApiError(500, "FAVORITES_LIST_FAILED", error.message);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: row.id as string,
        menuItemCode: row.menu_item_code as string,
        createdAt: row.created_at as string,
      }));
    },

    async addFavorite(authUserId, menuItemCode) {
      const code = menuItemCode.trim().toLowerCase();
      if (!code || code.length > 80) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid menu item code.");
      }
      const { data: existing } = await db
        .from("customer_favorites")
        .select("id, menu_item_code, created_at")
        .eq("user_id", authUserId)
        .eq("menu_item_code", code)
        .maybeSingle();
      if (existing) {
        return {
          id: existing.id as string,
          menuItemCode: existing.menu_item_code as string,
          createdAt: existing.created_at as string,
        };
      }
      const { data, error } = await db
        .from("customer_favorites")
        .insert({ user_id: authUserId, menu_item_code: code })
        .select("id, menu_item_code, created_at")
        .single();
      if (error) throw new ApiError(500, "FAVORITES_SAVE_FAILED", error.message);
      return {
        id: data.id as string,
        menuItemCode: data.menu_item_code as string,
        createdAt: data.created_at as string,
      };
    },

    async removeFavorite(authUserId, menuItemCode) {
      const code = menuItemCode.trim().toLowerCase();
      const { error } = await db
        .from("customer_favorites")
        .delete()
        .eq("user_id", authUserId)
        .eq("menu_item_code", code);
      if (error) throw new ApiError(500, "FAVORITES_REMOVE_FAILED", error.message);
    },
  };
}

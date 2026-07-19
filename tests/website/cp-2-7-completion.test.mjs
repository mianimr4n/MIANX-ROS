import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("CP-2–7: orders cloud pagination, favorites, reviews, settings routes", () => {
  const app = read("apps/website/client/src/App.tsx");
  const orders = read("apps/website/client/src/pages/Orders.tsx");
  const favoritesApi = read("apps/website/client/src/lib/customer-favorites-api.ts");
  const favoritesPage = read("apps/website/client/src/pages/Favorites.tsx");
  const settings = read("apps/website/client/src/pages/Settings.tsx");
  const submitOrder = read("apps/website/client/src/lib/submit-order.ts");

  assert.match(app, /path=["']\/favorites["']/);
  assert.match(app, /path=["']\/settings["']/);
  assert.match(orders, /PAGE_SIZE = 20/);
  assert.match(orders, /Load more/);
  assert.match(orders, /cloudTotal > orders\.length/);
  assert.match(orders, /fetchCloudOrderDetail/);
  assert.match(orders, /OrderReviewDialog/);
  assert.match(favoritesApi, /isFavoriteCode/);
  assert.match(favoritesApi, /invalidateFavoritesCache/);
  assert.match(favoritesPage, /FavoriteHeartButton/);
  assert.match(settings, /loadNotificationPreferences/);
  assert.match(submitOrder, /try[\s\S]*pushNotification[\s\S]*catch/);
});

test("CP-6 reviews migration enforces owned completed order RLS", () => {
  const migration = read("supabase/migrations/20260719110000_order_reviews.sql");

  assert.match(migration, /auth_user_id = auth\.uid\(\)/);
  assert.match(migration, /o\.status = 'completed'/);
  assert.match(migration, /order_reviews_insert_own/);
  assert.match(migration, /order_reviews_update_own/);
});

test("FAV-01 ProductDetail exposes FavoriteHeartButton near title", () => {
  const productDetail = read("apps/website/client/src/pages/ProductDetail.tsx");
  const menu = read("apps/website/client/src/pages/Menu.tsx");

  assert.match(productDetail, /FavoriteHeartButton/);
  assert.match(menu, /FavoriteHeartButton/);
  assert.match(menu, /debouncedSearch/);
});

test("NOTIF-01 submit-order never fails after successful API create", () => {
  const submitOrder = read("apps/website/client/src/lib/submit-order.ts");

  assert.match(
    submitOrder,
    /saveLocalOrder\(payload[\s\S]*source: "api"[\s\S]*try[\s\S]*pushNotification[\s\S]*catch/,
  );
});

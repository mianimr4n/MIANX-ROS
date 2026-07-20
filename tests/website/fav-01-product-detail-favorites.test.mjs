import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

const productDetail = read("apps/website/client/src/pages/ProductDetail.tsx");
const menu = read("apps/website/client/src/pages/Menu.tsx");
const heartButton = read("apps/website/client/src/components/menu/FavoriteHeartButton.tsx");
const favoritesApi = read("apps/website/client/src/lib/customer-favorites-api.ts");

test("FAV-01 ProductDetail and Menu share FavoriteHeartButton near product title", () => {
  assert.match(productDetail, /import \{ FavoriteHeartButton \} from "@\/components\/menu\/FavoriteHeartButton"/);
  assert.match(productDetail, /<FavoriteHeartButton item=\{item\} \/>/);
  assert.match(productDetail, /<h1[\s\S]*?<\/h1>[\s\S]*?<FavoriteHeartButton/);

  assert.match(menu, /import \{ FavoriteHeartButton \} from "@\/components\/menu\/FavoriteHeartButton"/);
  assert.match(menu, /<FavoriteHeartButton item=\{item\}/);
});

test("FAV-01 FavoriteHeartButton loads cloud favorites for authenticated users", () => {
  assert.match(heartButton, /fetchCloudFavorites\(session\.access_token/);
  assert.match(heartButton, /setFavorited\(isFavoriteCode\(code\)\)/);
  assert.match(heartButton, /if \(!isAuthenticated \|\| !session\?\.access_token\)/);
  assert.match(heartButton, /setFavorited\(false\)/);
});

test("FAV-01 FavoriteHeartButton toggles add/remove with busy guard", () => {
  assert.match(heartButton, /async function toggleFavorite\(\)/);
  assert.match(heartButton, /if \(!session\?\.access_token \|\| busy\) return/);
  assert.match(heartButton, /setBusy\(true\)/);
  assert.match(heartButton, /await removeCloudFavorite\(session\.access_token, code\)/);
  assert.match(heartButton, /await addCloudFavorite\(session\.access_token, code\)/);
  assert.match(heartButton, /disabled=\{busy\}/);
  assert.match(heartButton, /Loader2/);
  assert.match(heartButton, /finally[\s\S]*setBusy\(false\)/);
});

test("FAV-01 guest heart links to sign-in with honest return path", () => {
  assert.match(heartButton, /if \(!isAuthenticated\)/);
  assert.match(heartButton, /window\.location\.pathname\}\$\{window\.location\.search\}/);
  assert.match(heartButton, /href=\{`\/login\?next=\$\{encodeURIComponent\(returnPath\)\}`\}/);
  assert.match(heartButton, /rememberAuthNextPath\(returnPath\)/);
  assert.match(heartButton, /aria-label=\{`Sign in to save \$\{item\.name\} to favorites`\}/);
});

test("FAV-01 authenticated heart exposes accessible pressed state and labels", () => {
  assert.match(heartButton, /aria-pressed=\{favorited\}/);
  assert.match(
    heartButton,
    /aria-label=\{[\s\S]*favorited \? `Remove \$\{item\.name\} from favorites` : `Add \$\{item\.name\} to favorites`/,
  );
});

test("FAV-01 failure path rolls back optimistic state via cache invalidation", () => {
  assert.match(heartButton, /catch \{[\s\S]*invalidateFavoritesCache\(\)/);
  assert.match(heartButton, /catch \{[\s\S]*setFavorited\(isFavoriteCode\(code\)\)/);
  assert.match(favoritesApi, /export function invalidateFavoritesCache/);
  assert.match(favoritesApi, /export function isFavoriteCode/);
});

test("FAV-01 favorites API keeps in-memory cache in sync on mutations", () => {
  assert.match(favoritesApi, /favoritesCache\.add\(code\)/);
  assert.match(favoritesApi, /favoritesCache\.delete\(code\)/);
  assert.match(favoritesApi, /export function favoriteCodeForItem/);
});

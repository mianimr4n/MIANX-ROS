import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readMigration(name) {
  return readFileSync(join(workspaceRoot, "supabase", "migrations", name), "utf8");
}

function readSource(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

const addresses = readMigration("20260719090000_customer_addresses.sql");
const favorites = readMigration("20260719100000_customer_favorites.sql");
const reviews = readMigration("20260719110000_order_reviews.sql");
const addressService = readSource("backend/api/src/services/addresses/customer-addresses.ts");
const favoritesService = readSource("backend/api/src/services/favorites/customer-favorites.ts");
const reviewsService = readSource("backend/api/src/services/reviews/customer-reviews.ts");

test("CP-1 customer_addresses: RLS own-row + authenticated DML + anon blocked", () => {
  assert.match(addresses, /enable row level security/i);
  assert.match(addresses, /customer_addresses_select_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(addresses, /customer_addresses_insert_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(addresses, /customer_addresses_update_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(addresses, /customer_addresses_delete_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(addresses, /grant select, insert, update, delete on table public\.customer_addresses to authenticated/i);
  assert.match(addresses, /grant all on table public\.customer_addresses to service_role/i);
  assert.doesNotMatch(addresses, /grant[\s\S]*customer_addresses[\s\S]*to anon/i);
});

test("CP-1 customer_addresses: API mapRow columns exist in DDL", () => {
  for (const column of [
    "recipient_name",
    "phone",
    "line1",
    "line2",
    "landmark",
    "area",
    "city",
    "delivery_zone",
    "preferred_branch_id",
    "is_default",
    "status",
    "created_at",
    "updated_at",
  ]) {
    assert.match(addresses, new RegExp(`\\b${column}\\b`));
  }
  assert.match(addresses, /label text not null check \(label in \('Home', 'Office', 'Other'\)\)/);
  assert.match(addresses, /status text not null default 'active' check \(status in \('active', 'archived'\)\)/);
  assert.match(addressService, /from\("customer_addresses"\)/);
  assert.match(addressService, /recipient_name/);
  assert.match(addressService, /delivery_zone/);
  assert.match(addressService, /preferred_branch_id/);
});

test("CP-5 customer_favorites: RLS own-row + authenticated insert/delete + anon blocked", () => {
  assert.match(favorites, /enable row level security/i);
  assert.match(favorites, /customer_favorites_select_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(favorites, /customer_favorites_insert_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(favorites, /customer_favorites_delete_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(favorites, /grant select, insert, delete on table public\.customer_favorites to authenticated/i);
  assert.match(favorites, /grant all on table public\.customer_favorites to service_role/i);
  assert.doesNotMatch(favorites, /grant[\s\S]*customer_favorites[\s\S]*to anon/i);
});

test("CP-5 customer_favorites: API columns match DDL", () => {
  assert.match(favorites, /menu_item_code text not null/);
  assert.match(favorites, /customer_favorites_user_code_unique unique \(user_id, menu_item_code\)/);
  assert.match(favoritesService, /from\("customer_favorites"\)/);
  assert.match(favoritesService, /menu_item_code/);
});

test("CP-6 order_reviews: completed-order gate + own-row RLS + grant matrix", () => {
  assert.match(reviews, /enable row level security/i);
  assert.match(reviews, /order_reviews_insert_own[\s\S]*auth_user_id = auth\.uid\(\)/i);
  assert.match(reviews, /order_reviews_insert_own[\s\S]*o\.status = 'completed'/i);
  assert.match(reviews, /order_reviews_update_own[\s\S]*auth_user_id = auth\.uid\(\)/i);
  assert.match(reviews, /order_reviews_one_per_order unique \(order_id\)/);
  assert.match(reviews, /grant select, insert, update on table public\.order_reviews to authenticated/i);
  assert.match(reviews, /grant all on table public\.order_reviews to service_role/i);
  assert.doesNotMatch(reviews, /grant[\s\S]*order_reviews[\s\S]*to anon/i);
});

test("CP-6 order_reviews: API columns match DDL", () => {
  for (const column of ["order_id", "auth_user_id", "rating", "comment", "status", "created_at", "updated_at"]) {
    assert.match(reviews, new RegExp(`\\b${column}\\b`));
  }
  assert.match(reviewsService, /from\("order_reviews"\)/);
  assert.match(reviewsService, /auth_user_id/);
  assert.match(reviewsService, /order_id/);
});

test("Phase 1 CP migrations sit after V1 freeze head and before inventing loyalty/notifications", () => {
  const names = readdirSync(join(workspaceRoot, "supabase", "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const freeze = "20260718171000_db_hash_column_privilege_harden.sql";
  const cp1 = "20260719090000_customer_addresses.sql";
  const cp5 = "20260719100000_customer_favorites.sql";
  const cp6 = "20260719110000_order_reviews.sql";
  assert.ok(names.includes(freeze));
  assert.ok(names.includes(cp1));
  assert.ok(names.includes(cp5));
  assert.ok(names.includes(cp6));
  assert.ok(names.indexOf(freeze) < names.indexOf(cp1));
  assert.ok(names.indexOf(cp1) < names.indexOf(cp5));
  assert.ok(names.indexOf(cp5) < names.indexOf(cp6));
  assert.equal(
    names.filter((name) => /loyalty|reward|notification_pref/i.test(name)).length,
    0,
    "loyalty/notifications cloud tables are intentionally out of Phase 1 scope",
  );
});

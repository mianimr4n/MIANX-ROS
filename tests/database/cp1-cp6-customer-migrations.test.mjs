import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readMigration(name) {
  return readFileSync(join(workspaceRoot, "supabase", "migrations", name), "utf8");
}

const addresses = readMigration("20260719090000_customer_addresses.sql");
const favorites = readMigration("20260719100000_customer_favorites.sql");
const reviews = readMigration("20260719110000_order_reviews.sql");

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

test("CP-5 customer_favorites: RLS own-row + authenticated insert/delete + anon blocked", () => {
  assert.match(favorites, /enable row level security/i);
  assert.match(favorites, /customer_favorites_select_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(favorites, /customer_favorites_insert_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(favorites, /customer_favorites_delete_own[\s\S]*user_id = auth\.uid\(\)/i);
  assert.match(favorites, /grant select, insert, delete on table public\.customer_favorites to authenticated/i);
  assert.match(favorites, /grant all on table public\.customer_favorites to service_role/i);
  assert.doesNotMatch(favorites, /grant[\s\S]*customer_favorites[\s\S]*to anon/i);
});

test("CP-6 order_reviews: completed-order gate + own-row RLS + grant matrix", () => {
  assert.match(reviews, /enable row level security/i);
  assert.match(reviews, /order_reviews_insert_own[\s\S]*auth_user_id = auth\.uid\(\)/i);
  assert.match(reviews, /order_reviews_insert_own[\s\S]*o\.status = 'completed'/i);
  assert.match(reviews, /order_reviews_update_own[\s\S]*auth_user_id = auth\.uid\(\)/i);
  assert.match(reviews, /order_reviews_one_per_order unique \(order_id\)/i);
  assert.match(reviews, /grant select, insert, update on table public\.order_reviews to authenticated/i);
  assert.match(reviews, /grant all on table public\.order_reviews to service_role/i);
  assert.doesNotMatch(reviews, /grant[\s\S]*order_reviews[\s\S]*to anon/i);
});

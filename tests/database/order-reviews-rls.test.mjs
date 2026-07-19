import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(
  workspaceRoot,
  "supabase",
  "migrations",
  "20260719110000_order_reviews.sql",
);
const migration = readFileSync(migrationPath, "utf8");

function extractPolicy(name) {
  const match = migration.match(
    new RegExp(
      `create policy ${name} on public\\.order_reviews[\\s\\S]*?(?=drop policy|revoke all|comment on|$)`,
      "i",
    ),
  );
  assert.ok(match, `policy ${name} must exist`);
  return match[0];
}

const insertPolicy = extractPolicy("order_reviews_insert_own");
const updatePolicy = extractPolicy("order_reviews_update_own");
const selectPolicy = extractPolicy("order_reviews_select_own");

test("SEC-01: migration is transactional and uses auth_user_id (not user_id)", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
  assert.match(migration, /auth_user_id uuid not null references auth\.users/i);
  assert.doesNotMatch(migration, /\buser_id uuid not null references auth\.users/i);
});

test("SEC-01: one review per order — duplicate INSERT fails at DB layer", () => {
  assert.match(migration, /constraint order_reviews_one_per_order unique \(order_id\)/i);
  // PostgREST: second POST /order_reviews for the same order_id → 409 unique_violation
  // even if RLS would otherwise allow the row.
});

test("SEC-01: RLS enabled with owner-isolated SELECT", () => {
  assert.match(migration, /alter table public\.order_reviews enable row level security/i);
  assert.match(selectPolicy, /for select to authenticated/i);
  assert.match(selectPolicy, /auth_user_id = auth\.uid\(\)/i);
  // PostgREST: GET /order_reviews returns only rows where auth_user_id = JWT sub.
  assert.doesNotMatch(selectPolicy, /for select to anon/i);
});

test("SEC-01: own completed order INSERT succeeds — policy requires all three checks", () => {
  assert.match(insertPolicy, /for insert to authenticated/i);
  assert.match(insertPolicy, /auth_user_id = auth\.uid\(\)/i);
  assert.match(insertPolicy, /o\.auth_user_id = auth\.uid\(\)/i);
  assert.match(insertPolicy, /o\.status = 'completed'/i);
  // PostgREST: authenticated user with JWT sub U inserting { order_id, auth_user_id: U, ... }
  // for a completed order owned by U → 201 Created.
});

test("SEC-01: own incomplete order INSERT fails — completed status gate", () => {
  assert.match(insertPolicy, /with check \([\s\S]*o\.status = 'completed'/i);
  // PostgREST: INSERT for owned order with status != 'completed' → RLS violation (42501).
  assert.match(updatePolicy, /with check \([\s\S]*o\.status = 'completed'/i);
});

test("SEC-01: another customer's order INSERT fails — order ownership gate", () => {
  assert.match(insertPolicy, /o\.auth_user_id = auth\.uid\(\)/i);
  // PostgREST: JWT sub A inserting review for order owned by B → RLS violation (42501).
});

test("SEC-01: forged auth_user_id INSERT fails — auth_user_id must match JWT sub", () => {
  assert.match(insertPolicy, /with check \([\s\S]*auth_user_id = auth\.uid\(\)/i);
  // PostgREST: JWT sub A inserting { auth_user_id: B, ... } → RLS violation (42501).
});

test("SEC-01: unauthorized UPDATE fails — USING and WITH CHECK owner gates", () => {
  assert.match(updatePolicy, /for update to authenticated/i);
  assert.match(updatePolicy, /using \(auth_user_id = auth\.uid\(\)\)/i);
  assert.match(updatePolicy, /with check \([\s\S]*auth_user_id = auth\.uid\(\)/i);
  assert.match(updatePolicy, /o\.auth_user_id = auth\.uid\(\)/i);
  // PostgREST: PATCH /order_reviews?id=eq.<other-user-review> → 0 rows (RLS filters USING).
});

test("SEC-01: anon revoked — no PostgREST access without authenticated JWT", () => {
  assert.match(migration, /revoke all on table public\.order_reviews from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update on table public\.order_reviews to authenticated/i);
  assert.doesNotMatch(migration, /grant[^;]*\bto anon\b/i);
  assert.doesNotMatch(migration, /for (insert|update|select|delete)\s+to anon/i);
  // PostgREST with anon key: no table privileges → permission denied before RLS.
});

test("SEC-01: authenticated cannot DELETE — defense in depth", () => {
  assert.doesNotMatch(migration, /grant delete on table public\.order_reviews to authenticated/i);
  assert.doesNotMatch(migration, /for delete to authenticated/i);
});

test("SEC-01: service_role retains full access for Express admin paths only", () => {
  assert.match(migration, /grant all on table public\.order_reviews to service_role/i);
});

test("SEC-01: Express API attaches auth_user_id from verified Bearer only", () => {
  const routes = readFileSync(
    join(workspaceRoot, "backend/api/src/modules/me/routes.ts"),
    "utf8",
  );
  const reviewsService = readFileSync(
    join(workspaceRoot, "backend/api/src/services/reviews/customer-reviews.ts"),
    "utf8",
  );

  assert.match(routes, /requireAuth/);
  assert.match(routes, /auth\.authUserId/);
  assert.match(reviewsService, /auth_user_id:\s*authUserId/);
  assert.match(reviewsService, /\.eq\("auth_user_id", authUserId\)/);
  assert.doesNotMatch(routes, /body\.authUserId|req\.body\.authUserId/i);
});

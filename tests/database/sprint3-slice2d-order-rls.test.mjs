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
  "20260716140000_sprint3_slice2d_order_branch_rls.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("Slice 2D migration is transactional and catches up orders.auth_user_id", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /^commit;/im);
  assert.match(
    migration,
    /add column if not exists auth_user_id uuid references auth\.users/i,
  );
  assert.match(migration, /idx_orders_auth_user_id/i);
});

test("helpers are SECURITY DEFINER with pinned search_path and no metadata privilege", () => {
  for (const name of [
    "current_app_user_id",
    "current_user_is_active",
    "current_user_is_super_admin",
    "current_user_branch_ids",
    "current_user_has_branch_access",
    "current_customer_owns_order",
  ]) {
    assert.match(
      migration,
      new RegExp(`create or replace function public\\.${name}`, "i"),
      name,
    );
  }

  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public/i);
  assert.doesNotMatch(migration, /raw_user_meta_data/i);
  assert.doesNotMatch(migration, /app_metadata/i);
  assert.doesNotMatch(migration, /x-telepizza/i);
  assert.doesNotMatch(migration, /execute\s+format|dynamic sql/i);
  assert.match(migration, /u\.status = 'active'/i);
  assert.match(migration, /r\.code = 'super-admin'/i);
  assert.match(migration, /u\.user_type <> 'customer'/i);
});

test("operational tables revoke anon access and authenticated writes", () => {
  for (const table of ["orders", "order_items", "order_status_logs", "deliveries", "payments"]) {
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from anon`, "i"),
      table,
    );
  }

  for (const table of ["orders", "order_items", "order_status_logs", "deliveries"]) {
    assert.match(
      migration,
      new RegExp(
        `revoke insert, update, delete on table public\\.${table} from authenticated`,
        "i",
      ),
      table,
    );
    assert.match(
      migration,
      new RegExp(`grant select on table public\\.${table} to authenticated`, "i"),
      table,
    );
  }

  // payments stay service-role-only for client roles in this slice
  assert.match(migration, /revoke all on table public\.payments from authenticated/i);
  assert.doesNotMatch(
    migration,
    /create policy[\s\S]*on public\.payments/i,
  );
});

test("customer and staff SELECT policies exist; no authenticated write policies", () => {
  assert.match(migration, /create policy "Customers select own orders"/i);
  assert.match(migration, /create policy "Staff select branch orders"/i);
  assert.match(migration, /create policy "Customers select own order items"/i);
  assert.match(migration, /create policy "Staff select branch order items"/i);
  assert.match(migration, /create policy "Customers select own order status logs"/i);
  assert.match(migration, /create policy "Staff select branch order status logs"/i);
  assert.match(migration, /create policy "Customers select own deliveries"/i);
  assert.match(migration, /create policy "Staff select branch deliveries"/i);

  assert.match(migration, /auth_user_id = auth\.uid\(\)/i);
  assert.match(migration, /current_user_has_branch_access\(branch_id\)/i);
  assert.match(migration, /current_customer_owns_order\(order_id\)/i);

  assert.doesNotMatch(migration, /for insert\s+to authenticated/i);
  assert.doesNotMatch(migration, /for update\s+to authenticated/i);
  assert.doesNotMatch(migration, /for delete\s+to authenticated/i);
  assert.doesNotMatch(migration, /for select\s+to anon/i);
  assert.doesNotMatch(migration, /grant\s+[^;]*\bto anon\b/i);
});

test("rider broad access is not granted; guest anon SELECT is not granted", () => {
  assert.match(migration, /Rider-specific assignment policies are DEFERRED/i);
  assert.doesNotMatch(migration, /create policy "[^"]*[Rr]ider/);
  assert.doesNotMatch(migration, /for select\s+to anon/i);
  assert.doesNotMatch(migration, /contact_phone_e164\s*=/i);
});

test("API create path attaches auth_user_id from verified Bearer only", () => {
  const routes = readFileSync(
    join(workspaceRoot, "backend/api/src/modules/orders/routes.ts"),
    "utf8",
  );
  const ordersService = readFileSync(
    join(workspaceRoot, "backend/api/src/services/orders/supabase.ts"),
    "utf8",
  );
  const authMw = readFileSync(
    join(workspaceRoot, "backend/api/src/middleware/auth.ts"),
    "utf8",
  );

  assert.match(authMw, /export function createOptionalAuth/);
  assert.match(routes, /createOptionalAuth/);
  assert.match(routes, /authUserId:\s*req\.auth\?\.authUserId/);
  assert.match(ordersService, /auth_user_id:\s*input\.authUserId/);
  assert.doesNotMatch(routes, /body\.authUserId|req\.body\.authUserId/);
  assert.doesNotMatch(routes, /x-telepizza-branch|x-telepizza-role/i);
});

test("catalog freeze and branch seed regressions remain intact", () => {
  const menuTest = readFileSync(
    join(workspaceRoot, "tests/menu/option-b-catalog.test.mjs"),
    "utf8",
  );
  const foundation = readFileSync(
    join(workspaceRoot, "tests/database/foundation-migrations.test.mjs"),
    "utf8",
  );
  assert.match(menuTest, /13/);
  assert.match(foundation, /royal-orchard/);
  assert.match(foundation, /northern-bypass/);
  assert.doesNotMatch(migration, /insert into public\.menu_/i);
  assert.doesNotMatch(migration, /update public\.menu_/i);
});

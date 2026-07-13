import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspaceRoot = "/workspace";
const schemaMigration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260713190000_foundation_schema.sql"),
  "utf8",
);
const seedMigration = readFileSync(
  join(workspaceRoot, "supabase", "migrations", "20260713191000_seed_foundation_data.sql"),
  "utf8",
);

test("foundation schema creates the required restaurant tables", () => {
  const requiredTables = [
    "users",
    "roles",
    "permissions",
    "branches",
    "customers",
    "menu_categories",
    "menu_items",
    "menu_item_variants",
    "orders",
    "order_items",
    "payments",
    "riders",
    "deliveries",
    "staff",
  ];

  for (const table of requiredTables) {
    assert.match(
      schemaMigration,
      new RegExp(`create table if not exists public\\.${table}\\s*\\(`, "i"),
      `Expected migration to create public.${table}`,
    );
  }
});

test("foundation schema enables row level security for public access patterns", () => {
  for (const table of ["branches", "menu_categories", "menu_items", "menu_item_variants", "orders", "payments"]) {
    assert.match(
      schemaMigration,
      new RegExp(`alter table public\\.${table} enable row level security;`, "i"),
      `Expected RLS for public.${table}`,
    );
  }

  assert.match(schemaMigration, /create policy "Public can read branches"/i);
  assert.match(schemaMigration, /create policy "Public can read active menu items"/i);
});

test("seed migration populates core roles, permissions, branches, and starter catalog data", () => {
  for (const roleCode of ["super-admin", "branch-manager", "kitchen", "cashier", "rider", "customer-support"]) {
    assert.match(seedMigration, new RegExp(`'${roleCode}'`, "i"));
  }

  for (const permissionCode of ["menu.read", "order.create", "delivery.assign", "admin.access"]) {
    assert.match(seedMigration, new RegExp(`'${permissionCode}'`, "i"));
  }

  for (const branchCode of ["royal-orchard", "northern-bypass"]) {
    assert.match(seedMigration, new RegExp(`'${branchCode}'`, "i"));
  }

  for (const menuSlug of ["tele-special", "tikka", "crown-crust", "family-deal"]) {
    assert.match(seedMigration, new RegExp(`'${menuSlug}'`, "i"));
  }
});

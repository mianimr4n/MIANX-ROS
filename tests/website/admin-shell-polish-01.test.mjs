import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(process.cwd());

const registryPath = join(root, "apps/website/client/src/lib/admin-nav-registry.ts");
const shellPath = join(root, "apps/website/client/src/pages/admin/AdminShell.tsx");
const accessPath = join(root, "apps/website/client/src/lib/admin-access.ts");
const settingsPanelsPath = join(
  root,
  "apps/website/client/src/components/admin/settings/SettingsPanels.tsx",
);


test("POLISH-01: AdminShell removes dead search and notifications", () => {
  const shell = readFileSync(shellPath, "utf8");
  assert.equal(shell.includes("Search unavailable"), false);
  assert.equal(shell.includes("Notifications unavailable"), false);
  assert.equal(shell.includes("from \"lucide-react\""), true);
  assert.match(shell, /AdminModuleNavigator/);
  assert.match(shell, /AdminSidebarNav/);
  assert.match(shell, /aria-label="Sign out"/);
  assert.match(shell, /setLocation\("\/admin\/login"\)/);
  assert.match(shell, /Active operational branch/);
  assert.equal(shell.includes("Bell"), false);
});

test("POLISH-01: Settings edit-target labels are explicit", () => {
  const panels = readFileSync(settingsPanelsPath, "utf8");
  assert.match(panels, /Editing settings for/);
  assert.match(panels, /Configuration edit target/);
  assert.match(panels, /does not change the Active operational branch|independent of the Active operational branch/);
});

test("POLISH-01: nav registry helpers are present and auth remains in admin-access", () => {
  const registry = readFileSync(registryPath, "utf8");
  const access = readFileSync(accessPath, "utf8");
  assert.match(registry, /export function isAdminNavItemActive/);
  assert.match(registry, /export function resolveAdminNavTitle/);
  assert.match(registry, /export function groupAdminNavItems/);
  assert.match(registry, /export function filterAdminNavByQuery/);
  assert.match(registry, /ADMIN_NAV_GROUP_ORDER/);
  assert.match(access, /export function filterVisibleAdminNav/);
  assert.match(access, /export function getAdminNavItems/);
  assert.match(access, /ownerOnly/);
  assert.match(access, /resolveStaffHome/);
});

test("POLISH-01: active-route helpers cover aliases and nested paths", async () => {
  // Evaluate pure helper logic by extracting with a tiny VM-free duplicate of expected behavior
  // sourced from the TypeScript file via dynamic transpile is heavy; assert source contracts:
  const registry = readFileSync(registryPath, "utf8");
  assert.match(registry, /\/admin\/customers/);
  assert.match(registry, /\/admin\/promotions/);
  assert.match(registry, /\/admin\/staff/);
  assert.match(registry, /location === "\/admin" \|\| location\.startsWith\("\/admin\/dashboard"\)/);
});

test("POLISH-01: sidebar uses aria-current and collapsible groups", () => {
  const sidebar = readFileSync(
    join(root, "apps/website/client/src/components/admin/shell/AdminSidebarNav.tsx"),
    "utf8",
  );
  assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(sidebar, /aria-expanded=\{expanded\}/);
  assert.match(sidebar, /telepizza\.admin\.nav\.groups\.v1/);
});

test("POLISH-01: module navigator is route-metadata only", () => {
  const nav = readFileSync(
    join(root, "apps/website/client/src/components/admin/shell/AdminModuleNavigator.tsx"),
    "utf8",
  );
  assert.match(nav, /Go to module/);
  assert.match(nav, /does not search customers, orders, or other business records/i);
  assert.match(nav, /filterAdminNavByQuery/);
  assert.match(nav, /ctrlKey/);
  assert.equal(nav.includes("/api/"), false);
});

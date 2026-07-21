import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("S1: five primary My Telepizza destinations are routed", () => {
  const app = read("apps/website/client/src/App.tsx");
  const nav = read("apps/website/client/src/lib/my-telepizza-nav.ts");
  const bottom = read("apps/website/client/src/components/my-telepizza/CustomerBottomNav.tsx");
  const desktop = read("apps/website/client/src/components/my-telepizza/CustomerDesktopNav.tsx");

  assert.match(app, /path=["']\/my-telepizza["']/);
  assert.match(app, /path=["']\/my-telepizza\/orders["']/);
  assert.match(app, /path=["']\/my-telepizza\/addresses["']/);
  assert.match(app, /path=["']\/my-telepizza\/rewards["']/);
  assert.match(app, /path=["']\/my-telepizza\/account["']/);
  assert.match(app, /path=["']\/my-telepizza\/account\/profile["']/);
  assert.match(app, /path=["']\/my-telepizza\/account\/security["']/);
  assert.match(app, /path=["']\/my-telepizza\/account\/notifications["']/);
  assert.match(app, /path=["']\/my-telepizza\/favorites["']/);
  assert.match(nav, /PRIMARY_NAV/);
  assert.match(nav, /id: "home"/);
  assert.match(nav, /id: "orders"/);
  assert.match(nav, /id: "addresses"/);
  assert.match(nav, /id: "rewards"/);
  assert.match(nav, /id: "account"/);
  assert.match(bottom, /CustomerBottomNav/);
  assert.match(bottom, /lg:hidden/);
  assert.match(bottom, /min-h-12/);
  assert.match(bottom, /aria-current/);
  assert.match(desktop, /CustomerDesktopNav/);
  assert.match(desktop, /aria-current/);
});

test("S1: legacy hashes map to canonical paths", () => {
  const nav = read("apps/website/client/src/lib/my-telepizza-nav.ts");
  assert.match(nav, /legacyHashCanonicalPath/);
  assert.match(nav, /dashboard/);
  assert.match(nav, /loyalty/);
  assert.match(nav, /\/my-telepizza\/orders/);
  assert.match(nav, /\/my-telepizza\/rewards/);
  assert.match(nav, /\/my-telepizza\/account\/profile/);
  assert.match(nav, /\/my-telepizza\/account\/security/);
  assert.match(nav, /\/my-telepizza\/account\/notifications/);
});

test("S1: customer shell components exist and stay customer-only", () => {
  const shell = read("apps/website/client/src/components/my-telepizza/CustomerShell.tsx");
  const header = read("apps/website/client/src/components/my-telepizza/CustomerPageHeader.tsx");
  const account = read("apps/website/client/src/components/my-telepizza/CustomerAccountMenu.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const staff = read("apps/website/client/src/pages/StaffLogin.tsx");
  const app = read("apps/website/client/src/App.tsx");

  assert.match(shell, /CustomerDesktopNav/);
  assert.match(shell, /CustomerBottomNav/);
  assert.match(header, /avatarUrl|Email verified|phoneLabel/);
  assert.match(hub, /Phone added|Add phone|Phone verified/);
  assert.match(account, /Personal details|Security|Notifications|Favorites|Help|Logout/);
  assert.match(hub, /CustomerShell/);
  assert.match(hub, /resolveDisplayName/);
  assert.doesNotMatch(staff, /CustomerShell|CustomerBottomNav/);
  assert.match(app, /path=["']\/staff\/login["']/);
  assert.doesNotMatch(app, /CustomerShell/);
});

test("S1: customer errors hide schema/table internals", () => {
  const errors = read("apps/website/client/src/lib/customer-errors.ts");
  assert.match(errors, /toCustomerMessage/);
  assert.match(errors, /We're having trouble loading your information/);
  assert.match(errors, /Your session has expired/);
  assert.match(errors, /You appear to be offline/);
  assert.match(errors, /schema cache|42P01|relation/i);
  assert.doesNotMatch(errors, /customer_addresses table is missing for the operator/);
});

test("S1: Orders and Favorites use safe customer error mapper", () => {
  const orders = read("apps/website/client/src/pages/Orders.tsx");
  const favorites = read("apps/website/client/src/pages/Favorites.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(orders, /toCustomerMessage/);
  assert.match(orders, /"reviews"/);
  assert.match(favorites, /toCustomerMessage/);
  assert.match(favorites, /"favorites"/);
  assert.match(hub, /toCustomerMessage\(error, "addresses"\)/);
});

test("S1: Home is quiet — no zero-value clutter, active order still supported", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /Ready for your next order\?/);
  assert.match(hub, /Complete your account|Your account is ready/);
  assert.match(hub, /Add delivery address|Add phone/);
  assert.match(hub, /Current Order/);
  assert.match(hub, /Browse the menu|Browse Menu/);
  assert.doesNotMatch(hub, /No active order right now/);
  assert.doesNotMatch(hub, /0 points|fake balance|1,?000 points/i);
  assert.match(hub, /profileCompletion/);
});

test("S1: Rewards page has no fake points", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /Rewards are coming soon/);
  assert.match(hub, /Browse Menu/);
  assert.doesNotMatch(hub, /1,?000 points|Gold tier|member #/i);
});

test("S1: name resolution prefers stored/edited over re-prompt", () => {
  const nav = read("apps/website/client/src/lib/my-telepizza-nav.ts");
  assert.match(nav, /resolveDisplayName/);
  assert.match(nav, /editedOrStoredName/);
  assert.match(nav, /providerFullName/);
});

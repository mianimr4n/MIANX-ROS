import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("My Telepizza route, nav label, and auth return path", () => {
  const app = read("apps/website/client/src/App.tsx");
  const navbar = read("apps/website/client/src/components/Navbar.tsx");
  const authRedirect = read("apps/website/client/src/lib/auth-redirect.ts");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const account = read("apps/website/client/src/pages/Account.tsx");

  assert.match(app, /path=["']\/my-telepizza["']/);
  assert.match(app, /MyTelepizza/);
  assert.match(app, /path=["']\/account["']/);
  assert.match(account, /navigate\(`\/my-telepizza\$\{hash\}`/);
  assert.match(navbar, /My Telepizza/);
  assert.match(navbar, /\/menu\?category=Deals/);
  assert.match(authRedirect, /DEFAULT_AUTH_DESTINATION = ["']\/my-telepizza["']/);
  assert.match(authRedirect, /\/my-telepizza/);
  assert.match(hub, /rememberAuthNextPath\(returnPath\)/);
  assert.match(hub, /\/login\?next=/);
});

test("hub dashboard: active order empty state, quiet home, preferred branch", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const support = read("apps/website/client/src/components/my-telepizza/HubSupportCard.tsx");
  const bottom = read("apps/website/client/src/components/my-telepizza/CustomerBottomNav.tsx");
  assert.match(hub, /No active order right now/);
  assert.match(hub, /Ready for your next order\?/);
  assert.match(hub, /Browse the menu/);
  assert.match(hub, /Preferred branch/);
  assert.match(hub, /CustomerShell|CustomerBottomNav|CustomerPageHeader/);
  assert.match(bottom, /aria-label=["']My Telepizza["']/);
  assert.match(hub, /focusMainAfterNav/);
  assert.match(hub, /HubSupportCard/);
  assert.match(support, /WhatsApp support/);
  assert.match(support, /Need help/);
  assert.doesNotMatch(hub, /docs\/architecture/);
  assert.doesNotMatch(hub, /OWNER REVIEW REQUIRED/);
  assert.doesNotMatch(hub, /Profile completion/);
});

test("addresses: cloud SoT enabled with device draft import honesty", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const addresses = read("apps/website/client/src/lib/customer-addresses.ts");
  const proposal = read("docs/architecture/MY-TELEPIZZA-ADDRESSES-MIGRATION-PROPOSAL.md");

  assert.match(hub, /fetchCloudAddresses|importCloudAddresses/);
  assert.match(addresses, /ADDRESSES_CLOUD_SYNC_AVAILABLE = true/);
  assert.match(hub, /fetchCloudAddresses|importCloudAddresses/);
  assert.match(addresses, /draftToImportPayload|markAddressImportCompleted/);
  assert.match(proposal, /customer_addresses/);
  assert.doesNotMatch(hub, /OWNER REVIEW REQUIRED/);
  assert.doesNotMatch(hub, /docs\/architecture/);
});

test("reorder reviews catalog prices — no silent substitution", () => {
  const reorder = read("apps/website/client/src/lib/reorder.ts");
  const dialog = read("apps/website/client/src/components/my-telepizza/ReorderReviewDialog.tsx");
  const orders = read("apps/website/client/src/pages/Orders.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");

  assert.match(reorder, /buildReorderPreview/);
  assert.match(reorder, /price_changed/);
  assert.match(reorder, /unavailable/);
  assert.match(reorder, /confirmedReorderCartItems/);
  assert.match(dialog, /Nothing is substituted silently/);
  assert.match(dialog, /Review reorder/);
  assert.match(orders, /buildReorderPreview/);
  assert.match(orders, /ReorderReviewDialog/);
  assert.match(hub, /ReorderReviewDialog/);
  assert.doesNotMatch(orders, /addItem\(\{[\s\S]*price:\s*Math\.max\(0,\s*item\.unitPrice/);
});

test("loyalty and payments stay honest — no fake rewards or live wallets", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const loyaltyFuture = read("docs/architecture/MY-TELEPIZZA-LOYALTY-FUTURE-ARCHITECTURE.md");

  assert.match(hub, /Offers will appear here/);
  assert.match(hub, /Coming soon/i);
  assert.match(hub, /JazzCash, EasyPaisa, and saved cards are/);
  assert.match(hub, /not live/i);
  assert.doesNotMatch(hub, /You have \d+ points|Rs \d+ rewards balance|earn \d+%/i);
  assert.doesNotMatch(hub, /docs\/architecture\/MY-TELEPIZZA-LOYALTY/);
  assert.match(loyaltyFuture, /no migrations/i);
});

test("no new unrelated migrations in this sprint folder claim", () => {
  const addressesProposal = read("docs/architecture/MY-TELEPIZZA-ADDRESSES-MIGRATION-PROPOSAL.md");
  const branchProposal = read("docs/architecture/MY-TELEPIZZA-PREFERRED-BRANCH-MIGRATION-PROPOSAL.md");
  assert.match(addressesProposal, /customer_addresses|CP-1 implemented/i);
  assert.match(branchProposal, /do not apply/i);
});

test("notifications empty state avoids duplicate copy and links honest prefs", () => {
  const notifications = read("apps/website/client/src/pages/Notifications.tsx");
  assert.match(notifications, /No notifications yet/);
  assert.match(notifications, /\/settings#prefs/);
  assert.doesNotMatch(notifications, /No notifications yet\.[\s\S]*No notifications yet/);
  assert.doesNotMatch(notifications, /SMTP/);
});

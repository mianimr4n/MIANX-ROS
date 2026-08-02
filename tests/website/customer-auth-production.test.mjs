import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("forgot + reset password flows exist without email enumeration", () => {
  const app = read("apps/website/client/src/App.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const forgot = read("apps/website/client/src/pages/ForgotPassword.tsx");
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  const login = read("apps/website/client/src/pages/Login.tsx");
  const callback = read("apps/website/client/src/pages/AuthCallback.tsx");

  assert.match(app, /path=["']\/forgot-password["']/);
  assert.match(app, /path=["']\/reset-password["']/);
  assert.match(login, /Forgot password\?/);
  assert.match(authContext, /resetPasswordForEmail/);
  assert.match(authContext, /requestPasswordReset/);
  assert.match(authContext, /completePasswordReset/);
  assert.match(forgot, /If an account exists for that address/);
  assert.match(forgot, /never reveal whether an account/i);
  assert.doesNotMatch(forgot, /no account found|email not found|user not found/i);
  assert.match(reset, /completePasswordReset/);
  assert.match(reset, /Never enter your Google or Facebook password/);
  assert.match(callback, /recovery/);
  assert.match(callback, /\/reset-password/);
  assert.match(callback, /expired|invalid/i);
});

test("secure email change uses same auth user and never Google password", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");

  assert.match(authContext, /requestEmailChange/);
  assert.match(authContext, /updateUser\(\s*\{\s*email:\s*newEmail\s*\}/);
  assert.match(authContext, /emailRedirectTo:\s*getEmailChangeRedirectTo/);
  assert.match(authContext, /hasEmailIdentity\(session\.user\)/);
  assert.match(account, /Change email/);
  assert.match(account, /Never enter your (?:Google password|social-login password)/);
  assert.match(account, /Send confirmation/);
  assert.match(account, /Email status:/);
  assert.match(account, /Provider:/);
});

test("Auth callback maps expired and invalid email links safely", () => {
  const redirect = read("apps/website/client/src/lib/auth-redirect.ts");
  assert.match(redirect, /otp_expired/);
  assert.match(redirect, /This link has expired/);
  assert.match(redirect, /invalid or was already used/);
  assert.match(redirect, /getPasswordRecoveryRedirectTo/);
  assert.match(redirect, /getEmailChangeRedirectTo/);
  assert.match(redirect, /\/reset-password/);
  assert.match(redirect, /resolveApprovedAuthOrigin/);
  assert.match(redirect, /clearSensitiveAuthUrl/);
});

test("profile shows honest phone Unverified and email verification status", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const header = read("apps/website/client/src/components/my-telepizza/CustomerPageHeader.tsx");
  assert.match(account, /Phone status:/);
  assert.match(account, /Phone added|Add phone|Phone verified/);
  assert.match(account, /Verification Pending|emailVerified/);
  assert.match(account, /email_confirmed_at/);
  assert.match(account, /phoneStatusLabel/);
  assert.match(account, /StatusBadge/);
  assert.match(header, /Email verified|Email ✓ Verified/);
});

test("My Telepizza supports device address drafts and checkout selection", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const addresses = read("apps/website/client/src/lib/customer-addresses.ts");
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");

  assert.match(addresses, /type AddressLabel = "Home" \| "Office" \| "Other"/);
  assert.match(addresses, /updateSavedAddress/);
  assert.match(addresses, /setDefaultSavedAddress/);
  assert.match(addresses, /isDefault/);
  assert.match(account, /Make default/);
  assert.match(account, /\bEdit\b/);
  assert.match(account, /\bDelete\b/);
  assert.match(account, /fetchCloudAddresses|importCloudAddresses/);
  assert.match(account, /usingCloudAddresses|Synced to your Telepizza account|Device drafts only/);
  assert.doesNotMatch(account, /OWNER REVIEW REQUIRED/);
  assert.match(checkout, /listSavedAddresses/);
  assert.match(checkout, /saved-delivery-address/);
  assert.match(checkout, /formatSavedAddress/);
  assert.doesNotMatch(addresses, /gps|geolocation|api[_-]?key|secret/i);
});

test("orders expose status, honest operational gaps, and feasible reorder", () => {
  const orders = read("apps/website/client/src/pages/Orders.tsx");
  const store = read("apps/website/client/src/lib/customer-store.ts");
  const timeline = read("apps/website/client/src/components/my-telepizza/OrderStatusTimeline.tsx");

  assert.match(timeline, /ORDER_STATUS_STEPS/);
  assert.match(orders, /OrderStatusTimeline/);
  assert.match(orders, /statusBadgeClass/);
  assert.match(orders, /branchName/);
  assert.match(orders, /Reorder/);
  assert.match(orders, /ReorderReviewDialog/);
  assert.match(orders, /fetchCloudOrders|PAGE_SIZE/);
  assert.match(orders, /account|this device|this browser/i);
  assert.match(store, /menuItemSlug\?: string/);
  assert.doesNotMatch(orders, /\b(driver|invoice|ETA|Payment)\b/i);
});

test("security, loyalty, notifications, and hub expose requested production states", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const header = read("apps/website/client/src/components/my-telepizza/CustomerPageHeader.tsx");
  const prefs = read("apps/website/client/src/lib/customer-notification-prefs.ts");

  assert.match(account, /email_confirmed_at/);
  assert.match(account, /last_sign_in_at/);
  assert.match(account, /Active sessions/);
  assert.match(account, /Linked accounts/);
  assert.match(account, /Only this device's session is shown/);
  assert.match(account, /Forgot password\?/);
  assert.match(account, /AUTH_PASSWORD_REQUIREMENTS_COPY/);
  assert.match(account, /Password requirements/);
  assert.match(account, /Coming soon/i);
  assert.match(account, /Rewards are coming soon/);
  assert.doesNotMatch(account, /Current points|Points history|Gold preview|Starter preview/);
  assert.match(prefs, /Order updates/);
  assert.match(prefs, /Promotions/);
  assert.match(prefs, /Delivery alerts/);
  assert.match(prefs, /Special offers/);
  assert.match(account, /Recent Orders/);
  assert.match(account, /Current Order/);
  assert.doesNotMatch(account, /No active order right now/);
  assert.match(account, /CustomerRetryCard|saved on this device only/i);
  assert.match(account, /Addresses/);
  assert.match(header, /Email verified|Email ✓ Verified/);
  assert.match(account, /Phone added|Add phone|Phone verified/);
  assert.match(account, /View Order History/);
  assert.doesNotMatch(account, /Favorite Items|Reward Points/);
});

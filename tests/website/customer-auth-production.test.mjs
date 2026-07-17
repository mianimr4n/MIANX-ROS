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
  assert.match(reset, /Never enter your Google password/);
  assert.match(callback, /recovery/);
  assert.match(callback, /\/reset-password/);
  assert.match(callback, /expired|invalid/i);
});

test("secure email change uses same auth user and never Google password", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const account = read("apps/website/client/src/pages/Account.tsx");

  assert.match(authContext, /requestEmailChange/);
  assert.match(authContext, /updateUser\(\s*\{\s*email:\s*newEmail\s*\}/);
  assert.match(authContext, /emailRedirectTo:\s*getEmailChangeRedirectTo/);
  assert.match(authContext, /hasEmailIdentity\(session\.user\)/);
  assert.match(account, /Change email/);
  assert.match(account, /Never enter your Google password/);
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
});

test("profile shows honest phone Unverified and email verification status", () => {
  const account = read("apps/website/client/src/pages/Account.tsx");
  assert.match(account, /Phone status:/);
  assert.match(account, /Unverified/);
  assert.match(account, /email_confirmed_at/);
  assert.match(account, /phoneVerified\s*\?\s*"Verified"/);
  assert.match(account, /: "Unverified"/);
});

test("Account Center supports complete address book and checkout selection", () => {
  const account = read("apps/website/client/src/pages/Account.tsx");
  const addresses = read("apps/website/client/src/lib/customer-addresses.ts");
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");

  assert.match(addresses, /type AddressLabel = "Home" \| "Office" \| "Other"/);
  assert.match(addresses, /updateSavedAddress/);
  assert.match(addresses, /setDefaultSavedAddress/);
  assert.match(addresses, /isDefault/);
  assert.match(account, /Make default/);
  assert.match(account, /\bEdit\b/);
  assert.match(account, /\bDelete\b/);
  assert.match(checkout, /listSavedAddresses/);
  assert.match(checkout, /saved-delivery-address/);
  assert.match(checkout, /formatSavedAddress/);
  assert.doesNotMatch(addresses, /gps|geolocation|api[_-]?key|secret/i);
});

test("orders expose status, honest operational gaps, and feasible reorder", () => {
  const orders = read("apps/website/client/src/pages/Orders.tsx");
  const store = read("apps/website/client/src/lib/customer-store.ts");

  assert.match(orders, /STATUS_STEPS/);
  assert.match(orders, /statusBadgeClass/);
  assert.match(orders, /Branch:<\/span>/);
  assert.match(orders, /Type:<\/span>/);
  assert.match(orders, /Reorder/);
  assert.match(orders, /menuItemSlug/);
  assert.match(store, /menuItemSlug\?: string/);
  assert.doesNotMatch(orders, /\b(driver|invoice|ETA|Payment)\b/i);
});

test("security, loyalty, notifications, and overview expose requested production states", () => {
  const account = read("apps/website/client/src/pages/Account.tsx");

  assert.match(account, /email_confirmed_at/);
  assert.match(account, /last_sign_in_at/);
  assert.match(account, /Active sessions/);
  assert.match(account, /Linked accounts/);
  assert.match(account, /Only this device's session is shown/);
  assert.match(account, /Forgot password\?/);
  assert.match(account, /Premium Coming Soon/);
  assert.doesNotMatch(account, /Current points|Points history|Gold preview|Starter preview/);
  assert.match(account, /Order Updates/);
  assert.match(account, /Promotions/);
  assert.match(account, /SMS/);
  assert.match(account, /WhatsApp/);
  assert.match(account, /Active Orders/);
  assert.match(account, /Account Security/);
  assert.match(account, /Last Order/);
  assert.doesNotMatch(account, /Favorite Items|Reward Points/);
});

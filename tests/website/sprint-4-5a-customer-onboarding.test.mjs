import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/** Mirrors apps/website/client/src/lib/auth-utils.ts identity helpers. */
function hasGoogleIdentity(user) {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) return true;
  if (user.app_metadata?.provider === "google") return true;
  if (Array.isArray(user.identities) && user.identities.some((entry) => entry.provider === "google")) {
    return true;
  }
  return false;
}

function hasEmailIdentity(user) {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("email")) return true;
  if (user.app_metadata?.provider === "email") return true;
  if (Array.isArray(user.identities) && user.identities.some((entry) => entry.provider === "email")) {
    return true;
  }
  return false;
}

function isFirstTimePasswordAttach(user) {
  return Boolean(user) && !hasEmailIdentity(user);
}

function mapSupabaseAuthError(message) {
  const normalized = (message ?? "").toLowerCase();
  if (
    normalized.includes("current password required") ||
    normalized.includes("current_password") ||
    normalized.includes("error_code_current_password")
  ) {
    return "Enter your current Telepizza password to change it. This is not your Google password.";
  }
  return message?.trim() || "Something went wrong. Please try again.";
}

test("Google-only user is first-time password attach (no current password)", () => {
  const googleOnly = {
    app_metadata: { provider: "google", providers: ["google"] },
    identities: [{ provider: "google" }],
  };
  assert.equal(hasGoogleIdentity(googleOnly), true);
  assert.equal(hasEmailIdentity(googleOnly), false);
  assert.equal(isFirstTimePasswordAttach(googleOnly), true);
});

test("email identity requires current password for change-password", () => {
  const emailUser = {
    app_metadata: { provider: "email", providers: ["email"] },
    identities: [{ provider: "email" }],
  };
  assert.equal(hasEmailIdentity(emailUser), true);
  assert.equal(isFirstTimePasswordAttach(emailUser), false);

  const linked = {
    app_metadata: { provider: "google", providers: ["google", "email"] },
    identities: [{ provider: "google" }, { provider: "email" }],
  };
  assert.equal(hasGoogleIdentity(linked), true);
  assert.equal(hasEmailIdentity(linked), true);
  assert.equal(isFirstTimePasswordAttach(linked), false);
});

test("Account UI: Google set-password has no Current password field; change-password does", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");

  assert.match(authUtils, /export function hasGoogleIdentity/);
  assert.match(authUtils, /export function hasEmailIdentity/);
  assert.match(authUtils, /export function isFirstTimePasswordAttach/);

  assert.match(account, /isFirstTimePasswordAttach/);
  assert.match(account, /Current password/);
  assert.match(account, /firstTimePassword \? undefined : currentPassword/);
  assert.match(account, /never asks for your Google password/i);
  assert.match(account, /Never enter your Google password/i);

  // First-time path: updateUser({ password }) only — no current_password on that call site.
  assert.match(authContext, /updateUser\(\{\s*password:\s*input\.password\s*\}\)/);
  // Change-password path: current_password included.
  assert.match(authContext, /current_password:\s*current/);
  assert.match(authContext, /hasEmailIdentity\(session\.user\)/);
});

test("current password Supabase errors map to Telepizza (not Google) copy", () => {
  assert.match(
    mapSupabaseAuthError("Current password required when setting new password."),
    /current Telepizza password/i,
  );
  assert.doesNotMatch(
    mapSupabaseAuthError("Current password required when setting new password."),
    /^Current password required when setting new password\.$/,
  );

  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  assert.match(authUtils, /current password required/);
  assert.match(authUtils, /not your Google password/i);
});

test("confirmation UX: Account Created, email shown, Resend Email, Open Gmail", () => {
  const register = read("apps/website/client/src/pages/Register.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");

  assert.match(register, /Account Created/);
  assert.match(register, /We sent a confirmation link to/);
  assert.match(register, /Didn't receive it\?/);
  assert.match(register, /Resend Email/);
  assert.match(register, /Open Gmail/);
  assert.match(register, /mail\.google\.com/);
  assert.match(register, /cannot\s+sign in until your email is confirmed/i);
  assert.match(register, /RESEND_COOLDOWN_SECONDS/);
  assert.doesNotMatch(register, /Account created\. Please confirm your email\./i);
  assert.doesNotMatch(register, /Account created\. Check your inbox and spam folder to confirm your email\./);

  assert.match(authContext, /emailRedirectTo:\s*getEmailConfirmationRedirectTo/);
  assert.match(authContext, /needsEmailConfirmation/);
  assert.match(authContext, /do not treat as logged in/i);
  assert.match(authContext, /resendConfirmationEmail/);
});

test("no privilege from OAuth metadata", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(authContext, /never taken from Google metadata/);
  assert.match(authContext, /Roles \/ branches \/ permissions come only from the API/);
  assert.doesNotMatch(authContext, /user_metadata\s*\.\s*role|user_type.*user_metadata/i);
  assert.match(authContext, /never role \/ user_type \/ branch/);
});

test("SMTP runbook checklist covers custom SMTP, SPF, DKIM, DMARC, redirects — no secrets", () => {
  const runbook = read("docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md");
  assert.match(runbook, /Custom SMTP/);
  assert.match(runbook, /SPF/);
  assert.match(runbook, /DKIM/);
  assert.match(runbook, /DMARC/);
  assert.match(runbook, /\/auth\/callback/);
  assert.match(runbook, /emailRedirectTo/);
  assert.match(runbook, /cannot.*fix SMTP delivery/i);
  assert.doesNotMatch(runbook, /SMTP_PASSWORD\s*=|password\s*[:=]\s*['\"][^'\"]+['\"]/i);
});

test("catalog freeze and branches regression guards remain intact", () => {
  const menuTest = read("tests/menu/option-b-catalog.test.mjs");
  const foundation = read("tests/database/foundation-migrations.test.mjs");
  const branches = read("apps/website/client/src/contexts/BranchContext.tsx");

  assert.match(menuTest, /13/);
  assert.match(menuTest, /58/);
  assert.match(foundation, /royal-orchard/);
  assert.match(foundation, /northern-bypass/);
  assert.match(branches, /royal-orchard/);
  assert.match(branches, /northern-bypass/);
});

test("My Telepizza IA: Dashboard, Profile, Addresses, Security, Orders, Loyalty, Notifications", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const addresses = read("apps/website/client/src/lib/customer-addresses.ts");
  const orders = read("apps/website/client/src/pages/Orders.tsx");

  assert.match(account, /My Telepizza/);
  assert.match(account, /Dashboard|Your hub/);
  assert.match(account, /Addresses/);
  assert.match(account, /Security & login methods/);
  assert.match(account, /Loyalty/);
  assert.match(account, /Notifications/);
  assert.match(account, /Phone status:/);
  assert.match(account, /Unverified/);
  assert.match(account, /Not available yet/);
  assert.doesNotMatch(account, /WhatsApp OTP is enabled|implement.*OTP/i);
  assert.doesNotMatch(account, /listNotifications|unreadNotifications/);

  assert.match(addresses, /addSavedAddress/);
  assert.match(addresses, /listSavedAddresses/);
  assert.doesNotMatch(addresses, /gps|geolocation|api[_-]?key|secret/i);

  assert.match(orders, /Active/);
  assert.match(orders, /Completed/);
  assert.match(orders, /Cancelled/);
  assert.match(orders, /role=["']tablist["']/);
});

test("phone remains honestly Unverified; OTP not implemented", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(account, /Unverified until WhatsApp OTP launches|Unverified — verification by WhatsApp OTP is not available yet|stays Unverified/i);
  assert.match(authContext, /phoneVerified:\s*false/);
  assert.doesNotMatch(account, /phoneVerified:\s*true|Mark as verified|Verify with OTP/i);
});

test("SMTP owner go-live checklist is explicit", () => {
  const runbook = read("docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md");
  assert.match(runbook, /Owner go-live checklist/);
  assert.match(runbook, /Owner required \(app cannot fix delivery\)/);
  assert.match(runbook, /Custom SMTP enabled/);
  assert.match(runbook, /SPF DNS/);
  assert.match(runbook, /DKIM DNS/);
  assert.match(runbook, /DMARC policy/);
});

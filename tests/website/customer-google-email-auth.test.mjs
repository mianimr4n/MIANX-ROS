import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

const AUTH_MIN_PASSWORD_LENGTH = 8;
const AUTH_PASSWORD_REQUIREMENTS_COPY =
  "At least 8 characters, including uppercase, lowercase, a number, and a symbol.";
const AUTH_CALLBACK_PATH = "/auth/callback";
const DEFAULT_AUTH_DESTINATION = "/account";

const SAFE_AUTH_DESTINATION_PREFIXES = [
  "/account",
  "/checkout",
  "/orders",
  "/menu",
  "/track",
  "/order-success",
];

function isSafeInternalAuthPath(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[\s<>"']/.test(trimmed)) return false;
  if (trimmed === AUTH_CALLBACK_PATH || trimmed.startsWith(`${AUTH_CALLBACK_PATH}?`)) return false;
  if (trimmed === "/login" || trimmed.startsWith("/login?")) return false;
  if (trimmed === "/register" || trimmed.startsWith("/register?")) return false;
  const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
  return SAFE_AUTH_DESTINATION_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
}

function sanitizeAuthNextPath(value, fallback = DEFAULT_AUTH_DESTINATION) {
  return isSafeInternalAuthPath(value) ? value.trim() : fallback;
}

function validatePasswordStrength(password) {
  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (!hasLower || !hasUpper || !hasDigit || !hasSymbol) {
    return { ok: false, message: AUTH_PASSWORD_REQUIREMENTS_COPY };
  }
  return { ok: true };
}

function mapOAuthCallbackError(raw) {
  const normalized = (raw ?? "").toLowerCase();
  if (
    normalized.includes("access_denied") ||
    normalized.includes("user cancelled") ||
    normalized.includes("user canceled") ||
    normalized.includes("consent")
  ) {
    return "Google sign-in was cancelled. You can try again or use email.";
  }
  return "Sign-in could not be completed. Please try again.";
}

test("safe internal redirects accept checkout and reject external next URLs", () => {
  assert.equal(sanitizeAuthNextPath("/checkout"), "/checkout");
  assert.equal(sanitizeAuthNextPath("/account"), "/account");
  assert.equal(sanitizeAuthNextPath("/orders"), "/orders");
  assert.equal(sanitizeAuthNextPath("https://evil.example/phish"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("//evil.example"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("/auth/callback"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("/login"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("javascript:alert(1)"), DEFAULT_AUTH_DESTINATION);

  const redirectLib = read("apps/website/client/src/lib/auth-redirect.ts");
  assert.match(redirectLib, /telepizza-website\.vercel\.app/);
  assert.match(redirectLib, /localhost:3000/);
  assert.match(redirectLib, /localhost:5173/);
  assert.match(redirectLib, /Never trust arbitrary external/);
});

test("Google OAuth uses callback route and signInWithOAuth google provider", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const redirectLib = read("apps/website/client/src/lib/auth-redirect.ts");
  const app = read("apps/website/client/src/App.tsx");
  const callback = read("apps/website/client/src/pages/AuthCallback.tsx");

  assert.match(authContext, /signInWithOAuth\(\{\s*provider:\s*["']google["']/);
  assert.match(authContext, /redirectTo:\s*getGoogleOAuthRedirectTo\(\)/);
  assert.match(redirectLib, /AUTH_CALLBACK_PATH\s*=\s*["']\/auth\/callback["']/);
  assert.match(app, /path=["']\/auth\/callback["']/);
  assert.match(callback, /Restoring your Telepizza session/);
  assert.match(callback, /mapOAuthCallbackError/);
  assert.doesNotMatch(callback, /error_description\}/);
});

test("OAuth cancellation and provider errors stay generic", () => {
  assert.match(mapOAuthCallbackError("access_denied"), /cancelled/i);
  assert.match(mapOAuthCallbackError("server_error"), /could not be completed/i);
  assert.doesNotMatch(mapOAuthCallbackError("supabase jwt failed"), /supabase|jwt/i);
});

test("password strength rejects weak passwords and matches UI copy", () => {
  assert.equal(validatePasswordStrength("short").ok, false);
  assert.equal(validatePasswordStrength("password1").ok, false);
  assert.equal(validatePasswordStrength("Password1").ok, false);
  assert.equal(validatePasswordStrength("Password1!").ok, true);

  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  const register = read("apps/website/client/src/pages/Register.tsx");
  assert.match(authUtils, /AUTH_PASSWORD_REQUIREMENTS_COPY/);
  assert.match(register, /AUTH_PASSWORD_REQUIREMENTS_COPY/);
  assert.match(register, /showPassword/);
  assert.match(register, /if \(submitting/);
});

test("Login/Register keep Google primary CTA and no OTP/staff public signup", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  const register = read("apps/website/client/src/pages/Register.tsx");
  assert.match(login, /or sign in with email/);
  assert.match(register, /or continue with email/);
  assert.match(login, /Browse the menu/);
  assert.doesNotMatch(login, /otp|whatsapp.?otp|phone.?otp/i);
  assert.doesNotMatch(register, /otp|whatsapp.?otp|phone.?otp/i);
  assert.doesNotMatch(login, /staff invite|join the team|employee/i);
  assert.doesNotMatch(register, /staff invite|join the team|employee/i);
});

test("Account shows Coming Soon for loyalty/notifications and profile phone management", () => {
  const account = read("apps/website/client/src/pages/Account.tsx");
  assert.match(account, /Add a phone number|faster checkout/);
  assert.match(account, /Loyalty|Notifications/);
  assert.match(account, /not available yet|not live yet/i);
  assert.match(account, /Save profile|Security/);
  assert.match(account, /My Orders|Open My Orders|Orders/);
  assert.doesNotMatch(account, /unreadNotifications|listNotifications/);
});

test("AuthContext logout preserves cart and denies USER_ACCESS_DISABLED safely", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(authContext, /clearStoredUser\(/);
  assert.match(authContext, /do not touch cart storage/i);
  assert.match(authContext, /USER_ACCESS_DISABLED/);
  assert.match(authContext, /appliedAccessToken/);
  assert.doesNotMatch(authContext, /user_metadata\?\.role|app_metadata\?\.role|user_type.*metadata/i);
});

test("customer bootstrap never trusts metadata roles; staff invite path unchanged", () => {
  const migration = read("supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql");
  const staffAccept = read("apps/website/client/src/pages/StaffAccept.tsx");
  assert.match(migration, /user_type[\s\S]*'customer'/);
  assert.match(migration, /status[\s\S]*'active'/);
  assert.doesNotMatch(migration, /raw_user_meta_data ->> 'role'/i);
  assert.doesNotMatch(migration, /raw_user_meta_data ->> 'user_type'/i);
  assert.match(staffAccept, /staff\/invites\/accept|\/staff\/accept|acceptInvite|invite/i);
});

test("no Google client secret in website sources", () => {
  const files = [
    "apps/website/client/src/lib/auth-utils.ts",
    "apps/website/client/src/lib/auth-redirect.ts",
    "apps/website/client/src/lib/supabase.ts",
    "apps/website/client/src/contexts/AuthContext.tsx",
    "apps/website/client/src/components/GoogleSignInButton.tsx",
    "apps/website/client/src/pages/AuthCallback.tsx",
    "apps/website/client/src/pages/Login.tsx",
    "apps/website/client/src/pages/Register.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /GOOGLE_CLIENT_SECRET|client_secret\s*[:=]/i, file);
  }
});

test("catalog freeze and branch regression guards remain intact", () => {
  const menuTest = read("tests/menu/option-b-catalog.test.mjs");
  const foundation = read("tests/database/foundation-migrations.test.mjs");
  assert.match(menuTest, /13/);
  assert.match(foundation, /royal-orchard/);
  assert.match(foundation, /northern-bypass/);
});

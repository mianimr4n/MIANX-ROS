import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("S2 Google login wires signInWithOAuth google + shared OAuth redirect", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const social = read("apps/website/client/src/components/SocialAuthButtons.tsx");
  const redirectLib = read("apps/website/client/src/lib/auth-redirect.ts");

  assert.match(authContext, /signInWithGoogle/);
  assert.match(authContext, /provider:\s*["']google["']/);
  assert.match(authContext, /redirectTo:\s*getOAuthRedirectTo\(\)/);
  assert.match(social, /Continue with Google/);
  assert.match(social, /signInWithGoogle/);
  assert.match(redirectLib, /export function getOAuthRedirectTo/);
  assert.match(redirectLib, /AUTH_CALLBACK_PATH\s*=\s*["']\/auth\/callback["']/);
});

test("S2 Facebook login wires signInWithOAuth facebook with minimal scopes only", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const identity = read("apps/website/client/src/lib/auth-identity.ts");
  const social = read("apps/website/client/src/components/SocialAuthButtons.tsx");
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");

  assert.match(authContext, /signInWithFacebook/);
  assert.match(authContext, /provider:\s*["']facebook["']/);
  assert.match(authContext, /scopes:\s*FACEBOOK_OAUTH_SCOPES/);
  assert.match(identity, /FACEBOOK_OAUTH_SCOPES\s*=\s*["']public_profile,email["']/);
  assert.match(identity, /facebookScopesAreMinimal/);
  assert.match(identity, /FORBIDDEN_FACEBOOK_SCOPE_HINTS/);
  // Allowed scopes constant must stay minimal (forbidden hints listed separately for guards).
  assert.equal(
    identity.match(/FACEBOOK_OAUTH_SCOPES\s*=\s*["']([^"']+)["']/)?.[1],
    "public_profile,email",
  );
  assert.doesNotMatch(authContext, /user_friends|user_photos|graph\.facebook|webhook/i);
  assert.match(social, /Continue with Facebook/);
  assert.match(social, /signInWithFacebook/);
  assert.match(authUtils, /isFacebookOAuthConfigured/);
  assert.match(authUtils, /hasFacebookIdentity/);
});

test("S2 login is social-first with email accordion fallback", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  const register = read("apps/website/client/src/pages/Register.tsx");
  const social = read("apps/website/client/src/components/SocialAuthButtons.tsx");

  assert.match(login, /SocialAuthButtons/);
  assert.match(register, /SocialAuthButtons/);
  assert.match(login, /Use email instead/);
  assert.match(register, /Use email instead/);
  assert.match(login, /aria-expanded=\{emailOpen\}/);
  assert.match(register, /aria-expanded=\{emailOpen\}/);
  assert.match(login, /Forgot password\?/);
  assert.match(login, /Create an account/);
  assert.match(login, /Sign in with email/);
  assert.match(register, /Create account with email/);
  assert.match(social, /min-h-12/);
  assert.match(social, /Continue with Apple/);
  assert.match(social, /Coming soon/);
  assert.doesNotMatch(login, /otp|whatsapp.?otp|twilio/i);
  assert.doesNotMatch(register, /otp|whatsapp.?otp|twilio/i);
});

test("S2 OAuth redirect preserves intended destination via sessionStorage", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const callback = read("apps/website/client/src/pages/AuthCallback.tsx");
  const redirectLib = read("apps/website/client/src/lib/auth-redirect.ts");

  assert.match(authContext, /rememberAuthNextPath\(options\?\.next\)/);
  assert.match(callback, /consumeAuthNextPath/);
  assert.match(callback, /sanitizeAuthNextPath/);
  assert.match(redirectLib, /telepizza\.auth\.next/);
  assert.match(redirectLib, /Never trust arbitrary external/);
});

test("S2 cancel and provider errors use friendly copy without provider payloads", () => {
  const redirectLib = read("apps/website/client/src/lib/auth-redirect.ts");
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  const social = read("apps/website/client/src/components/SocialAuthButtons.tsx");

  assert.match(redirectLib, /Login cancelled\. You can try again or use email\./);
  assert.match(redirectLib, /Unable to sign in\. Please try again\./);
  assert.match(authUtils, /That sign-in method is not available right now/);
  assert.match(social, /Unable to sign in\. Please try again\./);
  assert.doesNotMatch(redirectLib, /error_description\}|JSON\.stringify\(error\)/);
  assert.doesNotMatch(social, /error\.message\}|error_description/);
});

test("S2 logout clears identity session helpers without touching cart", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(authContext, /signOut/);
  assert.match(authContext, /clearStoredUser\(/);
  assert.match(authContext, /do not touch cart storage/i);
  assert.match(authContext, /supabase\.auth\.signOut/);
});

test("S2 identity conflict messaging forbids silent merges and unverified email merge", () => {
  const identity = read("apps/website/client/src/lib/auth-identity.ts");
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");

  assert.match(identity, /no silent merges/i);
  assert.match(identity, /Unverified email merge/);
  assert.match(identity, /Role inheritance/);
  assert.match(identity, /mapIdentityConflictMessage/);
  assert.match(identity, /already linked to another Telepizza account/);
  assert.match(identity, /email is not verified/);
  assert.match(authUtils, /mapIdentityConflictMessage/);
  assert.doesNotMatch(identity, /automatically merge|silent merge into/i);
});

test("S2 Account Security lists Google, Facebook, email, and Apple placeholder", () => {
  const account = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(account, /hasFacebookIdentity/);
  assert.match(account, /facebookConnected/);
  assert.match(account, /Linked accounts/);
  assert.match(account, /font-semibold">Google</);
  assert.match(account, /font-semibold">Facebook</);
  assert.match(account, /Email & password/);
  assert.match(account, /font-semibold">Apple</);
  assert.match(account, /Coming soon/);
  assert.match(account, /Phone \/ WhatsApp sign-in/);
});

test("S2 profile provisioning never overwrites customer-edited display name", () => {
  const migration = read(
    "supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql",
  );
  const nav = read("apps/website/client/src/lib/my-telepizza-nav.ts");

  assert.match(
    migration,
    /full_name = case[\s\S]*when nullif\(trim\(public\.users\.full_name\), ''\) is null then excluded\.full_name[\s\S]*else public\.users\.full_name/i,
  );
  assert.match(nav, /resolveDisplayName/);
  assert.match(nav, /editedOrStoredName/);
  assert.match(nav, /providerFullName/);
});

test("S2 responsive login keeps large social CTAs and no staff/admin auth changes", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  const social = read("apps/website/client/src/components/SocialAuthButtons.tsx");
  const staffLogin = read("apps/website/client/src/pages/StaffLogin.tsx");

  assert.match(social, /w-full/);
  assert.match(social, /text-base font-semibold/);
  assert.match(login, /rounded-3xl/);
  assert.doesNotMatch(login, /staff invite|employee portal/i);
  assert.doesNotMatch(social, /StaffLogin|admin/i);
  assert.doesNotMatch(staffLogin, /signInWithFacebook|Continue with Facebook/);
});

test("S2 scope guard — no OTP, Twilio, loyalty, Graph API in social request path", () => {
  const social = read("apps/website/client/src/components/SocialAuthButtons.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const login = read("apps/website/client/src/pages/Login.tsx");
  const identity = read("apps/website/client/src/lib/auth-identity.ts");

  for (const source of [social, authContext, login]) {
    assert.doesNotMatch(source, /twilio|loyalty.?points|graph\.facebook\.com|user_friends/i);
  }
  assert.match(identity, /FACEBOOK_OAUTH_SCOPES\s*=\s*["']public_profile,email["']/);
  assert.doesNotMatch(authContext, /scopes:\s*["'][^"']*friends/i);
});

const DEFAULT_AUTH_DESTINATION = "/my-telepizza";
const AUTH_CALLBACK_PATH = "/auth/callback";
const SAFE_AUTH_DESTINATION_PREFIXES = [
  "/my-telepizza",
  "/welcome",
  "/account",
  "/checkout",
  "/orders",
  "/menu",
  "/track",
  "/order-success",
  "/reset-password",
  "/branches",
  "/settings",
  "/favorites",
  "/notifications",
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

test("S2 redirect validation accepts customer paths and blocks open redirects", () => {
  assert.equal(sanitizeAuthNextPath("/checkout"), "/checkout");
  assert.equal(sanitizeAuthNextPath("/my-telepizza/orders"), "/my-telepizza/orders");
  assert.equal(sanitizeAuthNextPath("/my-telepizza/addresses"), "/my-telepizza/addresses");
  assert.equal(sanitizeAuthNextPath("/settings"), "/settings");
  assert.equal(sanitizeAuthNextPath("/favorites"), "/favorites");
  assert.equal(sanitizeAuthNextPath("/menu"), "/menu");
  assert.equal(sanitizeAuthNextPath("/"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("/cart"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("https://evil.example"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("//evil.example"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("javascript:alert(1)"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("data:text/html,test"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("\\evil.example"), DEFAULT_AUTH_DESTINATION);
  assert.equal(sanitizeAuthNextPath("/%2F%2Fevil.example"), DEFAULT_AUTH_DESTINATION);
});

test("S2 Register preserves intended destination for social and email signup", () => {
  const register = read("apps/website/client/src/pages/Register.tsx");
  assert.match(register, /sanitizeAuthNextPath/);
  assert.match(register, /peekAuthNextFromLocationSearch/);
  assert.match(register, /next=\{nextPath\}/);
  assert.match(register, /navigate\(nextPath\)/);
});

test("S2 auth errors never fall back to raw provider messages", () => {
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  assert.match(authUtils, /Unable to sign in\. Please try again\./);
  assert.doesNotMatch(authUtils, /return message\.trim\(\)/);
});

test("S2 callback resolves stuck loading with friendly timeout copy", () => {
  const callback = read("apps/website/client/src/pages/AuthCallback.tsx");
  assert.match(callback, /30_000/);
  assert.match(callback, /Unable to sign in\. Please try again\./);
});

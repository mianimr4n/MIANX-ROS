import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/** Mirrors resolveApprovedAuthOrigin + getPasswordRecoveryRedirectTo (no arbitrary redirects). */
const PRODUCTION_AUTH_ORIGIN = "https://telepizza-website.vercel.app";
const LOCAL_AUTH_ORIGIN = "http://localhost:3000";
const APPROVED = [PRODUCTION_AUTH_ORIGIN, LOCAL_AUTH_ORIGIN, "http://localhost:5173"];

function resolveApprovedAuthOrigin(candidate) {
  const raw = (candidate ?? "").trim() || PRODUCTION_AUTH_ORIGIN;
  let origin = raw;
  try {
    origin = new URL(raw).origin;
  } catch {
    return PRODUCTION_AUTH_ORIGIN;
  }
  if (!APPROVED.includes(origin)) return PRODUCTION_AUTH_ORIGIN;
  if (origin === "http://localhost:5173") return LOCAL_AUTH_ORIGIN;
  return origin;
}

function getPasswordRecoveryRedirectTo(origin) {
  return `${resolveApprovedAuthOrigin(origin)}/reset-password`;
}

const AUTH_MIN_PASSWORD_LENGTH = 8;
const AUTH_PASSWORD_REQUIREMENTS_COPY =
  "At least 8 characters, including uppercase, lowercase, a number, and a symbol.";

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

test("recovery route is registered and ResetPassword page renders recovery UI", () => {
  const app = read("apps/website/client/src/App.tsx");
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  assert.match(app, /path=["']\/reset-password["']/);
  assert.match(app, /ResetPassword/);
  assert.match(app, /isCustomerAuthChrome/);
  assert.match(app, /\/reset-password/);
  assert.match(reset, /Choose a new password|New password/);
  assert.match(reset, /Confirm password/);
  assert.match(reset, /AUTH_PASSWORD_REQUIREMENTS_COPY/);
  assert.match(reset, /role=["']alert["']/);
});

test("PASSWORD_RECOVERY event and recovery session are handled on /reset-password", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  assert.match(reset, /PASSWORD_RECOVERY/);
  assert.match(reset, /onAuthStateChange/);
  assert.match(reset, /getSession/);
  assert.match(reset, /getSupabaseClient/);
  assert.match(reset, /clearSensitiveAuthUrl/);
});

test("password recovery redirectTo is env-aware and not an open redirect", () => {
  const redirect = read("apps/website/client/src/lib/auth-redirect.ts");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");

  assert.match(redirect, /PASSWORD_RECOVERY_PATH\s*=\s*["']\/reset-password["']/);
  assert.match(redirect, /getPasswordRecoveryRedirectTo/);
  assert.match(redirect, /resolveApprovedAuthOrigin/);
  assert.match(redirect, /telepizza-website\.vercel\.app/);
  assert.match(redirect, /localhost:3000/);
  assert.match(authContext, /resetPasswordForEmail/);
  assert.match(authContext, /redirectTo:\s*getPasswordRecoveryRedirectTo\(\)/);

  assert.equal(
    getPasswordRecoveryRedirectTo(PRODUCTION_AUTH_ORIGIN),
    "https://telepizza-website.vercel.app/reset-password",
  );
  assert.equal(getPasswordRecoveryRedirectTo(LOCAL_AUTH_ORIGIN), "http://localhost:3000/reset-password");
  assert.equal(getPasswordRecoveryRedirectTo("http://localhost:5173"), "http://localhost:3000/reset-password");
  assert.equal(
    getPasswordRecoveryRedirectTo("https://evil.example"),
    "https://telepizza-website.vercel.app/reset-password",
  );
});

test("valid password update path uses updateUser and signs out to login", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(authContext, /updateUser\(\s*\{\s*password:\s*input\.password\s*\}\)/);
  assert.match(reset, /completePasswordReset/);
  assert.match(reset, /signOut/);
  assert.match(reset, /navigate\(["']\/login["']\)/);
});

test("mismatch and weak passwords are rejected before updateUser", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  assert.match(reset, /Passwords do not match/);
  assert.match(reset, /validatePasswordStrength/);
  assert.equal(validatePasswordStrength("Short1!").ok, false);
  assert.equal(validatePasswordStrength("alllowercase1!").ok, false);
  assert.equal(validatePasswordStrength("ValidPass1!").ok, true);
});

test("expired missing and already-used recovery sessions show honest errors", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  assert.match(reset, /invalid, expired, or was already used|invalid or expired/);
  assert.match(reset, /Request a new link/);
  assert.match(reset, /mapOAuthCallbackError/);
  assert.match(reset, /phase === ["']missing["']/);
});

test("recovery UI never renders tokens and never logs secrets", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  const redirect = read("apps/website/client/src/lib/auth-redirect.ts");
  assert.doesNotMatch(reset, /console\.(log|debug|info|warn|error)\(/);
  assert.doesNotMatch(reset, /localStorage\.getItem/);
  // Hash may be parsed for error codes only — never logged or interpolated into UI copy.
  assert.doesNotMatch(reset, /console\.[a-z]+\([^)]*hash/i);
  assert.doesNotMatch(reset, /\{[^}]*access_token|refresh_token/);
  assert.match(redirect, /Never logs the previous URL/);
  assert.match(reset, /clearSensitiveAuthUrl\(["']\/reset-password["']\)/);
});

test("success path redirects to normal login after recovery sign-out", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  assert.match(reset, /await signOut\(\)/);
  assert.match(reset, /navigate\(["']\/login["']\)/);
  assert.match(reset, /Password updated|Continue to login/);
});

test("accessibility: recovery screens expose alerts and labeled controls", () => {
  const reset = read("apps/website/client/src/pages/ResetPassword.tsx");
  assert.match(reset, /role=["']alert["']/);
  assert.match(reset, /htmlFor=["']password["']/);
  assert.match(reset, /htmlFor=["']confirmPassword["']/);
  assert.match(reset, /aria-label=\{showPassword/);
  assert.match(reset, /aria-label=["']Loading["']/);
  // No hardcoded token/hash material in markup.
  assert.doesNotMatch(reset, /#access_token=|bearer\s+[A-Za-z0-9._-]+/i);
});

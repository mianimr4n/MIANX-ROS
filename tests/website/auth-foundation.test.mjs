import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/** Mirrors apps/website/client/src/lib/auth-utils.ts for static coverage without a harness. */
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

function validateSignupInput(input) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.ok) {
    return passwordCheck;
  }

  return { ok: true, email, password, fullName: fullName || undefined };
}

function mapSupabaseAuthError(message) {
  const normalized = (message ?? "").toLowerCase();
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("user not found")
  ) {
    return "Invalid email or password.";
  }
  if (normalized.includes("already registered") || normalized.includes("user already")) {
    return "Unable to create account. Please try again or sign in.";
  }
  if (
    normalized.includes("pwned") ||
    normalized.includes("data breach") ||
    (normalized.includes("password") && normalized.includes("breach"))
  ) {
    return "This password is too common or appeared in a data breach. Choose a different password.";
  }
  if (
    normalized.includes("weak") ||
    normalized.includes("character of each") ||
    (normalized.includes("password") &&
      (normalized.includes("strength") || normalized.includes("uppercase")))
  ) {
    return AUTH_PASSWORD_REQUIREMENTS_COPY;
  }
  if (
    normalized.includes("password should be at least") ||
    normalized.includes("password is too short") ||
    (normalized.includes("password") && /at least \d+ characters?/.test(normalized))
  ) {
    return `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`;
  }
  return message?.trim() || "Something went wrong. Please try again.";
}

test("signup validation rejects bad email and weak passwords", () => {
  assert.equal(validateSignupInput({ email: "bad", password: "Password1!" }).ok, false);
  assert.equal(validateSignupInput({ email: "a@b.com", password: "short" }).ok, false);
  assert.equal(validateSignupInput({ email: "a@b.com", password: "password1" }).ok, false);
  assert.equal(validateSignupInput({ email: "a@b.com", password: "Password1!" }).ok, true);
});

test("login errors stay generic for invalid credentials and confirm-email is explicit", () => {
  assert.equal(mapSupabaseAuthError("Invalid login credentials"), "Invalid email or password.");
  assert.equal(mapSupabaseAuthError("User not found"), "Invalid email or password.");
  assert.match(mapSupabaseAuthError("Email not confirmed"), /confirm your email/i);
  assert.equal(
    mapSupabaseAuthError("User already registered"),
    "Unable to create account. Please try again or sign in.",
  );
  assert.match(
    mapSupabaseAuthError("Password should be at least 6 characters"),
    /at least 8 characters/i,
  );
  assert.match(
    mapSupabaseAuthError("Password has previously appeared in a data breach"),
    /data breach/i,
  );
  assert.match(
    mapSupabaseAuthError("Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    /uppercase, lowercase, a number, and a symbol/i,
  );
  // Must NOT map every password-related error to the length message.
  assert.doesNotMatch(
    mapSupabaseAuthError("Unable to validate password strength policy"),
    /^Password must be at least 8 characters\.$/,
  );
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  assert.match(authUtils, /Unable to create account\. Please try again or sign in\./);
  assert.match(authUtils, /do NOT map every error that merely contains "password"/i);
});

test("login and register wire Google OAuth through /auth/callback", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  const register = read("apps/website/client/src/pages/Register.tsx");
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const googleButton = read("apps/website/client/src/components/GoogleSignInButton.tsx");
  const supabase = read("apps/website/client/src/lib/supabase.ts");
  const redirectLib = read("apps/website/client/src/lib/auth-redirect.ts");

  assert.match(authUtils, /export function isGoogleOAuthConfigured\(\): boolean/);
  assert.match(authUtils, /VITE_GOOGLE_OAUTH_ENABLED/);
  assert.match(redirectLib, /\/auth\/callback/);
  assert.match(
    authContext,
    /signInWithOAuth\(\{\s*provider:\s*["']google["']/,
  );
  assert.match(authContext, /redirectTo:\s*getGoogleOAuthRedirectTo\(\)/);
  assert.match(supabase, /detectSessionInUrl:\s*true/);
  assert.match(supabase, /flowType:\s*["']pkce["']/);
  assert.match(login, /GoogleSignInButton/);
  assert.match(register, /GoogleSignInButton/);
  assert.match(login, /placement=["']primary["']/);
  assert.match(register, /placement=["']primary["']/);
  assert.match(googleButton, /Continue with Google/);
});

test("Login page validates email, blocks double submit, and keeps OTP out of scope", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  assert.match(login, /isValidEmail/);
  assert.match(login, /if \(submitting\) return/);
  assert.match(login, /showPassword/);
  assert.match(login, /isLoading/);
  assert.doesNotMatch(login, /otp|whatsapp.?otp|phone.?otp/i);
  assert.match(login, /Browse the menu/);
});

test("AuthContext restores session, cleans listener, calls /auth/me with bearer, logout clears identity only", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");

  assert.match(authContext, /getSession\(/);
  assert.match(authContext, /onAuthStateChange/);
  assert.match(authContext, /subscription\.unsubscribe\(/);
  assert.match(authContext, /Authorization:\s*`Bearer \$\{accessToken\}`/);
  assert.match(authContext, /\/auth\/me/);
  assert.match(authContext, /clearStoredUser\(/);
  assert.match(authContext, /signOut/);
  assert.doesNotMatch(authContext, /registerStoredUser|loginStoredUser/);
  assert.match(authContext, /cart storage/i);
});

test("menu and cart providers remain wired in App for anonymous browsing", () => {
  const app = read("apps/website/client/src/App.tsx");
  assert.match(app, /CartProvider/);
  assert.match(app, /MenuCatalogProvider/);
  assert.match(app, /AuthProvider/);
  assert.match(app, /\/auth\/callback/);
});

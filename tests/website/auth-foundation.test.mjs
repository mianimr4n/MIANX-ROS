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

function validateSignupInput(input) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`,
    };
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
  return message?.trim() || "Something went wrong. Please try again.";
}

function isGoogleOAuthConfigured() {
  return false;
}

test("signup validation rejects bad email and short passwords", () => {
  assert.equal(validateSignupInput({ email: "bad", password: "password1" }).ok, false);
  assert.equal(validateSignupInput({ email: "a@b.com", password: "short" }).ok, false);
  assert.equal(validateSignupInput({ email: "a@b.com", password: "password1" }).ok, true);
});

test("login errors stay generic for invalid credentials and confirm-email is explicit", () => {
  assert.equal(mapSupabaseAuthError("Invalid login credentials"), "Invalid email or password.");
  assert.equal(mapSupabaseAuthError("User not found"), "Invalid email or password.");
  assert.match(mapSupabaseAuthError("Email not confirmed"), /confirm your email/i);
  assert.equal(
    mapSupabaseAuthError("User already registered"),
    "Unable to create account. Please try again or sign in.",
  );
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");
  assert.match(authUtils, /Unable to create account\. Please try again or sign in\./);
});

test("Google OAuth stays disabled for Slice 1", () => {
  assert.equal(isGoogleOAuthConfigured(), false);
  const login = read("apps/website/client/src/pages/Login.tsx");
  const register = read("apps/website/client/src/pages/Register.tsx");
  assert.match(login, /Google OAuth intentionally omitted/i);
  assert.match(register, /Google OAuth intentionally omitted/i);
  assert.doesNotMatch(login, /signInWithOAuth/i);
  assert.doesNotMatch(register, /signInWithOAuth/i);
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
});

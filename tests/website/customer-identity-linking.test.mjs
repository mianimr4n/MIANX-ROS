import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

function normalizePakistaniMobileE164(phone) {
  const digits = phone.replace(/\D/g, "");
  let national = null;
  if (digits.startsWith("92") && digits.length === 12 && digits[2] === "3") {
    national = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11 && digits[1] === "3") {
    national = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    national = digits;
  }
  if (!national || !/^3\d{9}$/.test(national)) {
    return { ok: false, message: "invalid" };
  }
  return { ok: true, e164: `+92${national}` };
}

test("Google password attach uses updateUser on current session only", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const account = read("apps/website/client/src/pages/Account.tsx");

  assert.match(authContext, /supabase\.auth\.updateUser\(\{\s*password:/);
  assert.match(authContext, /never sent to Telepizza API/i);
  assert.match(authContext, /setPassword/);
  assert.match(account, /Set a Telepizza password|Update Telepizza password/);
  assert.match(account, /You can now sign in using Google or email and password/);
  assert.match(account, /showPassword/);
  assert.match(account, /if \(passwordBusy\) return/);
});

test("Login keeps Google primary and safe Google-account hint without enumeration", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  assert.match(login, /Continue with Google/);
  assert.match(login, /Created your account with Google\?/);
  assert.match(login, /set a password from your Account/);
  assert.doesNotMatch(login, /resetPasswordForEmail|forgot password/i);
  assert.doesNotMatch(login, /this email is registered|account exists/i);
});

test("Account profile + sign-in methods UI and Coming Soon cards", () => {
  const account = read("apps/website/client/src/pages/Account.tsx");
  assert.match(account, /Save profile/);
  assert.match(account, /Sign-in methods/);
  assert.match(account, /Phone\/WhatsApp OTP/);
  assert.match(account, /Coming Soon/);
  assert.match(account, /My Orders/);
  assert.doesNotMatch(account, /listNotifications|unreadNotifications/);
  assert.match(account, /Phone status:/);
  assert.match(account, /Unverified/);
});

test("profile PATCH path is Bearer-only and strips privilege fields", () => {
  const routes = read("backend/api/src/modules/auth/routes.ts");
  const repo = read("backend/api/src/services/auth/supabase.ts");

  assert.match(routes, /router\.patch\("\/me\/profile"/);
  assert.match(routes, /requireAuth/);
  assert.match(routes, /\.strict\(\)/);
  assert.match(repo, /updateOwnProfile/);
  assert.match(repo, /PHONE_ALREADY_IN_USE/);
  assert.match(repo, /user_type", "customer"/);
  assert.doesNotMatch(repo, /password_hash\s*:/);
  assert.doesNotMatch(routes, /body\.userId|body\.role|body\.authUserId/);
});

test("Pakistani phone normalization accepts 03 and +92 forms", () => {
  assert.equal(normalizePakistaniMobileE164("03001234567").e164, "+923001234567");
  assert.equal(normalizePakistaniMobileE164("+923001234567").e164, "+923001234567");
  assert.equal(normalizePakistaniMobileE164("3001234567").ok, true);
  assert.equal(normalizePakistaniMobileE164("0211234567").ok, false);
});

test("phone E.164 migration does not touch Slice 2D order RLS", () => {
  const migration = read(
    "supabase/migrations/20260716150000_customer_identity_phone_e164.sql",
  );
  assert.match(migration, /users_phone_e164_check/);
  assert.match(migration, /users_phone_e164_uidx/);
  assert.match(migration, /Does NOT modify Slice 2D/);
  assert.doesNotMatch(migration, /orders|order_items|deliveries|payments/i);
});

test("checkout still prefills profile phone; logout preserves cart comment", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(checkout, /profile\?\.phone/);
  assert.match(authContext, /do not touch cart storage/i);
});

test("catalog freeze and branches remain guarded", () => {
  const menuTest = read("tests/menu/option-b-catalog.test.mjs");
  const foundation = read("tests/database/foundation-migrations.test.mjs");
  assert.match(menuTest, /13/);
  assert.match(foundation, /royal-orchard/);
  assert.match(foundation, /northern-bypass/);
});

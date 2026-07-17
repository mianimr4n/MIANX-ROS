import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("Google signup creates/uses one customer profile — no role from OAuth metadata", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const migration = read(
    "supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql",
  );

  assert.match(authContext, /signInWithOAuth/);
  assert.match(authContext, /provider:\s*"google"/);
  assert.match(authContext, /Roles \/ branches \/ permissions come only from the API/);
  assert.match(authContext, /never taken from Google metadata/);
  assert.doesNotMatch(authContext, /user_metadata\s*\.\s*role|user_type.*user_metadata/i);
  assert.match(migration, /ensure_customer_profile_for_auth_user/);
  assert.match(migration, /user_type\s*=\s*'customer'|user_type,\s*\n\s*'customer'/);
  assert.match(migration, /on_auth_user_created/);
});

test("OAuth metadata cannot set role / user_type / branch on signup", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(authContext, /full_name/);
  assert.match(authContext, /never role \/ user_type \/ branch/);
  assert.doesNotMatch(
    authContext,
    /data:\s*\{[^}]*role|data:\s*\{[^}]*user_type|data:\s*\{[^}]*branch/s,
  );
});

test("Google flow never requests a Google password", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  const register = read("apps/website/client/src/pages/Register.tsx");
  const account = read("apps/website/client/src/pages/Account.tsx");
  const googleBtn = read("apps/website/client/src/components/GoogleSignInButton.tsx");

  assert.match(googleBtn, /Continue with Google|signInWithGoogle/);
  // Warning copy that says not to enter a Google password is allowed; do not add a Google-password field.
  assert.doesNotMatch(login, /id=["']googlePassword["']|Google password<\/Label>|type=["']password["'][^>]*google/i);
  assert.doesNotMatch(register, /id=["']googlePassword["']|Google password<\/Label>/i);
  assert.match(account, /never asks for your Google password|Never enter your Google password/i);
  assert.match(login, /Never enter your Google password|Continue with Google/i);
});

test("logged-in Google user can set a Telepizza password via updateUser", () => {
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const account = read("apps/website/client/src/pages/Account.tsx");

  assert.match(authContext, /supabase\.auth\.updateUser\(\{\s*password:/);
  assert.match(authContext, /current_password:\s*current/);
  assert.match(account, /Set a Telepizza password/);
  assert.match(account, /does not create a second login|never asks for your Google password/i);
});

test("email signup confirmation-required state is generic and safe", () => {
  const register = read("apps/website/client/src/pages/Register.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");

  assert.match(register, /Account Created/);
  assert.match(register, /We sent a confirmation link to/);
  assert.match(authContext, /emailRedirectTo:\s*getEmailConfirmationRedirectTo/);
  assert.match(authContext, /needsEmailConfirmation/);
  assert.match(authContext, /do not treat as logged in/i);
  assert.match(register, /awaitingConfirmation/);
  assert.doesNotMatch(register, /account exists|email is already registered/i);
});

test("resend confirmation is rate-limited with safe error handling", () => {
  const register = read("apps/website/client/src/pages/Register.tsx");
  const authContext = read("apps/website/client/src/contexts/AuthContext.tsx");
  const authUtils = read("apps/website/client/src/lib/auth-utils.ts");

  assert.match(authContext, /resendConfirmationEmail/);
  assert.match(authContext, /auth\.resend\(\{/);
  assert.match(authContext, /type:\s*"signup"/);
  assert.match(register, /Resend Email/);
  assert.match(register, /RESEND_COOLDOWN_SECONDS/);
  assert.match(authUtils, /Too many email requests/);
  assert.match(authUtils, /could not send the email right now/i);
  assert.match(authUtils, /over_email_send_rate_limit|rate limit/);
});

test("phone normalization and duplicate protection remain in place", () => {
  const phoneWeb = read("apps/website/client/src/lib/phone.ts");
  const phoneApi = read("backend/api/src/services/auth/phone.ts");
  const repo = read("backend/api/src/services/auth/supabase.ts");
  const account = read("apps/website/client/src/pages/Account.tsx");

  assert.match(phoneWeb, /normalizePakistaniMobileE164/);
  assert.match(phoneApi, /normalizePakistaniMobileE164/);
  assert.match(repo, /PHONE_ALREADY_IN_USE/);
  assert.match(account, /Phone status:/);
  assert.match(account, /Unverified/);
});

test("staff public registration remains impossible; owner/staff model unchanged", () => {
  const register = read("apps/website/client/src/pages/Register.tsx");
  const staffInvites = read("backend/api/src/services/staff/invites.ts");
  const authRoutes = read("backend/api/src/modules/auth/routes.ts");

  assert.doesNotMatch(register, /staff|cashier|branch-manager|super-admin/i);
  assert.match(staffInvites, /acceptInvite|previewInvite/);
  assert.match(authRoutes, /\/staff\/invites\/accept/);
  assert.match(authRoutes, /phoneVerified:\s*false/);
});

test("Contact map card and directions use the same verified Royal Orchard place", () => {
  const locations = read("apps/website/client/src/lib/branch-locations.ts");
  const contact = read("apps/website/client/src/pages/Contact.tsx");
  const embed = read("apps/website/client/src/components/BranchMapEmbed.tsx");
  const extraction = read("REAL-MENU-EXTRACTION.md");

  assert.match(locations, /0x393b35b86e6b36f1:0x340e96d98b9eed61/);
  assert.match(extraction, /0x393b35b86e6b36f1:0x340e96d98b9eed61/);
  assert.match(locations, /getBranchDirectionsUrl/);
  assert.match(locations, /getBranchMapEmbedUrl/);
  assert.match(contact, /getBranchDirectionsUrl/);
  assert.match(contact, /BranchMapEmbed/);
  assert.match(contact, /mapBranch/);
  assert.match(embed, /branch-map-fallback/);
  assert.match(embed, /Loading map/);
  assert.doesNotMatch(contact, /New Ghalla Mandi/i);
  assert.doesNotMatch(embed, /New Ghalla Mandi/i);
  assert.doesNotMatch(contact, /destination=\$\{.*coordinates/);
  assert.match(contact, /Coming Soon/);
});

test("catalog freeze 13/58/3/40/7 and two branches remain guarded", () => {
  const menuTest = read("tests/menu/option-b-catalog.test.mjs");
  const foundation = read("tests/database/foundation-migrations.test.mjs");
  const branches = read("apps/website/client/src/contexts/BranchContext.tsx");

  assert.match(menuTest, /13/);
  assert.match(menuTest, /58/);
  assert.match(foundation, /royal-orchard/);
  assert.match(foundation, /northern-bypass/);
  assert.match(branches, /royal-orchard/);
  assert.match(branches, /northern-bypass/);
  assert.match(branches, /coming-soon/);
});

test("checkout still requires name/phone; Sprint 4.5A does not invent admin order modules", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /Name and phone are required/);

  // Sprint 4.5 admin orders may exist on main; 4.5A must not rewrite their transition surface.
  const adminOrders = read("backend/api/src/modules/admin/orders.ts");
  assert.match(adminOrders, /router|orders/i);
  assert.doesNotMatch(adminOrders, /sprint.?4\.5a|customer.?onboarding/i);
});

test("email delivery runbook exists without SMTP secrets", () => {
  const runbook = read("docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md");
  assert.match(runbook, /Auth Logs/);
  assert.match(runbook, /Custom SMTP/);
  assert.match(runbook, /Spam/);
  assert.match(runbook, /Resend/);
  assert.match(runbook, /\/auth\/callback/);
  assert.doesNotMatch(runbook, /SMTP_PASSWORD\s*=|password\s*[:=]\s*['\"][^'\"]+['\"]/i);
});

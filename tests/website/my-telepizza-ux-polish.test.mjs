import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

function computeProfileCompletion(input) {
  const items = [
    { id: "email", label: "Email verified", done: input.emailVerified },
    { id: "name", label: "Name", done: input.hasName },
    { id: "phone", label: "Phone", done: input.hasPhone },
    { id: "address", label: "Address", done: input.hasAddress },
  ];
  const doneCount = items.filter((item) => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  return {
    percent,
    items,
    remaining: items.filter((item) => !item.done),
    complete: doneCount === items.length,
  };
}

function phoneStatusLabel(input) {
  const trimmed = input.phone?.trim() ?? "";
  if (!trimmed) return { label: "Add phone", tone: "neutral" };
  if (input.phoneVerified) return { label: "Phone verified", tone: "success" };
  return { label: "Phone added", tone: "warning" };
}

test("UX polish: dashboard Current Order vs Ready for your next order are mutually exclusive", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /Current Order/);
  assert.match(hub, /Track your order in real time/);
  assert.match(hub, /Ready for your next order\?/);
  assert.match(hub, /activeOrder \? \(/);
  assert.match(hub, /Track Order/);
  assert.doesNotMatch(
    hub,
    /Ready for your next order\?[\s\S]{0,400}Active order/,
  );
});

test("UX polish: idle dashboard heading when no active order", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /activeOrder \? \([\s\S]*?Current Order[\s\S]*?\) : \([\s\S]*?Ready for your next order\?/);
});

test("UX polish: profile completion helper scores email name phone address", () => {
  const nav = read("apps/website/client/src/lib/my-telepizza-nav.ts");
  assert.match(nav, /computeProfileCompletion/);
  assert.match(nav, /phoneStatusLabel/);

  const half = computeProfileCompletion({
    emailVerified: true,
    hasName: true,
    hasPhone: false,
    hasAddress: false,
  });
  assert.equal(half.percent, 50);
  assert.equal(half.remaining.length, 2);
  assert.equal(half.complete, false);

  const full = computeProfileCompletion({
    emailVerified: true,
    hasName: true,
    hasPhone: true,
    hasAddress: true,
  });
  assert.equal(full.percent, 100);
  assert.equal(full.complete, true);
});

test("UX polish: completion percentage uses persisted profile data only", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /persistedPhone/);
  assert.match(hub, /persistedName/);
  assert.match(hub, /persistedAddresses/);
  assert.match(hub, /hasName: Boolean\(persistedName\)/);
  assert.match(hub, /hasPhone: Boolean\(persistedPhone\)/);
  assert.doesNotMatch(
    hub,
    /computeProfileCompletion\(\{[\s\S]{0,200}fullName \|\| profile\?\.fullName/,
  );
});

test("UX polish: phone badges never say Phone not set when a number exists", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.doesNotMatch(hub, /Phone not set/);
  assert.match(hub, /phoneStatusLabel/);
  assert.match(hub, /effectivePhone/);
  assert.equal(phoneStatusLabel({ phone: null }).label, "Add phone");
  assert.equal(phoneStatusLabel({ phone: "+923001234567" }).label, "Phone added");
  assert.equal(
    phoneStatusLabel({ phone: "+923001234567", phoneVerified: true }).label,
    "Phone verified",
  );
});

test("UX polish: welcome header shows profile completion strip", () => {
  const header = read("apps/website/client/src/components/my-telepizza/CustomerPageHeader.tsx");
  assert.match(header, /Profile completion/);
  assert.match(header, /profileCompletion/);
  assert.match(header, /Coming soon/);
  assert.match(header, /Notifications/);
  assert.match(header, /Rewards/);
  assert.match(header, /Membership/);
});

test("UX polish: Complete your account progress and Your account is ready", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /Complete your account/);
  assert.match(hub, /Your account is ready/);
  assert.doesNotMatch(hub, /Finish your basics/);
});

test("UX polish: addresses success empty failure and retry states", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /CustomerRetryCard/);
  assert.match(hub, /addressesError \?/);
  assert.match(hub, /We couldn't load your saved addresses\./);
  assert.match(hub, /Your details below are safe\. Try loading saved addresses again\./);
  assert.match(hub, /No saved addresses yet\./);
  assert.match(hub, /Add your first delivery address to make checkout faster\./);
  assert.match(hub, /reloadAddresses/);
  assert.match(hub, /saved on this device only/i);
  assert.match(hub, /addressSaveAvailable/);
  assert.match(hub, /disabled=\{!addressSaveAvailable\}/);
  assert.doesNotMatch(hub, /addressesError \|\| !usingCloudAddresses/);
  // Form fields must not be cleared by the retry card path.
  assert.match(hub, /setAddressesError\(null\)/);
  assert.doesNotMatch(
    hub,
    /reloadAddresses[\s\S]{0,400}resetAddressForm\(\)/,
  );
});

test("UX polish: missing profile bootstrap and degraded account copy", () => {
  const auth = read("apps/website/client/src/contexts/AuthContext.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  const supabase = read("backend/api/src/services/auth/supabase.ts");
  assert.match(auth, /isProfileSyncDegraded/);
  assert.match(supabase, /ensure_customer_profile_for_auth_user/);
  assert.match(supabase, /PROFILE_BOOTSTRAP_FAILED/);
  assert.match(
    hub,
    /We couldn(?:'|\&apos;)t prepare your account details right now\. Please try again\./,
  );
});

test("UX polish: favorites empty is not an error; retry on failure", () => {
  const favorites = read("apps/website/client/src/pages/Favorites.tsx");
  assert.match(favorites, /No favourites yet/);
  assert.match(favorites, /Save your favourite pizzas/);
  assert.match(favorites, /CustomerRetryCard/);
  assert.match(favorites, /Browse Menu/);
  assert.match(favorites, /loadFavorites/);
  assert.match(favorites, /error \? \([\s\S]*CustomerRetryCard[\s\S]*\) : favoriteItems\.length === 0/);
});

test("UX polish: rewards and notifications empty copy without red API error", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /Rewards are coming soon/);
  assert.match(hub, /No notifications yet/);
  assert.match(hub, /We'll notify you about orders and exclusive offers/);
});

test("UX polish: security copy does not incorrectly require Google", () => {
  const auth = read("apps/website/client/src/contexts/AuthContext.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(
    auth,
    /Sign out and sign back in using your original sign-in method, then try again\./,
  );
  assert.doesNotMatch(
    auth,
    /please sign in again with Google before creating a Telepizza password/,
  );
  assert.match(hub, /Never enter your Google or Facebook password here/);
  assert.match(hub, /social-login password/);
  assert.doesNotMatch(hub, /Google-only accounts can request/);
});

test("UX polish: no customer OAuth role escalation; staff guards unchanged", () => {
  const auth = read("apps/website/client/src/contexts/AuthContext.tsx");
  assert.match(
    auth,
    /Roles \/ branches \/ permissions come only from the API principal \(DB\), never metadata/,
  );
  assert.match(auth, /Roles are never taken from Google metadata/);
  assert.doesNotMatch(auth, /user_metadata\.role/);
  assert.doesNotMatch(auth, /app_metadata\.role/);
});

test("UX polish: timeline distinguishes completed current future steps", () => {
  const timeline = read("apps/website/client/src/components/my-telepizza/OrderStatusTimeline.tsx");
  assert.match(timeline, /completed/);
  assert.match(timeline, /current/);
  assert.match(timeline, /future/);
  assert.match(timeline, /emerald/);
  assert.match(timeline, /bg-brand-red/);
});

test("UX polish: friendly password attach success toasts", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /toast\.success\(["']Profile updated successfully/);
  assert.match(hub, /Password created successfully/);
});

test("UX polish: shared empty and retry components exist with live region", () => {
  const empty = read("apps/website/client/src/components/my-telepizza/CustomerEmptyState.tsx");
  const retry = read("apps/website/client/src/components/my-telepizza/CustomerRetryCard.tsx");
  assert.match(empty, /CustomerEmptyState/);
  assert.match(retry, /aria-live="polite"/);
  assert.match(retry, /Try again/);
});

test("UX polish: address service does not leak raw provider errors", () => {
  const service = read("backend/api/src/services/addresses/customer-addresses.ts");
  assert.match(service, /Could not load saved addresses/);
  assert.doesNotMatch(service, /ADDRESS_LIST_FAILED", error\.message/);
  assert.doesNotMatch(service, /await client\s*\n\s*\.from\("customer_addresses"\)/);
});

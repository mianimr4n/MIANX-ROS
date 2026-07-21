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

test("UX polish: addresses retry vs device-local honesty", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /CustomerRetryCard/);
  assert.match(hub, /addressesError \?/);
  assert.match(hub, /saved on this device only/i);
  assert.doesNotMatch(hub, /addressesError \|\| !usingCloudAddresses/);
});

test("UX polish: favorites empty and retry states", () => {
  const favorites = read("apps/website/client/src/pages/Favorites.tsx");
  assert.match(favorites, /No favourites yet/);
  assert.match(favorites, /Save your favourite pizzas/);
  assert.match(favorites, /CustomerRetryCard/);
  assert.match(favorites, /Browse Menu/);
  assert.match(favorites, /loadFavorites/);
});

test("UX polish: timeline distinguishes completed current future steps", () => {
  const timeline = read("apps/website/client/src/components/my-telepizza/OrderStatusTimeline.tsx");
  assert.match(timeline, /completed/);
  assert.match(timeline, /current/);
  assert.match(timeline, /future/);
  assert.match(timeline, /emerald/);
  assert.match(timeline, /bg-brand-red/);
});

test("UX polish: friendly password attach copy and success toasts", () => {
  const auth = read("apps/website/client/src/contexts/AuthContext.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(
    auth,
    /For your security, please sign in again with Google before creating a Telepizza password/,
  );
  assert.doesNotMatch(auth, /Could not attach a Telepizza password yet/);
  assert.match(hub, /toast\.success\(["']Profile updated successfully/);
  assert.match(hub, /Password created successfully/);
});

test("UX polish: rewards and notifications empty copy", () => {
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(hub, /Rewards are coming soon/);
  assert.match(hub, /No notifications yet/);
  assert.match(hub, /We'll notify you about orders and exclusive offers/);
});

test("UX polish: shared empty and retry components exist", () => {
  const empty = read("apps/website/client/src/components/my-telepizza/CustomerEmptyState.tsx");
  const retry = read("apps/website/client/src/components/my-telepizza/CustomerRetryCard.tsx");
  assert.match(empty, /CustomerEmptyState/);
  assert.match(retry, /We're having trouble loading your information/);
  assert.match(retry, /Try again/);
});

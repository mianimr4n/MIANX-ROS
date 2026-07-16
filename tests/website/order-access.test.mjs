import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/** Mirrors apps/website/client/src/lib/order-access.ts */
const CUSTOMER_CANCEL_WINDOW_MS = 15 * 60 * 1000;

function canGuestCancelOrder(status, createdAt, nowMs = Date.now()) {
  if (status !== "pending") return false;
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= CUSTOMER_CANCEL_WINDOW_MS;
}

function mapCancelApiError(code, fallbackMessage) {
  const messages = {
    ORDER_CANCEL_WINDOW_EXPIRED: "window has expired",
    ORDER_CANCEL_NOT_ALLOWED: "no longer be cancelled online",
  };
  if (code && messages[code]) return messages[code];
  return fallbackMessage || "Could not cancel order.";
}

test("canGuestCancelOrder allows pending orders inside 15 minutes", () => {
  const now = Date.parse("2026-07-16T12:00:00.000Z");
  const createdAt = new Date(now - 5 * 60 * 1000).toISOString();
  assert.equal(canGuestCancelOrder("pending", createdAt, now), true);
  assert.equal(canGuestCancelOrder("confirmed", createdAt, now), false);
  assert.equal(canGuestCancelOrder("pending", new Date(now - 16 * 60 * 1000).toISOString(), now), false);
});

test("mapCancelApiError surfaces stable cancel messages", () => {
  assert.match(mapCancelApiError("ORDER_CANCEL_WINDOW_EXPIRED", ""), /window has expired/i);
  assert.equal(mapCancelApiError(undefined, "Server error"), "Server error");
});

test("TrackOrder wires guest cancel flow against API orders", () => {
  const trackOrder = read("apps/website/client/src/pages/TrackOrder.tsx");
  assert.match(trackOrder, /cancelOrder\(/);
  assert.match(trackOrder, /canGuestCancelOrder/);
  assert.match(trackOrder, /mapCancelApiError/);
  assert.match(trackOrder, /LOC-/);
  assert.doesNotMatch(trackOrder, /Login|Register/);
});

test("telepizza-api exposes cancel and canonical order read", () => {
  const api = read("apps/website/client/src/lib/telepizza-api.ts");
  assert.match(api, /export function cancelOrder/);
  assert.match(api, /export function fetchOrder\(/);
  assert.match(api, /\/orders\/\$\{encodeURIComponent\(orderNumber\)\}\/cancel/);
});

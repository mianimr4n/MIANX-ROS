/**
 * D3 public booking page — static contract tests.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("D3 public booking (static)", () => {
  it("registers /book routes and PublicBooking page", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /PublicBooking/);
    assert.match(app, /path="\/book"/);
    assert.match(app, /path="\/book\/cancel"/);
    assert.ok(existsSync(join(root, "apps/website/client/src/pages/PublicBooking.tsx")));
  });

  it("implements availability → guest details → privacy → confirmation flow", () => {
    const page = read("apps/website/client/src/pages/PublicBooking.tsx");
    assert.match(page, /partySize|party size/i);
    assert.match(page, /privacy|Privacy/);
    assert.match(page, /idempotency|Idempotency/i);
    assert.match(page, /reservationNumber|confirmation/i);
    assert.match(page, /cancel/i);
    // Must call public API, not invent slots client-side
    assert.match(page, /\/api\/v1\/reservations|public-booking-api/);
  });

  it("backend public booking module is wired with rate limits", () => {
    const routes = read("backend/api/src/modules/public-booking/routes.ts");
    assert.match(routes, /publicBookingRateLimitMiddleware/);
    assert.match(routes, /IDEMPOTENCY_KEY_REQUIRED|idempotency-key/i);
    assert.match(routes, /cancel/);
    const index = read("backend/api/src/modules/index.ts");
    assert.match(index, /\/api\/v1\/reservations/);
    assert.match(index, /createPublicBookingRouter/);
  });
});

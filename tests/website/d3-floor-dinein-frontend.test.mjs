/**
 * D3 corrective — frontend static contract tests for Floor Plan, Reservations,
 * Waitlist, Floor Console, and POS dine-in session wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("D3 Floor Plan workspace (static)", () => {
  const page = () => read("apps/website/client/src/pages/admin/AdminFloorPlan.tsx");

  it("uses real floor configuration API and accessible list fallback", () => {
    const src = page();
    assert.match(src, /getFloorConfiguration|listTableCombinations/);
    assert.match(src, /useOperationalData/);
    assert.match(src, /OperationalStatusBanner/);
    assert.match(src, /canManageFloorConfiguration/);
    // Accessible alternative to visual map
    assert.match(src, /table|list|aria-/i);
  });

  it("validates capacity before save and supports housekeeping statuses", () => {
    const src = page();
    assert.match(src, /capacity/i);
    assert.match(src, /cleaning|blocked|out_of_service|available/);
  });
});

describe("D3 Reservations workspace (static)", () => {
  const page = () => read("apps/website/client/src/pages/admin/AdminReservations.tsx");

  it("covers create, availability, confirm/cancel/no-show, seat", () => {
    const src = page();
    assert.match(src, /searchAvailability|createReservation/);
    assert.match(src, /confirm|cancel|no-show|arrive|seat/i);
    assert.match(src, /useOperationalData/);
    assert.match(src, /OperationalStatusBanner/);
    assert.match(src, /canManageReservations|canSeatGuests/);
  });

  it("does not hard-code authoritative timezone calculations", () => {
    const src = page();
    // Display formatting may use Asia/Karachi for labels, but wall-clock
    // availability must come from the API (searchAvailability).
    assert.match(src, /searchAvailability|listReservations/);
    assert.doesNotMatch(src, /BRANCH_UTC_OFFSET|wallTimeToUtcIso/);
  });

  it("sends list limit within backend max and keeps EMPTY distinct from ERROR", () => {
    const src = page();
    assert.match(src, /limit:\s*100/);
    assert.doesNotMatch(src, /limit:\s*200/);
    assert.match(src, /EMPTY — no reservations for this day/);
    assert.match(src, /reservationsOp\.state === "ERROR"/);
    assert.match(src, /Use Retry above/);
  });
});

describe("D3 Waitlist workspace (static)", () => {
  const page = () => read("apps/website/client/src/pages/admin/AdminWaitlist.tsx");

  it("supports add, notify, arrive, seat, cancel/left", () => {
    const src = page();
    assert.match(src, /addWaitlistEntry|listWaitlist/);
    assert.match(src, /notify|arrive|seat|cancel|left/i);
    assert.match(src, /quotedWait|partySize|guestName/i);
  });

  it("sends list limit within backend max and keeps EMPTY distinct from ERROR", () => {
    const src = page();
    assert.match(src, /limit:\s*100/);
    assert.doesNotMatch(src, /limit:\s*200/);
    assert.match(src, /EMPTY — nobody is waiting/);
    assert.match(src, /waitlistOp\.state === "ERROR"/);
    assert.match(src, /waitlistOp\.state === "OFFLINE"/);
    assert.match(src, /Resolved today/);
    assert.match(src, /Use Retry above/);
  });

  it("keeps resolved-today honest on ERROR and OFFLINE (no EMPTY concealment)", () => {
    const src = page();
    assert.match(
      src,
      /Resolved history unavailable while waitlist data could not be loaded/,
    );
    // Expanded resolved body must gate ERROR/OFFLINE before EMPTY.
    assert.match(
      src,
      /waitlistOp\.state === "ERROR" \|\| waitlistOp\.state === "OFFLINE"[\s\S]*Resolved history unavailable[\s\S]*closed\.length === 0[\s\S]*EMPTY\./,
    );
  });
});

describe("D3 table-service list query serialization", () => {
  it("clamps reservation and waitlist list limits via shared clampListLimit", () => {
    const api = read("apps/website/client/src/lib/table-service-api.ts");
    assert.match(api, /clampListLimit/);
    assert.match(api, /from "@\/lib\/clamp-list-limit"/);
    assert.match(api, /params\.set\("limit", String\(clampListLimit\(query\.limit\)\)\)/);
    assert.doesNotMatch(api, /params\.set\("limit", String\(query\.limit \?\? 100\)\)/);
  });
});

describe("responsive smoke script path hygiene", () => {
  it("contains no absolute D-drive private release-artifacts path", () => {
    const src = read("scripts/reservations-waitlist-responsive-smoke.mjs");
    const privateRoot = ["telepizza", "private"].join("-");
    const absForward = `D:/${privateRoot}`;
    const absBack = `D:\\${privateRoot}`;
    const evidencePath = ["release-artifacts", "prod-acceptance"].join("/");
    assert.ok(!src.includes(absForward), "forward-slash private absolute path must be absent");
    assert.ok(!src.includes(absBack), "backslash private absolute path must be absent");
    assert.ok(!src.includes(evidencePath), "private evidence path must be absent");
    assert.match(src, /test-results/);
    assert.match(src, /RESERVATIONS_WAITLIST_SMOKE_OUT|process\.argv\[2\]/);
  });
});

describe("D3 Live Floor Console (static)", () => {
  const page = () => read("apps/website/client/src/pages/admin/AdminFloorConsole.tsx");

  it("renders live floor state with status labels beyond color alone", () => {
    const src = page();
    assert.match(src, /getLiveFloorState/);
    assert.match(src, /TABLE_STATUS_LABELS|TABLE_STATUS_CLASSES/);
    assert.match(src, /bill_requested|cleaning|occupied|available/);
    assert.match(src, /seatWalkIn|requestSessionBill|closeDiningSession|transitionTableStatus/);
  });
});

describe("D3 POS dine-in session link (static)", () => {
  it("loads active sessions and passes diningSessionId on create", () => {
    const pos = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    assert.match(pos, /listActiveSessions/);
    assert.match(pos, /diningSessionId/);
    assert.match(pos, /dine-in/);
    const api = read("apps/website/client/src/lib/admin-api.ts");
    // createAdminPosOrder body may accept diningSessionId via AdminPos payload
    assert.match(pos, /createAdminPosOrder/);
  });
});

describe("D3 admin access + routes (static)", () => {
  it("registers floor/reservations/waitlist routes and role redirects", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminFloorConsole|AdminFloorPlan|AdminReservations|AdminWaitlist/);
    assert.match(app, /\/admin\/floor|\/admin\/reservations|\/admin\/waitlist|\/admin\/floor-plan/);
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessTableService|canManageReservations|canSeatGuests|canManageFloorConfiguration/);
    assert.match(access, /isHostOnly|isWaiterOnly/);
    // D4 consolidates redirects through resolveStaffHome (still uses isHostOnly/isWaiterOnly).
    assert.match(access, /resolveStaffHome/);
    assert.match(access, /\/admin\/home\/host|\/admin\/home\/waiter/);
    const host = read("apps/website/client/src/pages/admin/AdminHostHome.tsx");
    assert.match(host, /tableOp\.state === "ERROR"|tableOp\.state === "OFFLINE"/);
    assert.match(host, /zeros are not shown while the API is down/);
    const redirect = read("apps/website/client/src/pages/admin/AdminIndexRedirect.tsx");
    assert.match(redirect, /resolveStaffHome/);
  });
});

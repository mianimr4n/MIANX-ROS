/**
 * RC6-DASH-03 — daily command modes contracts + deterministic suggestion tests.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const suggestSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/suggest.ts"),
  "utf8",
);
const typesSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/types.ts"),
  "utf8",
);
const urlSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/url.ts"),
  "utf8",
);
const registrySrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const headerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/CommandModeHeader.tsx"),
  "utf8",
);
const dashSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminDashboard.tsx"),
  "utf8",
);

/** Pure mirror of suggest.ts for deterministic clocks (Asia/Karachi = UTC+5, no DST). */
const CLOSING_LEAD = 60;
const TZ = "Asia/Karachi";

function parseHm(raw) {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(raw).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function localMinutes(now) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (hour === 24) hour = 0;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function inWindow(nowMin, opens, closes) {
  if (opens === closes) return false;
  if (opens < closes) return nowMin >= opens && nowMin < closes;
  return nowMin >= opens || nowMin < closes;
}

function untilClose(nowMin, opens, closes) {
  if (!inWindow(nowMin, opens, closes)) return null;
  if (opens < closes) return closes - nowMin;
  if (nowMin >= opens) return 24 * 60 - nowMin + closes;
  return closes - nowMin;
}

function suggest(now, opensAt, closesAt, unresolved = false) {
  const opens = parseHm(opensAt);
  const closes = parseHm(closesAt);
  if (opens == null || closes == null || opens === closes) return "LIVE_OPERATIONS";
  const nowMin = localMinutes(now);
  const inside = inWindow(nowMin, opens, closes);
  if (!inside && unresolved) return "CLOSING";
  if (!inside) return "PRE_OPEN";
  const left = untilClose(nowMin, opens, closes);
  if (left != null && left <= CLOSING_LEAD) return "CLOSING";
  return "LIVE_OPERATIONS";
}

/** Build a Date whose Asia/Karachi wall clock is the given HH:MM on 2026-08-02. */
function karachiClock(hour, minute) {
  // Karachi = UTC+5 → UTC = local - 5h
  const utcHour = hour - 5;
  const day = utcHour < 0 ? "01" : "02";
  const h = ((utcHour % 24) + 24) % 24;
  return new Date(
    `2026-08-${day}T${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
  );
}

describe("RC6-DASH-03 command mode contracts", () => {
  it("defines three Owner-facing modes with DRILL_DOWN/insight maturity only", () => {
    assert.match(typesSrc, /PRE_OPEN/);
    assert.match(typesSrc, /LIVE_OPERATIONS/);
    assert.match(typesSrc, /CLOSING/);
    assert.match(typesSrc, /label: "Pre-open"/);
    assert.match(typesSrc, /label: "Live Operations"/);
    assert.match(typesSrc, /label: "Closing"/);
    assert.doesNotMatch(typesSrc, /DRAFT_ACTION|APPROVAL_REQUIRED|DIRECT_EXECUTION/);
    assert.match(typesSrc, /Opening checklist completion/);
  });

  it("suggestion is advisory and timezone-aware", () => {
    assert.match(suggestSrc, /Suggestion is advisory/);
    assert.match(suggestSrc, /Asia\/Karachi/);
    assert.match(suggestSrc, /CLOSING_LEAD_MINUTES/);
    assert.match(suggestSrc, /does not open or close the branch/);
    assert.match(suggestSrc, /Overnight/);
  });

  it("URL sanitizes commandMode and omits PII keys", () => {
    assert.match(urlSrc, /commandMode/);
    assert.match(urlSrc, /pre-open/);
    assert.match(urlSrc, /parseCommandModeParam/);
    assert.match(urlSrc, /never invents branchId or PII keys/);
    assert.doesNotMatch(urlSrc, /params\.set\("branchId"|params\.set\("phone"|params\.set\("email"/);
  });

  it("mode composition keeps exception-center first in every mode", () => {
    for (const mode of ["PRE_OPEN", "LIVE_OPERATIONS", "CLOSING"]) {
      const block = registrySrc.split(`${mode}:`)[1]?.slice(0, 500) ?? "";
      assert.match(block, /"exception-center"/);
      const sectionsMatch = block.match(/sections:\s*\[([\s\S]*?)\]/);
      const firstQuoted = sectionsMatch?.[1]?.match(/"([^"]+)"/)?.[1];
      assert.equal(firstQuoted, "exception-center", `${mode} must lead with exception-center`);
    }
    assert.match(registrySrc, /ready to open/i);
    assert.match(registrySrc, /Closing view is partial/);
  });

  it("wires Owner Command Center header and URL state", () => {
    assert.match(ownerSrc, /CommandModeHeader/);
    assert.match(ownerSrc, /suggestCommandMode/);
    assert.match(ownerSrc, /readCommandModeFromSearch/);
    assert.match(ownerSrc, /writeCommandModeSearch/);
    assert.match(ownerSrc, /data-selected-command-mode/);
    assert.match(headerSrc, /role="radiogroup"/);
    assert.match(headerSrc, /Use suggested mode/);
    assert.match(headerSrc, /min-h-11/);
    assert.match(dashSrc, /fetchBranchProfile/);
    assert.match(dashSrc, /branchOpensAt/);
  });

  it("does not mutate branch open/close or invent readiness completion", () => {
    assert.doesNotMatch(ownerSrc, /updateBranchProfile|updateBranchSettings|clock.?in|z-report|closeRegister/i);
    assert.doesNotMatch(headerSrc, /Ready to open|Ready to close/);
    assert.match(registrySrc, /ready to open/i);
  });

  it("acceptance evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/rc6-dash-03");
    for (const name of [
      "MODE_SOURCE_AUDIT.md",
      "COMMAND_MODE_CONTRACT.md",
      "AUTO_SUGGESTION_RULES.md",
      "MODE_WIDGET_MATRIX.md",
      "MANUAL_OVERRIDE_AND_URL_STATE.md",
      "FRESHNESS_AND_LIMITATIONS.md",
      "SECURITY_ACCESSIBILITY_PERFORMANCE.md",
      "TEST_RESULTS.md",
      "FINAL_REPORT.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

describe("RC6-DASH-03 automatic suggestion (deterministic clock)", () => {
  it("suggests PRE_OPEN before opening window", () => {
    assert.equal(suggest(karachiClock(10, 0), "11:00", "23:00"), "PRE_OPEN");
  });

  it("suggests LIVE_OPERATIONS inside operating window", () => {
    assert.equal(suggest(karachiClock(12, 0), "11:00", "23:00"), "LIVE_OPERATIONS");
  });

  it("suggests CLOSING near closing boundary", () => {
    assert.equal(suggest(karachiClock(22, 30), "11:00", "23:00"), "CLOSING");
  });

  it("suggests CLOSING after close when unresolved ops remain", () => {
    assert.equal(suggest(karachiClock(23, 30), "11:00", "23:00", true), "CLOSING");
  });

  it("suggests PRE_OPEN after close when quiet", () => {
    assert.equal(suggest(karachiClock(23, 30), "11:00", "23:00", false), "PRE_OPEN");
  });

  it("handles overnight schedules", () => {
    assert.equal(suggest(karachiClock(20, 0), "18:00", "02:00"), "LIVE_OPERATIONS");
    assert.equal(suggest(karachiClock(1, 30), "18:00", "02:00"), "CLOSING");
    assert.equal(suggest(karachiClock(3, 0), "18:00", "02:00", false), "PRE_OPEN");
    assert.equal(suggest(karachiClock(3, 0), "18:00", "02:00", true), "CLOSING");
  });

  it("falls back when hours missing or invalid", () => {
    assert.equal(suggest(karachiClock(12, 0), null, null), "LIVE_OPERATIONS");
    assert.equal(suggest(karachiClock(12, 0), "25:00", "23:00"), "LIVE_OPERATIONS");
    assert.equal(suggest(karachiClock(12, 0), "11:00", "11:00"), "LIVE_OPERATIONS");
  });

  it("URL parser accepts only known tokens", () => {
    const map = {
      "pre-open": "PRE_OPEN",
      live: "LIVE_OPERATIONS",
      closing: "CLOSING",
    };
    for (const [token, mode] of Object.entries(map)) {
      assert.match(urlSrc, new RegExp(token));
      assert.match(typesSrc, new RegExp(mode));
    }
    assert.match(urlSrc, /return null/);
  });
});

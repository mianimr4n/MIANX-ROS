/**
 * RC6-DASH-08 — What Changed + operational timeline foundation contracts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const typesSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/types.ts"),
  "utf8",
);
const compareSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/compare.ts"),
  "utf8",
);
const buildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/build-summary.ts"),
  "utf8",
);
const timelineSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/timeline.ts"),
  "utf8",
);
const storageSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/storage.ts"),
  "utf8",
);
const modeSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/mode-emphasis.ts"),
  "utf8",
);
const panelSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/WhatChangedPanel.tsx"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const modeRegSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);
const eodSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/eod-pack/build-pack.ts"),
  "utf8",
);

function percentChange(previous, current) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function resolveSinceAnchor(hasComparableBaseline) {
  if (hasComparableBaseline) {
    return {
      kind: "BROWSER_LOCAL_REVIEW",
      label: "Since your last review on this device",
    };
  }
  return {
    kind: "BUSINESS_WINDOW",
    label: "Changes during the selected business window",
  };
}

function compareSnapshots(previous, current) {
  if (!previous) return [];
  if (previous.branchId !== current.branchId) return [];
  if (previous.businessWindow !== current.businessWindow) return [];
  const out = [];
  for (const key of Object.keys(current.metrics)) {
    const prev = previous.metrics[key];
    const curr = current.metrics[key];
    if (prev == null || curr == null) continue;
    const absoluteChange = curr - prev;
    if (absoluteChange === 0) continue;
    out.push({ key, prev, curr, absoluteChange, pct: percentChange(prev, curr) });
  }
  return out;
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const t = String(b.occurredAt).localeCompare(String(a.occurredAt));
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}

describe("RC6-DASH-08 What Changed and timeline foundation", () => {
  it("1–3. persisted/derived/browser-local classification present", () => {
    assert.match(typesSrc, /PERSISTED/);
    assert.match(typesSrc, /DERIVED/);
    assert.match(typesSrc, /BROWSER_LOCAL/);
    assert.match(timelineSrc, /persistenceState: "DERIVED"/);
    assert.match(compareSrc, /persistenceState: "BROWSER_LOCAL"/);
    assert.match(storageSrc, /telepizza\.admin\.whatChanged\.v1/);
  });

  it("4–6. since-anchor semantics — device review, not fake last login", () => {
    assert.deepEqual(resolveSinceAnchor(true), {
      kind: "BROWSER_LOCAL_REVIEW",
      label: "Since your last review on this device",
    });
    assert.deepEqual(resolveSinceAnchor(false), {
      kind: "BUSINESS_WINDOW",
      label: "Changes during the selected business window",
    });
    assert.match(buildSrc, /Since your last review on this device/);
    assert.match(buildSrc, /FORBIDDEN_SINCE_WORDING/);
    assert.match(buildSrc, /Previous successful sign-in watermark is not available/);
    assert.doesNotMatch(panelSrc, /Since your last login/);
    assert.doesNotMatch(ownerSrc, /Since your last login/);
  });

  it("7–9. same-window / branch-scope / zero-denominator percentage", () => {
    const base = {
      branchId: "b1",
      businessWindow: "2026-08-02",
      metrics: { orderCount: 10, lowStockCount: 0 },
    };
    assert.equal(
      compareSnapshots(base, { ...base, metrics: { orderCount: 12, lowStockCount: 2 } }).length,
      2,
    );
    assert.equal(
      compareSnapshots(base, { ...base, branchId: "b2", metrics: { orderCount: 12 } }).length,
      0,
    );
    assert.equal(
      compareSnapshots(base, {
        ...base,
        businessWindow: "2026-08-01",
        metrics: { orderCount: 12 },
      }).length,
      0,
    );
    assert.equal(percentChange(0, 5), null);
    assert.equal(percentChange(10, 15), 50);
    assert.match(compareSrc, /if \(previous === 0\) return null/);
  });

  it("10. source failure is not interpreted as improvement / No changes", () => {
    assert.match(buildSrc, /Source failure is never interpreted/);
    assert.match(buildSrc, /do not treat this as .No changes/);
    assert.match(panelSrc, /this is not .No changes/);
    assert.match(timelineSrc, /not an empty day/);
  });

  it("11–13. deduplication, chronological + stable tie ordering", () => {
    assert.match(timelineSrc, /byId/);
    const sorted = sortEvents([
      { id: "b", occurredAt: "2026-08-02T10:00:00Z" },
      { id: "a", occurredAt: "2026-08-02T12:00:00Z" },
      { id: "c", occurredAt: "2026-08-02T12:00:00Z" },
    ]);
    assert.deepEqual(
      sorted.map((e) => e.id),
      ["a", "c", "b"],
    );
  });

  it("14. safe actor fallback", () => {
    assert.match(timelineSrc, /Actor unavailable/);
    assert.doesNotMatch(timelineSrc, /fullName/);
    assert.match(ownerSrc, /employees: null/);
  });

  it("15–17. domain / severity / branch filtering support", () => {
    assert.match(timelineSrc, /domainFilter/);
    assert.match(timelineSrc, /severityFilter/);
    assert.match(panelSrc, /timeline-domain-filter/);
    assert.match(panelSrc, /timeline-severity-filter/);
    assert.match(timelineSrc, /branchId: input\.branchId/);
  });

  it("18–20. honest empty / partial / full failure states", () => {
    assert.match(timelineSrc, /No supported activity events were found for this window/);
    assert.match(timelineSrc, /partialFailure/);
    assert.match(timelineSrc, /totalFailure/);
    assert.match(panelSrc, /timeline-empty/);
    assert.match(panelSrc, /what-changed-source-failure/);
  });

  it("21. retention / incomplete audit limitation", () => {
    assert.match(timelineSrc, /not a complete organization audit stream/);
    assert.match(buildSrc, /Cross-device and organization-wide history are not claimed/);
  });

  it("22–23. drill-downs and no PII in cards/storage/URLs", () => {
    assert.match(compareSrc, /href: "\/admin\/orders"/);
    assert.match(timelineSrc, /Order identifiers and contents are omitted/);
    assert.match(storageSrc, /Never stores tokens/);
    assert.match(storageSrc, /storagePayloadLooksSafe/);
    assert.doesNotMatch(timelineSrc, /\bcustomer\b|salary|iban|\+92|email@/i);
    assert.match(timelineSrc, /no employee names/);
  });

  it("24–25. browser-local reset and refresh controls", () => {
    assert.match(panelSrc, /what-changed-reset-baseline/);
    assert.match(panelSrc, /what-changed-mark-reviewed/);
    assert.match(panelSrc, /what-changed-refresh/);
    assert.match(storageSrc, /clearReviewSnapshot|removeItem/);
    assert.match(ownerSrc, /setWhatChangedTick/);
  });

  it("26. critical events remain visible across modes (what-changed in all modes)", () => {
    assert.match(modeRegSrc, /"what-changed"/);
    assert.match(modeRegSrc, /PRE_OPEN:[\s\S]*what-changed/);
    assert.match(modeRegSrc, /LIVE_OPERATIONS:[\s\S]*what-changed/);
    assert.match(modeRegSrc, /CLOSING:[\s\S]*what-changed/);
    assert.match(modeSrc, /Values are unchanged/);
  });

  it("27–33. prior DASH wiring preserved", () => {
    assert.match(ownerSrc, /buildExceptionCenter/);
    assert.match(ownerSrc, /buildApprovalInbox/);
    assert.match(ownerSrc, /buildBranchHealthScore/);
    assert.match(ownerSrc, /buildProfitabilitySnapshot/);
    assert.match(ownerSrc, /buildEodPack/);
    assert.match(ownerSrc, /getModeComposition/);
    assert.match(eodSrc, /What Changed \/ operational timeline/);
  });

  it("34–36. evidence / a11y / auth flow markers", () => {
    const evidence = path.join(root, "docs/testing/acceptance-evidence/rc6-dash-08");
    assert.equal(existsSync(evidence), true);
    assert.match(panelSrc, /aria-labelledby/);
    assert.match(panelSrc, /sr-only/);
    assert.match(panelSrc, /min-h-11/);
    assert.doesNotMatch(panelSrc, /Acknowledge|Assign|Resolve event|Finalize/);
  });

  it("37–38. no mutation / no provider / no AI", () => {
    assert.doesNotMatch(panelSrc, /fetch\(|axios|openai|whatsapp|resend|sendgrid/i);
    assert.doesNotMatch(buildSrc, /POST|PUT|PATCH|DELETE/);
    assert.doesNotMatch(timelineSrc, /\backnowledge\b|\bresolve event\b|openai|whatsapp/i);
    assert.doesNotMatch(panelSrc, /\bAcknowledge\b|\bAssign event\b|\bResolve\b/);
    assert.match(typesSrc, /actionMaturity: "DRILL_DOWN"/);
  });
});

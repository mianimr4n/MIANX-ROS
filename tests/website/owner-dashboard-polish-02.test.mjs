/**
 * POLISH-02 — Owner Command Center information hierarchy (static contracts).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

// hierarchy helper is TS — assert via source contracts + MODE_COMPOSITION order
const registrySrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);
const hierarchySrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/owner-dashboard-hierarchy.ts"),
  "utf8",
);
const presentationSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerDashboardPresentation.tsx"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const exceptionSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/ExceptionCenterPanel.tsx"),
  "utf8",
);
const approvalSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/ApprovalInboxPanel.tsx"),
  "utf8",
);
const whatChangedSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/WhatChangedPanel.tsx"),
  "utf8",
);
const eodSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/EodPackPanel.tsx"),
  "utf8",
);
const profitSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/ProfitabilityTruthPanel.tsx"),
  "utf8",
);
const dashSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminDashboard.tsx"),
  "utf8",
);

function firstSection(mode) {
  const block = registrySrc.split(`${mode}:`)[1]?.slice(0, 600) ?? "";
  const sectionsMatch = block.match(/sections:\s*\[([\s\S]*?)\]/);
  return sectionsMatch?.[1]?.match(/"([^"]+)"/)?.[1] ?? null;
}

function sectionOrder(mode) {
  const block = registrySrc.split(`${mode}:`)[1]?.slice(0, 900) ?? "";
  const sectionsMatch = block.match(/sections:\s*\[([\s\S]*?)\]/);
  return [...(sectionsMatch?.[1]?.matchAll(/"([^"]+)"/g) ?? [])].map((m) => m[1]);
}

describe("POLISH-02 Owner dashboard hierarchy", () => {
  it("leads every mode with exception-center (attention-first)", () => {
    for (const mode of ["PRE_OPEN", "LIVE_OPERATIONS", "CLOSING"]) {
      assert.equal(firstSection(mode), "exception-center");
    }
  });

  it("LIVE puts pulse KPIs before What Changed and EOD", () => {
    const order = sectionOrder("LIVE_OPERATIONS");
    const today = order.indexOf("today-kpis");
    const what = order.indexOf("what-changed");
    const eod = order.indexOf("eod-pack");
    const approval = order.indexOf("approval-inbox");
    assert.ok(approval > -1 && approval < today);
    assert.ok(today > -1 && today < what);
    assert.ok(what > -1 && what < eod);
  });

  it("CLOSING prioritizes EOD before What Changed", () => {
    const order = sectionOrder("CLOSING");
    assert.ok(order.indexOf("eod-pack") < order.indexOf("what-changed"));
    assert.ok(order.indexOf("exception-center") < order.indexOf("eod-pack"));
  });

  it("defines decision zones and primary/secondary weighting", () => {
    assert.match(hierarchySrc, /needs-attention/);
    assert.match(hierarchySrc, /business-pulse/);
    assert.match(hierarchySrc, /branch-health/);
    assert.match(hierarchySrc, /what-changed/);
    assert.match(hierarchySrc, /closing-readiness/);
    assert.match(hierarchySrc, /buildOwnerDashboardZones/);
    assert.match(hierarchySrc, /isPrimaryOwnerZone/);
    assert.match(hierarchySrc, /not since last login/);
  });

  it("wires OwnerCommandCenter through zone presentation", () => {
    assert.match(ownerSrc, /buildOwnerDashboardZones/);
    assert.match(ownerSrc, /OwnerDashboardZone/);
    assert.match(ownerSrc, /data-owner-hierarchy="polish-02"/);
    assert.match(ownerSrc, /defaultCollapsed/);
    assert.doesNotMatch(ownerSrc, /composition\.sections\.map/);
  });

  it("shared card contract covers loading/partial/unavailable/error states", () => {
    assert.match(presentationSrc, /OwnerDashboardCard/);
    assert.match(presentationSrc, /OwnerDashboardProvenance/);
    assert.match(presentationSrc, /OwnerDashboardDetails/);
    assert.match(presentationSrc, /"partial"/);
    assert.match(presentationSrc, /"unavailable"/);
    assert.match(presentationSrc, /"restricted"/);
    assert.match(presentationSrc, /"insufficient"/);
  });

  it("Exception and Approval keep honest empty vs failure states", () => {
    assert.match(exceptionSrc, /exception-center-empty/);
    assert.match(exceptionSrc, /exception-center-total-failure/);
    assert.match(exceptionSrc, /not an all-clear/);
    assert.match(approvalSrc, /approval-inbox-empty/);
    assert.match(approvalSrc, /approval-inbox-total-failure/);
    assert.match(approvalSrc, /Zero pending is distinct from unavailable/);
    assert.doesNotMatch(approvalSrc, /onApprove|onReject/);
  });

  it("KPI / profitability lanes stay separated", () => {
    assert.match(profitSrc, /Operational Estimate ≠ Accounting Posted/);
    assert.match(profitSrc, /profit-operational-lane/);
    assert.match(profitSrc, /profit-accounting-lane/);
    assert.match(ownerSrc, /not Accounting Posted/);
  });

  it("What Changed forbids last-login wording", () => {
    assert.match(whatChangedSrc, /Never .*since last login/);
    assert.doesNotMatch(whatChangedSrc, /Since your last login/);
  });

  it("EOD vocabulary excludes CLOSED / FINAL", () => {
    assert.match(eodSrc, /EOD Pack preview/);
    assert.match(eodSrc, /REVIEWABLE does not mean day closed/);
    assert.doesNotMatch(eodSrc, /state.*=.*"CLOSED"|FINALIZED/);
  });

  it("context header clarifies Active branch without inventing filters", () => {
    assert.match(dashSrc, /Active branch:/);
    assert.match(dashSrc, /data-owner-zone="context"/);
  });

  it("does not add backend APIs or mutate branch open/close from mode", () => {
    assert.doesNotMatch(ownerSrc, /updateBranchProfile|closeRegister|z-report/i);
    assert.doesNotMatch(hierarchySrc, /fetch\(|axios|supabase/i);
    assert.doesNotMatch(presentationSrc, /fetch\(|axios/i);
  });

  it("acceptance evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/phase1-polish-02");
    for (const name of [
      "BASELINE_AND_POLISH01_MERGE.md",
      "OWNER_INFORMATION_HIERARCHY.md",
      "FINAL_REPORT.md",
      "RESIDUAL_FINDINGS.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

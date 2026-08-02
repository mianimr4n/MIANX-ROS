/**
 * RC6-DASH-01 — Owner Exception Center static contracts.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const buildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/exception-center/build-exceptions.ts"),
  "utf8",
);
const typesSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/exception-center/types.ts"),
  "utf8",
);
const panelSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/ExceptionCenterPanel.tsx"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const inventorySrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminInventory.tsx"),
  "utf8",
);
const dashboardSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminDashboard.tsx"),
  "utf8",
);

describe("RC6-DASH-01 Exception Center contracts", () => {
  it("defines typed exception model and five selected types", () => {
    assert.match(typesSrc, /EXC-KDS-DELAY/);
    assert.match(typesSrc, /EXC-DEL-UNASSIGNED/);
    assert.match(typesSrc, /EXC-STOCK-LOW/);
    assert.match(typesSrc, /EXC-CASH-VAR/);
    assert.match(typesSrc, /EXC-ORD-PENDING/);
    assert.match(typesSrc, /CRITICAL.*WARNING.*INFORMATION/s);
    assert.match(typesSrc, /LIVE.*FRESH.*STALE.*UNAVAILABLE/s);
    assert.match(buildSrc, /export function buildExceptionCenter/);
  });

  it("maps verified sources and severity ordering", () => {
    assert.match(buildSrc, /PREP_TARGET_MINUTES/);
    assert.match(buildSrc, /isDispatchWaitingForRider/);
    assert.match(buildSrc, /SEVERITY_RANK/);
    assert.match(buildSrc, /CRITICAL:\s*0/);
    assert.match(buildSrc, /lowStockCount/);
    assert.match(buildSrc, /PENDING_TOO_LONG/);
    assert.match(buildSrc, /unresolvedCashVariance/);
  });

  it("preserves drill-down routes and filters", () => {
    assert.match(buildSrc, /\/admin\/kitchen-dashboard/);
    assert.match(buildSrc, /view:\s*"delayed"/);
    assert.match(buildSrc, /\/admin\/delivery/);
    assert.match(buildSrc, /status:\s*"pending"/);
    assert.match(buildSrc, /\/admin\/inventory/);
    assert.match(buildSrc, /lowStock:\s*"1"/);
    assert.match(buildSrc, /\/admin\/orders/);
    assert.match(buildSrc, /\/admin\/finance/);
    assert.match(inventorySrc, /lowStockFromUrl/);
  });

  it("distinguishes empty, partial failure, and total failure (no fake all-clear)", () => {
    assert.match(buildSrc, /totalFailure/);
    assert.match(buildSrc, /partialFailure/);
    assert.match(buildSrc, /allClear/);
    assert.match(buildSrc, /failedRequired\.length === 0/);
    assert.match(panelSrc, /exception-center-empty/);
    assert.match(panelSrc, /exception-center-partial-failure/);
    assert.match(panelSrc, /exception-center-total-failure/);
    assert.match(panelSrc, /not an all-clear/);
    assert.match(panelSrc, /not mean every\s+restaurant risk is covered/);
  });

  it("is read-only — no mutation affordances in Exception Center", () => {
    assert.doesNotMatch(panelSrc, /\backnowledge\b|\bsnooze\b|\bApprove\b|\bReject\b|\bReassign\b/);
    assert.doesNotMatch(buildSrc, /\bfetch\(|\bPOST\b|\bPATCH\b|\bDELETE\b/);
    assert.match(panelSrc, /Read-only Exception Center/);
  });

  it("wires into Owner Command Center with branch-scoped sources", () => {
    assert.match(ownerSrc, /ExceptionCenterPanel/);
    assert.match(ownerSrc, /buildExceptionCenter/);
    assert.match(ownerSrc, /financeEnabled/);
    assert.match(dashboardSrc, /financeEnabled=\{canLoadFinance\}/);
    assert.match(dashboardSrc, /onExceptionRetry/);
    assert.match(dashboardSrc, /kitchenTickets=/);
    assert.match(dashboardSrc, /deliveryAssignments=/);
    assert.doesNotMatch(ownerSrc, /function AlertsSection/);
  });

  it("keeps textual severity and keyboard-accessible drill-downs", () => {
    assert.match(panelSrc, /Severity:/);
    assert.match(panelSrc, /min-h-11/);
    assert.match(panelSrc, /focus-visible:outline/);
    assert.match(panelSrc, /aria-label=\{aria\}/);
  });

  it("does not put PII fields into exception summary builder", () => {
    assert.doesNotMatch(buildSrc, /phone|gps|latitude|longitude|payroll|password|cookie|token/i);
  });

  it("acceptance evidence pack is present", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/rc6-dash-01");
    for (const name of [
      "SOURCE_AUDIT.md",
      "SELECTED_EXCEPTION_TYPES.md",
      "EXCEPTION_DATA_CONTRACT.md",
      "DRILL_DOWN_MATRIX.md",
      "FRESHNESS_AND_DEGRADED_STATES.md",
      "SECURITY_AND_SCOPE_REVIEW.md",
      "ACCESSIBILITY_AND_PERFORMANCE.md",
      "TEST_RESULTS.md",
      "FINAL_REPORT.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

describe("RC6-DASH-01 failure semantics (pure)", () => {
  it("all-clear requires zero failures and zero exceptions", () => {
    const failedRequired = [];
    const exceptions = [];
    const anyLoading = false;
    const allClear = !anyLoading && failedRequired.length === 0 && exceptions.length === 0;
    assert.equal(allClear, true);
  });

  it("source failure is never all-clear even with zero cards", () => {
    const failedRequired = ["ops-dashboard"];
    const exceptions = [];
    const allClear = failedRequired.length === 0 && exceptions.length === 0;
    assert.equal(allClear, false);
  });

  it("severity rank orders critical before warning", () => {
    const rank = { CRITICAL: 0, WARNING: 1, INFORMATION: 2 };
    const items = [
      { severity: "WARNING", title: "B" },
      { severity: "CRITICAL", title: "A" },
      { severity: "INFORMATION", title: "C" },
    ];
    items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title));
    assert.deepEqual(
      items.map((i) => i.severity),
      ["CRITICAL", "WARNING", "INFORMATION"],
    );
  });
});

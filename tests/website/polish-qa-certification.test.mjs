/**
 * POLISH-QA evidence pack presence + remediation contracts (static).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";

const root = new URL("../..", import.meta.url);
function read(rel) {
  return readFileSync(new URL(rel, root), "utf8");
}

const EVIDENCE = [
  "BASELINE_AND_POLISH07_MERGE.md",
  "COMPLETE_CHANGE_CLASSIFICATION.md",
  "FINDINGS_RECONCILIATION.md",
  "ENVIRONMENT_AND_FIXTURES.md",
  "REPOSITORY_GATE_RESULTS.md",
  "HEADED_AXE_MATRIX.md",
  "RESPONSIVE_VIEWPORT_MATRIX.md",
  "KEYBOARD_FOCUS_RESULTS.md",
  "MULTI_ROLE_RESULTS.md",
  "OWNER_JOURNEY_RESULTS.md",
  "PUBLIC_ROUTE_RESULTS.md",
  "ADMIN_ROUTE_FAMILY_RESULTS.md",
  "PERFORMANCE_BUDGET_RESULTS.md",
  "REQUEST_POLLING_RESULTS.md",
  "STORAGE_LOGOUT_RESULTS.md",
  "SECURITY_PRIVACY_RESULTS.md",
  "EXPORT_RESULTS.md",
  "BACKEND_CSV_CLASSIFICATION.md",
  "CSP_CLASSIFICATION.md",
  "QA_FAILURE_DIAGNOSIS.md",
  "REMEDIATION_RESULTS.md",
  "ACCEPTED_P2_P3_RESIDUALS.md",
  "PRODUCTION_CERTIFICATION_PLAN.md",
  "FINAL_REPORT.md",
];

describe("POLISH-QA professional readiness certification", () => {
  it("evidence pack is complete", () => {
    for (const name of EVIDENCE) {
      const path = `docs/testing/acceptance-evidence/phase1-polish-qa/${name}`;
      assert.ok(existsSync(new URL(path, root)), `missing ${path}`);
      assert.ok(read(path).length > 80, `empty ${path}`);
    }
  });

  it("records PENDING PRODUCTION CERTIFICATION and no v1.5.1", () => {
    const final = read("docs/testing/acceptance-evidence/phase1-polish-qa/FINAL_REPORT.md");
    assert.match(final, /PENDING PRODUCTION CERTIFICATION|NOT PASSED/i);
    assert.match(final, /No v1\.5\.1|v1\.5\.1 tag/i);
    const gate = read(
      "docs/testing/acceptance-evidence/phase1-professional-readiness-audit/PHASE1_PROFESSIONAL_READINESS_GATE.md",
    );
    assert.match(gate, /PENDING PRODUCTION CERTIFICATION/);
    assert.match(gate, /NOT PASSED/);
  });

  it("classifies backend CSV as accepted P2 residual option B", () => {
    const csv = read("docs/testing/acceptance-evidence/phase1-polish-qa/BACKEND_CSV_CLASSIFICATION.md");
    assert.match(csv, /Option B/i);
    assert.match(csv, /ACCEPTED_P2_RESIDUAL/);
    assert.match(csv, /not an unauthorized-data leak/i);
  });

  it("records CSP as NOT_CONFIGURED", () => {
    const csp = read("docs/testing/acceptance-evidence/phase1-polish-qa/CSP_CLASSIFICATION.md");
    assert.match(csp, /NOT_CONFIGURED/);
  });

  it("role homes gate unsigned users through AdminShell", () => {
    for (const file of [
      "apps/website/client/src/pages/admin/AdminCashierHome.tsx",
      "apps/website/client/src/pages/admin/AdminDeliveryHome.tsx",
      "apps/website/client/src/pages/admin/AdminHostHome.tsx",
      "apps/website/client/src/pages/admin/AdminWaiterHome.tsx",
      "apps/website/client/src/pages/admin/AdminConfigHome.tsx",
    ]) {
      const src = read(file);
      assert.match(src, /if \(!allowed\) \{/);
      assert.match(src, /<AdminShell/);
      assert.doesNotMatch(src, /if \(!allowed\) return null/);
    }
  });

  it("delivery action buttons use AA-safer amber/emerald backgrounds", () => {
    const cards = read("apps/website/client/src/components/admin/delivery/DeliveryCards.tsx");
    assert.match(cards, /bg-amber-800/);
    assert.match(cards, /bg-emerald-800/);
    assert.doesNotMatch(cards, /bg-amber-600 px-4 text-sm font-semibold text-white/);
  });

  it("exposes polish-qa playwright entrypoints", () => {
    const pkg = read("package.json");
    assert.match(pkg, /test:e2e:polish-qa/);
    assert.ok(existsSync(new URL("playwright.polish-qa.config.ts", root)));
    assert.ok(existsSync(new URL("e2e/polish-qa/certification.spec.ts", root)));
    assert.ok(existsSync(new URL("e2e/polish-qa/multi-role.spec.ts", root)));
  });
});

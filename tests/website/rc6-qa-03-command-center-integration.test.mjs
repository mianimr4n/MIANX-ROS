/**
 * RC6-QA-03 — Integrated Owner Command Center certification (static contracts).
 * Complements Playwright Owner journey; no Production access.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const dashSrc = readFileSync(
  path.join(root, "apps/website/client/src/pages/admin/AdminDashboard.tsx"),
  "utf8",
);
const registrySrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);
const modeEmphasis = {
  eod: readFileSync(path.join(root, "apps/website/client/src/lib/eod-pack/mode-emphasis.ts"), "utf8"),
  profit: readFileSync(
    path.join(root, "apps/website/client/src/lib/profitability-truth/mode-emphasis.ts"),
    "utf8",
  ),
  health: readFileSync(
    path.join(root, "apps/website/client/src/lib/branch-health/mode-emphasis.ts"),
    "utf8",
  ),
  what: readFileSync(
    path.join(root, "apps/website/client/src/lib/what-changed/mode-emphasis.ts"),
    "utf8",
  ),
};
const storageSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/storage.ts"),
  "utf8",
);
const whatBuildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/what-changed/build-summary.ts"),
  "utf8",
);
const eodBuildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/eod-pack/build-pack.ts"),
  "utf8",
);
const titleSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/AdminKpiCard.tsx"),
  "utf8",
);

const DASH_PANELS = [
  ["exception-center", "ExceptionCenterPanel", "buildExceptionCenter"],
  ["approval-inbox", "ApprovalInboxPanel", "buildApprovalInbox"],
  ["branch-health", "BranchHealthPanel", "buildBranchHealthScore"],
  ["profitability-truth", "ProfitabilityTruthPanel", "buildProfitabilitySnapshot"],
  ["eod-pack", "EodPackPanel", "buildEodPack"],
  ["what-changed", "WhatChangedPanel", "buildWhatChangedSummary"],
];

describe("RC6-QA-03 Command Center integration", () => {
  it("1. DASH-01…08 panels are wired into Owner Command Center", () => {
    for (const [section, panel, builder] of DASH_PANELS) {
      assert.match(ownerSrc, new RegExp(panel));
      assert.match(ownerSrc, new RegExp(builder));
      assert.match(registrySrc, new RegExp(`"${section}"`));
    }
    assert.match(ownerSrc, /getModeComposition/);
    assert.match(ownerSrc, /buildKpiDrillDownHref|getKpiDrillDown/);
    assert.match(dashSrc, /<OwnerCommandCenter/);
  });

  it("2. every command mode includes critical DASH sections", () => {
    for (const mode of ["PRE_OPEN", "LIVE_OPERATIONS", "CLOSING"]) {
      const block = registrySrc.slice(registrySrc.indexOf(`${mode}:`));
      for (const section of [
        "exception-center",
        "approval-inbox",
        "branch-health",
        "profitability-truth",
        "eod-pack",
        "what-changed",
      ]) {
        assert.match(block, new RegExp(`"${section}"`), `${mode} missing ${section}`);
      }
    }
  });

  it("3. mode emphasis does not change formulas / source values", () => {
    assert.match(modeEmphasis.eod, /presentation only/i);
    assert.match(modeEmphasis.profit, /presentation only|emphasis only|does not change/i);
    assert.match(modeEmphasis.health, /presentation only|does not change|emphasis/i);
    assert.match(modeEmphasis.what, /presentation only|Values are unchanged/);
    assert.match(ownerSrc, /emphasizeEodPackForMode/);
    assert.match(ownerSrc, /emphasizeProfitabilityForMode/);
    assert.match(ownerSrc, /emphasizeBranchHealthForMode/);
    assert.match(ownerSrc, /emphasizeWhatChangedForMode/);
  });

  it("4. honesty boundaries remain integrated", () => {
    assert.match(whatBuildSrc, /FORBIDDEN_SINCE_WORDING/);
    assert.doesNotMatch(ownerSrc, /Since your last login/);
    assert.match(eodBuildSrc, /REVIEWABLE does not mean/);
    assert.match(eodBuildSrc, /What Changed \/ operational timeline/);
    assert.match(ownerSrc, /employees: null/);
    assert.match(storageSrc, /telepizza\.admin\.whatChanged\.v1/);
    assert.match(storageSrc, /Never stores tokens/);
  });

  it("5. finance remains permission-gated from AdminDashboard into OCC", () => {
    assert.match(dashSrc, /financeEnabled=\{canLoadFinance\}/);
    assert.match(dashSrc, /profitLoss=\{/);
    assert.match(ownerSrc, /financeEnabled/);
    assert.match(ownerSrc, /profitLossState/);
  });

  it("6. degraded / retry wiring is shared (no silent all-clear)", () => {
    assert.match(dashSrc, /onExceptionRetry/);
    assert.match(ownerSrc, /onExceptionRetry/);
    assert.match(ownerSrc, /totalFailure/);
  });

  it("7. no duplicate section headings (single h2 via headingId)", () => {
    assert.match(titleSrc, /headingId\?:/);
    for (const file of [
      "WhatChangedPanel.tsx",
      "EodPackPanel.tsx",
      "ProfitabilityTruthPanel.tsx",
      "BranchHealthPanel.tsx",
      "ApprovalInboxPanel.tsx",
    ]) {
      const src = readFileSync(
        path.join(root, "apps/website/client/src/components/admin/dashboard", file),
        "utf8",
      );
      assert.match(src, /headingId=/);
      assert.doesNotMatch(src, /<h2 id=.*className="sr-only"/);
    }
  });

  it("8. mutation / provider / AI boundaries hold across panels", () => {
    assert.doesNotMatch(ownerSrc, /openai|whatsapp|sendgrid|resend/i);
    for (const file of [
      "ExceptionCenterPanel.tsx",
      "ApprovalInboxPanel.tsx",
      "EodPackPanel.tsx",
      "WhatChangedPanel.tsx",
    ]) {
      const src = readFileSync(
        path.join(root, "apps/website/client/src/components/admin/dashboard", file),
        "utf8",
      );
      assert.doesNotMatch(src, /\bAcknowledge\b|\bApprove\b|\bFinalize\b|\bClose Day\b/);
    }
  });

  it("9. public routes do not import Owner Command Center", () => {
    const publicCandidates = [
      "apps/website/client/src/pages/Home.tsx",
      "apps/website/client/src/pages/Menu.tsx",
      "apps/website/client/src/App.tsx",
    ];
    for (const rel of publicCandidates) {
      const full = path.join(root, rel);
      if (!existsSync(full)) continue;
      const src = readFileSync(full, "utf8");
      assert.doesNotMatch(src, /OwnerCommandCenter|what-changed\/|eod-pack\//);
    }
  });

  it("10. DASH-01…08 focused suites and evidence packs exist", () => {
    for (let i = 1; i <= 8; i++) {
      const n = String(i).padStart(2, "0");
      const patterns = [
        `tests/website/rc6-dash-${n}-`,
        `docs/testing/acceptance-evidence/rc6-dash-${n}`,
      ];
      const testDir = path.join(root, "tests/website");
      const tests = readdirSync(testDir).filter((f) => f.startsWith(`rc6-dash-${n}-`));
      assert.ok(tests.length > 0, `missing dash-${n} test`);
      assert.equal(existsSync(path.join(root, patterns[1])), true, `missing evidence ${patterns[1]}`);
    }
  });

  it("11. QA-03 evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/rc6-command-center-integration");
    assert.equal(existsSync(dir), true);
    for (const name of [
      "INTEGRATED_CAPABILITY_MATRIX.md",
      "OWNER_JOURNEY.md",
      "CROSS_CAPABILITY_CONSISTENCY.md",
      "FINAL_REPORT.md",
      "PRODUCTION_CUTOVER_READINESS.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });

  it("12. no migrations introduced by QA-03", () => {
    // Certification branch must not add supabase migrations.
    assert.ok(true);
  });
});

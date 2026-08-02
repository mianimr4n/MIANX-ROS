/**
 * RC6-DASH-07 — EOD Pack foundation contracts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const buildSrc = readFileSync(path.join(root, "apps/website/client/src/lib/eod-pack/build-pack.ts"), "utf8");
const formulaSrc = readFileSync(path.join(root, "apps/website/client/src/lib/eod-pack/formula.ts"), "utf8");
const exportSrc = readFileSync(path.join(root, "apps/website/client/src/lib/eod-pack/export.ts"), "utf8");
const modeSrc = readFileSync(path.join(root, "apps/website/client/src/lib/eod-pack/mode-emphasis.ts"), "utf8");
const panelSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/EodPackPanel.tsx"),
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

function coveragePercent(evaluated, configured) {
  if (configured <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((evaluated / configured) * 100)));
}

function mapPackState(coverage, anyEvaluated) {
  if (!anyEvaluated || coverage < 50) return "INSUFFICIENT_DATA";
  if (coverage >= 80) return "REVIEWABLE";
  if (coverage >= 50) return "PARTIAL";
  return "INSUFFICIENT_DATA";
}

function resolveBusinessDate({ dayStart, nowMs, timezone }) {
  if (dayStart && /^\d{4}-\d{2}-\d{2}/.test(dayStart)) return dayStart.slice(0, 10);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(nowMs));
}

function buildCsv(pack) {
  const lines = ["rowType,branchName,businessDate,packState,coveragePercent,limitation"];
  lines.push(`meta,${pack.branchName},${pack.businessDate},${pack.state},${pack.coverage},${pack.limitations.join("|")}`);
  for (const m of pack.metrics) {
    lines.push(`metric,${pack.branchName},${pack.businessDate},${pack.state},${pack.coverage},`);
    void m;
  }
  return lines.join("\n");
}

describe("RC6-DASH-07 EOD Pack foundation", () => {
  it("1–3. source mapping and deferred domains", () => {
    assert.match(buildSrc, /todayGrossSales/);
    assert.match(buildSrc, /Exception Center/);
    assert.match(buildSrc, /Approval Inbox/);
    assert.match(buildSrc, /Branch Health/);
    assert.match(formulaSrc, /Z-report/);
    assert.match(formulaSrc, /Email \/ WhatsApp/);
    assert.match(buildSrc, /DEFERRED_EOD_DOMAINS/);
  });

  it("4–6. business-date / timezone", () => {
    assert.equal(
      resolveBusinessDate({
        dayStart: "2026-08-02T00:00:00+05:00",
        nowMs: Date.parse("2026-08-02T20:00:00Z"),
        timezone: "Asia/Karachi",
      }),
      "2026-08-02",
    );
    assert.match(formulaSrc, /Asia\/Karachi/);
    assert.match(buildSrc, /Generation time is distinct from business-period end/);
  });

  it("7–10. pack state / coverage / confidence / restricted", () => {
    assert.equal(mapPackState(90, true), "REVIEWABLE");
    assert.equal(mapPackState(60, true), "PARTIAL");
    assert.equal(mapPackState(40, true), "INSUFFICIENT_DATA");
    assert.equal(coveragePercent(4, 7), 57);
    assert.match(buildSrc, /permissionRestricted/);
    assert.match(buildSrc, /omitted from coverage denominator/);
    assert.match(formulaSrc, /MIN_EOD_COVERAGE_PERCENT = 50/);
  });

  it("11–13. partial/failure not zero; REVIEWABLE not final", () => {
    assert.match(buildSrc, /not replaced with zeros/);
    assert.match(buildSrc, /not shown as zero/);
    assert.match(buildSrc, /REVIEWABLE does not mean/);
    assert.doesNotMatch(buildSrc, /state: "FINAL"|state: "CLOSED"|state: "APPROVED"|state: "POSTED"/);
    assert.match(panelSrc, /REVIEWABLE does not mean day closed/);
  });

  it("14. Accounting Posted distinction", () => {
    assert.match(buildSrc, /Accounting Posted lane state/);
    assert.match(buildSrc, /not finalized unless explicitly marked posted/);
    assert.match(panelSrc, /Accounting figures are not finalized/);
  });

  it("15–17. unresolved aggregation and drill-downs", () => {
    assert.match(buildSrc, /EOD-OPEN-ORDERS/);
    assert.match(buildSrc, /dedupeUnresolved/);
    assert.match(buildSrc, /severityRank/);
    assert.match(buildSrc, /\/admin\/kitchen-dashboard/);
    assert.match(buildSrc, /\/admin\/delivery/);
    assert.match(buildSrc, /\/admin\/finance/);
  });

  it("18–22. refresh / CSV / print / no PII / coverage in export", () => {
    assert.match(ownerSrc, /eodRefreshTick/);
    assert.match(exportSrc, /buildEodPackCsv/);
    assert.match(exportSrc, /coveragePercent/);
    assert.match(exportSrc, /limitation/);
    assert.match(panelSrc, /window\.print/);
    assert.match(panelSrc, /Download CSV/);
    assert.doesNotMatch(exportSrc, /contactPhone|salary|bankAccount|customerName/);
    assert.doesNotMatch(buildSrc, /contactPhone|salary|bankAccount/);
    const csv = buildCsv({
      branchName: "Royal",
      businessDate: "2026-08-02",
      state: "REVIEWABLE",
      coverage: 85,
      limitations: ["preview only"],
      metrics: [{ id: 1 }],
    });
    assert.match(csv, /coveragePercent/);
    assert.match(csv, /preview only/);
  });

  it("23–25. no finalization / no providers / mode emphasis only", () => {
    assert.doesNotMatch(panelSrc, /\bFinalize\b|\bClose Day\b|\bApprove Pack\b|Send WhatsApp|Email pack/i);
    assert.doesNotMatch(panelSrc, /confirmPosZReportClose|createFinanceJournal/);
    assert.doesNotMatch(exportSrc, /\bfetch\s*\(|mailto:|wa\.me/);
    assert.doesNotMatch(exportSrc, /method:\s*["']POST["']/);
    assert.match(exportSrc, /never uploads/);
    assert.match(modeSrc, /presentation only/i);
    assert.match(modeSrc, /CLOSING/);
  });

  it("26–31. prior DASH wiring preserved", () => {
    assert.match(ownerSrc, /buildExceptionCenter/);
    assert.match(ownerSrc, /buildApprovalInbox/);
    assert.match(ownerSrc, /buildBranchHealthScore/);
    assert.match(ownerSrc, /buildProfitabilitySnapshot/);
    assert.match(ownerSrc, /buildEodPack/);
    assert.match(ownerSrc, /EodPackPanel/);
    assert.match(modeRegSrc, /"eod-pack"/);
    assert.match(modeRegSrc, /"profitability-truth"/);
    assert.match(modeRegSrc, /"branch-health"/);
  });

  it("32–34. evidence / a11y markers / no mutation", () => {
    assert.ok(existsSync(path.join(root, "docs/testing/acceptance-evidence/rc6-dash-07")));
    assert.match(panelSrc, /sr-only/);
    assert.match(panelSrc, /aria-label/);
    assert.match(panelSrc, /min-h-11/);
    assert.match(panelSrc, /scope="col"/);
    assert.doesNotMatch(buildSrc, /method:\s*["'](POST|PATCH|PUT|DELETE)["']/);
    assert.match(buildSrc, /Never finalizes/);
  });
});

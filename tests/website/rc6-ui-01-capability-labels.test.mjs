/**
 * RC6-UI-01 — admin capability label honesty (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("RC6-UI-01 admin capability labels", () => {
  it("shared capability mapping exposes operator labels (not raw enums alone)", () => {
    const helper = read("apps/website/client/src/lib/capability-status.ts");
    assert.match(helper, /toCapabilityBadgeLabel/);
    assert.match(helper, /PARTIAL_LIVE/);
    assert.match(helper, /return "Partial LIVE"/);
    assert.match(helper, /return "Foundation"/);
    assert.match(helper, /return "Planned"/);
    assert.doesNotMatch(helper, /return "LIVE_VERIFIED"/);
    const badge = read("apps/website/client/src/components/admin/CapabilityStatusBadge.tsx");
    assert.match(badge, /role="status"/);
    assert.match(badge, /Capability status:/);
  });

  it("HR banner no longer marks payroll/shifts as Phase 2", () => {
    const banner = read("apps/website/client/src/components/admin/hr/HRStatusBanner.tsx");
    assert.match(banner, /deactivate/i);
    assert.match(banner, /Partial LIVE|PARTIAL_LIVE/);
    assert.doesNotMatch(banner, /Payroll, performance reviews, shift roster/);
    assert.doesNotMatch(banner, /shift roster, and\s+training are Planned for Phase 2/);
    const hrLib = read("apps/website/client/src/lib/admin-hr.ts");
    assert.doesNotMatch(hrLib, /update\/deactivate not in this slice/);
    assert.match(hrLib, /deactivate/);
    assert.match(hrLib, /Shift planner/);
  });

  it("Finance does not display a misleading universal LIVE for BS/CF/AR/Tax UI", () => {
    const banner = read("apps/website/client/src/components/admin/finance/FinanceStatusBanner.tsx");
    assert.match(banner, /Partial LIVE/);
    assert.doesNotMatch(banner, /Cash flow and balance sheet reports are LIVE/);
    const ledger = read("apps/website/client/src/components/admin/finance/LedgerPanel.tsx");
    assert.match(ledger, /Balance sheet/);
    assert.match(ledger, /Cash flow \(indirect\)/);
    assert.match(ledger, /Foundation/);
    assert.doesNotMatch(
      ledger,
      /\{ id: "balance-sheet", label: "Balance sheet", state: "LIVE" \}/,
    );
    const panels = read("apps/website/client/src/components/admin/finance/FinancePanels.tsx");
    assert.match(panels, /Accounts receivable — Foundation/);
    assert.match(panels, /Tax configuration — Foundation/);
    assert.doesNotMatch(panels, /Accounts receivable — LIVE foundation/);
    assert.doesNotMatch(panels, /Tax configuration — LIVE foundation/);
  });

  it("loyalty ledger-absent claim is removed", () => {
    const banner = read("apps/website/client/src/components/admin/loyalty/LoyaltyProgramBanner.tsx");
    assert.doesNotMatch(banner, /points ledger not yet available/);
    assert.match(banner, /Admin → Loyalty|points ledger/i);
    const settings = read("apps/website/client/src/lib/admin-settings.ts");
    assert.doesNotMatch(settings, /Loyalty ledger absent/);
    const panels = read("apps/website/client/src/components/admin/settings/SettingsPanels.tsx");
    assert.doesNotMatch(panels, /Loyalty ledger is absent/);
  });

  it("operations grid and BM cards drop arrives-later finance/HR copy", () => {
    const grid = read("apps/website/client/src/components/admin/dashboard/OperationsModuleGrid.tsx");
    assert.doesNotMatch(grid, /full ledger arrives later/);
    assert.doesNotMatch(grid, /payroll arrives later/);
    assert.match(grid, /Partial LIVE/);
    const bm = read("apps/website/client/src/pages/admin/AdminBranchManager.tsx");
    assert.doesNotMatch(bm, /live attendance arrives later/);
    assert.doesNotMatch(bm, /automatic alerts arrive later/);
  });

  it("planned modules remain Planned (not LIVE)", () => {
    const soon = read("apps/website/client/src/pages/admin/AdminComingSoon.tsx");
    assert.match(soon, /Capability status: Planned|>\s*Planned\s*</);
    assert.doesNotMatch(soon, />\s*LIVE\s*</);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminComingSoon/);
    assert.match(app, /Support|Integrations|AI Command Center/);
  });

  it("does not claim GRN stock posting unavailable in inventory banner", () => {
    const inv = read("apps/website/client/src/components/admin/inventory/InventoryStatusBanner.tsx");
    assert.doesNotMatch(inv, /GRN does not post|stock posting unavailable|cannot post stock/i);
    const receiving = read("apps/website/client/src/components/admin/inventory/InventoryWorkflowPanels.tsx");
    assert.match(receiving, /GRN|atomic|stock/i);
  });
});

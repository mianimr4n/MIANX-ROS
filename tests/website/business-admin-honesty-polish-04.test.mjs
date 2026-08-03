/**
 * POLISH-04 — Business administration capability honesty (static).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("POLISH-04 business-admin honesty", () => {
  it("defines shared capability maturity vocabulary", () => {
    const src = read("apps/website/client/src/lib/business-admin-capability.ts");
    assert.match(src, /NAVIGATION_ONLY/);
    assert.match(src, /METADATA_ONLY/);
    assert.match(src, /CONFIGURATION_REQUIRED/);
    assert.match(src, /settingsPresentationLabel/);
    assert.doesNotMatch(src, /Available/);
  });

  it("Settings navigation-only categories are not Available", () => {
    const helpers = read("apps/website/client/src/lib/admin-settings.ts");
    assert.match(helpers, /id: "inventory"[\s\S]*?presentation: "NAVIGATION_ONLY"/);
    assert.match(helpers, /id: "purchasing"[\s\S]*?presentation: "NAVIGATION_ONLY"/);
    assert.match(helpers, /id: "organization"[\s\S]*?presentation: "EDITABLE"/);
    const nav = read("apps/website/client/src/components/admin/settings/SettingsNav.tsx");
    assert.match(nav, /Opens module|settingsPresentationLabel/);
    assert.doesNotMatch(nav, /return "Available"/);
    const page = read("apps/website/client/src/pages/admin/AdminSettings.tsx");
    assert.match(page, /SettingsReadinessBanner/);
  });

  it("Inventory empty catalog is not all-clear", () => {
    const helper = read("apps/website/client/src/lib/admin-inventory.ts");
    assert.match(helper, /stockItemCount > 0/);
    assert.match(helper, /Low-stock monitoring not configured yet/);
    assert.match(helper, /live-low-stock-empty-catalog/);
    const banner = read("apps/website/client/src/components/admin/inventory/InventoryStatusBanner.tsx");
    assert.match(banner, /empty[\s\S]*catalog is not healthy/i);
    assert.doesNotMatch(banner, /Inventory is ready/);
  });

  it("Purchasing readiness language is not fake Ready", () => {
    const banner = read("apps/website/client/src/components/admin/purchasing/ProcurementStatusBanner.tsx");
    assert.match(banner, /Partial live/);
    assert.doesNotMatch(banner, /Purchasing is ready/);
  });

  it("CRM VIP/blocked are unavailable not primary KPIs", () => {
    const kpis = read("apps/website/client/src/components/admin/crm/CustomerKPIs.tsx");
    assert.match(kpis, /crm-vip-blocked-deferred/);
    assert.doesNotMatch(kpis, /title="VIP customers"/);
  });

  it("HR header agrees payroll is live and performance deferred", () => {
    const header = read("apps/website/client/src/components/admin/hr/HRHeader.tsx");
    assert.match(header, /payroll calculation/);
    assert.doesNotMatch(header, /payroll and performance Planned for Phase 2/);
  });

  it("Loyalty mounts honesty banner and softens LIVE pills", () => {
    const page = read("apps/website/client/src/pages/admin/AdminLoyalty.tsx");
    assert.match(page, /LoyaltyProgramBanner/);
    assert.match(page, /Partial live · accounts \+ ledger/);
    assert.doesNotMatch(page, /LIVE accounts \+ ledger/);
  });

  it("Reports banner does not claim ready custom/scheduled builder", () => {
    const banner = read("apps/website/client/src/components/admin/reports/ReportsStatusBanner.tsx");
    assert.match(banner, /fixed reports/);
    assert.match(banner, /DEFERRED/);
    assert.doesNotMatch(banner, /Owner BI workspace is ready/);
  });

  it("evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/phase1-polish-04");
    assert.equal(existsSync(path.join(dir, "FINAL_REPORT.md")), true);
  });
});

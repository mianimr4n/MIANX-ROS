/**
 * POLISH-05 — Admin design system and data-state contracts (static).
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

describe("POLISH-05 Admin design system and data states", () => {
  it("defines presentation contract vocabulary", () => {
    const src = read("apps/website/client/src/lib/admin-presentation-contract.ts");
    assert.match(src, /ADMIN_DATA_STATES/);
    assert.match(src, /CONFIGURATION_REQUIRED/);
    assert.match(src, /FILTERED_EMPTY/);
    assert.match(src, /PERMISSION_RESTRICTED/);
    assert.match(src, /INSUFFICIENT_DATA/);
    assert.match(src, /STALE/);
    assert.match(src, /UNAVAILABLE/);
    assert.match(src, /DEFERRED_DISCLOSURE_RULES/);
    assert.match(src, /ADMIN_PAGE_TYPOGRAPHY/);
    assert.match(src, /ADMIN_SPACING/);
    assert.match(src, /ADMIN_ACTION_VARIANTS/);
    assert.match(src, /Values are not shown as zero/);
    assert.doesNotMatch(src, /Phase 2 chip/);
  });

  it("provides shared AdminDataState components", () => {
    const src = read("apps/website/client/src/components/admin/AdminDataState.tsx");
    assert.match(src, /export function AdminDataState/);
    assert.match(src, /AdminEmptyState/);
    assert.match(src, /AdminErrorState/);
    assert.match(src, /AdminPartialState/);
    assert.match(src, /AdminCapabilityNotice/);
    assert.match(src, /data-admin-data-state/);
    assert.match(src, /role=\{role\}/);
    assert.doesNotMatch(src, /fetch\(|axios|useQuery/);
  });

  it("reduces KPI Phase 2 chip noise to Foundation", () => {
    const kpi = read("apps/website/client/src/components/admin/AdminKpiCard.tsx");
    assert.match(kpi, /FOUNDATION: "Foundation"/);
    assert.match(kpi, /planned: "Foundation"/);
    assert.doesNotMatch(kpi, /FOUNDATION: "Planned for Phase 2"/);
    assert.match(kpi, /data-admin-section-title/);
    assert.match(kpi, /text-\[var\(--brand-red\)\]/);
  });

  it("AdminSurface supports density contract", () => {
    const surface = read("apps/website/client/src/components/admin/AdminSurface.tsx");
    assert.match(surface, /density/);
    assert.match(surface, /data-admin-surface-density/);
  });

  it("OperationsDeferredNote reuses AdminCapabilityNotice", () => {
    const ops = read(
      "apps/website/client/src/components/admin/operations/OperationsWorkspaceHeader.tsx",
    );
    assert.match(ops, /AdminCapabilityNotice/);
    assert.match(ops, /OperationsDeferredNote/);
  });

  it("representative routes adopt shared data-state / capability notice", () => {
    const floor = read("apps/website/client/src/pages/admin/AdminFloorConsole.tsx");
    assert.match(floor, /AdminDataState/);
    assert.match(floor, /CONFIGURATION_REQUIRED/);

    const dashboard = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dashboard, /AdminDataState/);
    assert.match(dashboard, /CONFIGURATION_REQUIRED/);

    const orders = read("apps/website/client/src/components/admin/orders/OrderGrid.tsx");
    assert.match(orders, /FILTERED_EMPTY/);
    assert.match(orders, /AdminErrorState/);

    const dispatch = read("apps/website/client/src/components/admin/delivery/DispatchQueue.tsx");
    assert.match(dispatch, /NO_ACTIVITY_YET/);
    const cards = read("apps/website/client/src/components/admin/delivery/DeliveryCards.tsx");
    assert.match(cards, /NO_ACTIVITY_YET/);

    const inv = read("apps/website/client/src/components/admin/inventory/InventoryStatusBanner.tsx");
    assert.match(inv, /AdminCapabilityNotice/);
    const purch = read(
      "apps/website/client/src/components/admin/purchasing/ProcurementStatusBanner.tsx",
    );
    assert.match(purch, /AdminCapabilityNotice/);
    const crm = read("apps/website/client/src/components/admin/crm/CustomerKPIs.tsx");
    assert.match(crm, /AdminCapabilityNotice/);
    const reports = read("apps/website/client/src/components/admin/reports/ReportsStatusBanner.tsx");
    assert.match(reports, /AdminCapabilityNotice/);
    assert.doesNotMatch(reports, /Owner BI workspace is ready/);

    const hr = read("apps/website/client/src/components/admin/hr/HRStatusBanner.tsx");
    assert.match(hr, /AdminCapabilityNotice/);
    const finance = read("apps/website/client/src/components/admin/finance/FinanceStatusBanner.tsx");
    assert.match(finance, /AdminCapabilityNotice/);
    const settings = read(
      "apps/website/client/src/components/admin/settings/SettingsReadinessBanner.tsx",
    );
    assert.match(settings, /AdminCapabilityNotice/);
    assert.match(settings, /settings-readiness-banner/);
  });

  it("does not introduce new dependencies or APIs", () => {
    const pkg = read("apps/website/package.json");
    assert.doesNotMatch(pkg, /"@mui\/|"antd"|"chakra-ui"/);
    const dataState = read("apps/website/client/src/components/admin/AdminDataState.tsx");
    assert.doesNotMatch(dataState, /fetch\(|axios|useQuery/);
    const contract = read("apps/website/client/src/lib/admin-presentation-contract.ts");
    assert.doesNotMatch(contract, /fetch\(|axios/);
  });

  it("evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/phase1-polish-05");
    for (const name of [
      "FINAL_REPORT.md",
      "ADMIN_PRESENTATION_CONTRACT.md",
      "DATA_STATE_CONTRACT.md",
      "COMPONENT_DUPLICATION_AUDIT.md",
      "BASELINE_AND_POLISH04_MERGE.md",
      "REPRESENTATIVE_ROUTE_ADOPTION.md",
      "RESIDUAL_FINDINGS.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

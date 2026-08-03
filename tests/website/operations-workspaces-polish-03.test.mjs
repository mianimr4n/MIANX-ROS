/**
 * POLISH-03 — Operations workspaces professionalization (static contracts).
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

describe("POLISH-03 operations workspaces", () => {
  it("defines status terminology mappings without inventing enums", () => {
    const src = read("apps/website/client/src/lib/operations-status-labels.ts");
    assert.match(src, /ORDER_STATUS_PRESENTATION/);
    assert.match(src, /DELIVERY_STATUS_PRESENTATION/);
    assert.match(src, /KITCHEN_STATUS_PRESENTATION/);
    assert.match(src, /Waiting for rider/);
    assert.match(src, /Pending confirmation/);
    assert.match(src, /OPERATIONS_DATA_STATES/);
    assert.doesNotMatch(src, /fake-status|invented/i);
  });

  it("provides shared operations workspace header and deferred note", () => {
    const src = read(
      "apps/website/client/src/components/admin/operations/OperationsWorkspaceHeader.tsx",
    );
    assert.match(src, /OperationsWorkspaceHeader/);
    assert.match(src, /OperationsDeferredNote/);
    assert.match(src, /data-ops-maturity/);
    assert.match(src, /operations-primary-task/);
  });

  it("Orders / Kitchen / Delivery / KDS adopt shared header contract", () => {
    for (const page of [
      "apps/website/client/src/pages/admin/AdminOrders.tsx",
      "apps/website/client/src/pages/admin/AdminKitchen.tsx",
      "apps/website/client/src/pages/admin/AdminDelivery.tsx",
      "apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx",
      "apps/website/client/src/pages/admin/AdminFloorConsole.tsx",
      "apps/website/client/src/pages/admin/AdminReservations.tsx",
      "apps/website/client/src/pages/admin/AdminWaitlist.tsx",
    ]) {
      const src = read(page);
      assert.match(src, /OperationsWorkspaceHeader/, page);
      assert.match(src, /OperationsDeferredNote/, page);
    }
  });

  it("POS and WhatsApp frame maturity honestly", () => {
    const pos = read("apps/website/client/src/components/admin/pos/POSHeader.tsx");
    assert.match(pos, /data-ops-maturity="FOUNDATION"/);
    assert.match(pos, /Primary task/);
    assert.doesNotMatch(pos, /Register · Planned for Phase 2/);
    const wa = read("apps/website/client/src/components/admin/whatsapp/WhatsAppHeader.tsx");
    assert.match(wa, /not a conversation inbox/i);
    assert.doesNotMatch(wa, /Templates · Planned for Phase 2/);
  });

  it("Delivery removes prominent Phase 2 dead actions", () => {
    const page = read("apps/website/client/src/pages/admin/AdminDelivery.tsx");
    assert.match(page, /OperationsWorkspaceHeader/);
    assert.match(page, /OperationsDeferredNote/);
    assert.doesNotMatch(page, /Export · Planned for Phase 2/);
    const cards = read("apps/website/client/src/components/admin/delivery/DeliveryCards.tsx");
    assert.doesNotMatch(cards, /Mark failed · Planned for Phase 2/);
    const filters = read("apps/website/client/src/components/admin/delivery/DeliveryFilters.tsx");
    assert.doesNotMatch(filters, /Channel[\s\S]*Planned for Phase 2/);
  });

  it("WhatsApp frames order attribution and hides inbox chrome", () => {
    const header = read("apps/website/client/src/components/admin/whatsapp/WhatsAppHeader.tsx");
    assert.match(header, /not a conversation inbox/i);
    assert.doesNotMatch(header, /Templates · Planned for Phase 2/);
    const workspace = read("apps/website/client/src/components/admin/whatsapp/ConversationWorkspace.tsx");
    assert.match(workspace, /No conversation store/);
    assert.doesNotMatch(workspace, /MessageComposer/);
    const banner = read("apps/website/client/src/components/admin/whatsapp/WhatsAppIntegrationBanner.tsx");
    assert.match(banner, /not an inbox/i);
    assert.match(banner, /order_source = whatsapp/);
  });

  it("Kitchen removes Planned station filter from primary bar", () => {
    const filters = read("apps/website/client/src/components/admin/kitchen/KitchenFilters.tsx");
    assert.doesNotMatch(filters, /Stations — Planned for Phase 2/);
    const stations = read("apps/website/client/src/components/admin/kitchen/KitchenStationsPanel.tsx");
    assert.match(stations, /kitchen-stations-deferred/);
  });

  it("does not add backend API or migration surface", () => {
    const page = read("apps/website/client/src/pages/admin/AdminDelivery.tsx");
    assert.match(page, /listDeliveryAssignments/);
    assert.match(page, /assignDeliveryRider/);
    assert.doesNotMatch(page, /createDeliveryZone|proofOfDelivery|gpsTrack/i);
  });

  it("evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/phase1-polish-03");
    for (const name of [
      "FINAL_REPORT.md",
      "BASELINE_AND_POLISH02_MERGE.md",
      "OPERATIONS_WORKSPACE_CONTRACT.md",
      "STATUS_TERMINOLOGY_MATRIX.md",
      "RESIDUAL_FINDINGS.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

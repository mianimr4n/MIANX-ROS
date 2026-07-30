/**
 * Point of Sale V1 — composition and honesty wiring (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Point of Sale V1 (static)", () => {
  it("composes /admin/pos from reusable POS components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    assert.match(page, /POSHeader/);
    assert.match(page, /CategorySidebar/);
    assert.match(page, /ProductGrid/);
    assert.match(page, /ShoppingCart/);
    assert.match(page, /OrderSummary/);
    assert.match(page, /CustomerPanel/);
    assert.match(page, /PaymentPanel/);
    assert.match(page, /POSInsights/);
    assert.match(page, /quoteOrder/);
    assert.match(page, /createAdminPosOrder/);
    assert.doesNotMatch(page, /createOrderWithIdempotency/);
    assert.match(page, /operating/);
    assert.doesNotMatch(page, /03000000000/);
  });

  it("exposes opening-ready payment methods without claiming an online gateway", () => {
    const payment = read("apps/website/client/src/components/admin/pos/PaymentPanel.tsx");
    assert.match(payment, /cash|card_terminal|bank_manual|complimentary/);
    assert.match(payment, /No online card gateway/i);
    assert.doesNotMatch(payment, /No POS payment capture API/);
    const page = read("apps/website/client/src/pages/admin/AdminPos.tsx");
    assert.match(page, /paymentMethod:\s*"cash"/);
    assert.doesNotMatch(page, /Payment intent=.*Foundation/);
    assert.doesNotMatch(page, /Card Payment Successful/i);
    const actions = read("apps/website/client/src/components/admin/pos/POSActions.tsx");
    assert.match(actions, /Save draft · Planned for Phase 2/);
    assert.match(actions, /Print receipt · Planned for Phase 2/);
    assert.match(actions, /Close Shift \/ Z-Report/);
    assert.match(page, /fetchPosZReport/);
    assert.match(page, /confirmPosZReportClose/);
    assert.match(page, /ZReportModal/);
  });

  it("labels AI panel as rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/pos/POSInsights.tsx");
    assert.match(insights, /Mianx\.ai POS Assistant/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /No prediction models/i);
    assert.doesNotMatch(insights, /\bLLM\b|autonomous/i);
  });

  it("gates POS nav with canAccessAdminPos", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminPos/);
    assert.match(access, /requiresPos/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminPos/);
    assert.doesNotMatch(app, /PosComingSoon/);
  });
});

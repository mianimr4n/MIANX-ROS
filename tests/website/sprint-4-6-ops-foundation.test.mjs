/**
 * Sprint 4.6 — staff ops surfaces exist and do not claim fake payment/loyalty.
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

describe("Sprint 4.6 restaurant ops foundation (static)", () => {
  it("wires staff login and ops routes", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /\/staff\/login/);
    assert.match(app, /\/ops\/orders/);
    assert.match(app, /\/ops\/kitchen/);
    assert.match(app, /\/ops\/dispatch/);
  });

  it("exposes dispatch and complete order actions", () => {
    const transitions = read("backend/api/src/services/orders/transitions.ts");
    assert.match(transitions, /dispatch/);
    assert.match(transitions, /complete/);
    const orders = read("backend/api/src/modules/admin/orders.ts");
    assert.match(orders, /"dispatch"/);
    assert.match(orders, /"complete"/);
  });

  it("replaces rider 501 stubs with AuthPrincipal routes", () => {
    const riders = read("backend/api/src/modules/riders/routes.ts");
    assert.doesNotMatch(riders, /sendNotImplemented/);
    assert.match(riders, /deliveryOperations/);
    assert.match(riders, /requireAuthenticatedUser/);
    assert.match(riders, /\/deliveries\/:deliveryId\/assign/);
  });

  it("documents sprint 4.6 foundation", () => {
    const doc = read("docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md");
    assert.match(doc, /Restaurant Operations Foundation/);
    assert.match(doc, /No new migrations/);
    assert.match(doc, /delivery\.update/);
    assert.match(doc, /DELIVERY_SYNC_FAILED|compensating rollback/i);
  });

  it("guards dispatch and kitchen against double-submit", () => {
    const dispatch = read("apps/website/client/src/pages/ops/OpsDispatch.tsx");
    const kitchen = read("apps/website/client/src/pages/ops/OpsKitchen.tsx");
    assert.match(dispatch, /busyId/);
    assert.match(dispatch, /canUpdateStatus/);
    assert.match(kitchen, /busyTicketId/);
  });

  it("defines ops print stylesheet", () => {
    const css = read("apps/website/client/src/index.css");
    assert.match(css, /@media print/);
    assert.match(css, /ops-print-ticket/);
  });
});

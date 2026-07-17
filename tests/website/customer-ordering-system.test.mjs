import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("product detail reuses catalog data and shared configurator", () => {
  const app = read("apps/website/client/src/App.tsx");
  const detail = read("apps/website/client/src/pages/ProductDetail.tsx");
  const configurator = read(
    "apps/website/client/src/components/menu/ProductConfigurator.tsx",
  );
  const dialog = read(
    "apps/website/client/src/components/menu/PizzaCustomizerDialog.tsx",
  );

  assert.match(app, /\/menu\/:productId/);
  assert.match(detail, /useMenuCatalog/);
  assert.match(detail, /ProductConfigurator/);
  assert.match(configurator, /item\.image/);
  assert.match(configurator, /item\.description/);
  assert.match(configurator, /item\.variants/);
  assert.match(configurator, /quantity/);
  assert.match(configurator, /Special instructions/);
  assert.match(configurator, /getModifierGroupsForItem/);
  assert.match(configurator, /buildSelectedModifiers/);
  assert.match(configurator, /Final prices are verified by the server/);
  assert.match(dialog, /ProductConfigurator/);
});

test("cart and checkout keep honest pricing and unsupported-feature copy", () => {
  const cart = read("apps/website/client/src/components/CartDrawer.tsx");
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");

  assert.match(cart, /updateQuantity/);
  assert.match(cart, /removeItem/);
  assert.match(cart, /Subtotal/);
  assert.match(cart, /Taxes and delivery fees are calculated from the server quote/);
  assert.match(cart, /Promo codes/);
  assert.match(cart, /Coming soon/);
  assert.match(checkout, /serverTotals\.taxAmount/);
  assert.match(checkout, /serverTotals\.deliveryFee/);
  assert.match(checkout, /Cash on delivery/);
  assert.match(checkout, /Online card payment is not available/);
  assert.match(checkout, /requireApiSuccess:\s*true/);
  assert.match(checkout, /idempotencyKey/);
  assert.match(checkout, /listSavedAddresses/);
});

test("all customer WhatsApp actions use the locked ordering number", () => {
  const brand = read("apps/website/client/src/lib/brand.ts");
  const helper = read("apps/website/client/src/lib/checkout-order.ts");
  const cart = read("apps/website/client/src/components/CartDrawer.tsx");
  const success = read("apps/website/client/src/pages/OrderSuccess.tsx");

  assert.match(brand, /phone:\s*"0304-1110495"/);
  for (const source of [helper, cart, success]) {
    assert.match(source, /BRAND\.phone/);
  }
  assert.doesNotMatch(cart, /const phone = selectedBranch\.phone/);
  assert.doesNotMatch(success, /const branchPhone = selectedBranch\.phone/);
});

test("tracking renders the frozen lifecycle without fake GPS or ETA", () => {
  const tracking = read("apps/website/client/src/pages/TrackOrder.tsx");
  const success = read("apps/website/client/src/pages/OrderSuccess.tsx");

  for (const status of [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "dispatched",
    "completed",
    "cancelled",
  ]) {
    assert.match(tracking, new RegExp(status));
  }
  assert.match(tracking, /30_000/);
  assert.match(tracking, /No driver location is available/);
  assert.doesNotMatch(tracking, /latitude|longitude|live GPS/i);
  assert.match(success, /No estimated arrival time is available yet/);
  assert.match(success, /Order history/);
  assert.match(success, /Back to menu/);
});

test("catalog and authentication boundaries remain unchanged", () => {
  const menuData = read("apps/website/client/src/data/menu-data.ts");
  const login = read("apps/website/client/src/pages/Login.tsx");
  const auth = read("apps/website/client/src/contexts/AuthContext.tsx");

  assert.match(menuData, /tele-special/);
  assert.doesNotMatch(login, /quoteOrder|createOrder|ProductConfigurator/);
  assert.doesNotMatch(auth, /quoteOrder|createOrder|ProductConfigurator/);
});

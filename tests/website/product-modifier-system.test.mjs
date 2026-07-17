import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const root = (...parts) => join(workspaceRoot, ...parts);

test("static modifier catalog covers pizza customization groups", () => {
  const catalog = readFileSync(
    root("apps/website/client/src/data/modifier-catalog.ts"),
    "utf8",
  );
  assert.match(catalog, /code: "crust"/);
  assert.match(catalog, /code: "extra-chicken"/);
  assert.match(catalog, /code: "extra-vegetables"/);
  assert.match(catalog, /code: "add-drinks"/);
  assert.match(catalog, /priceDeltaBySize/);
  assert.match(catalog, /getStaticModifierGroupsForItem/);
});

test("ProductConfigurator is driven by relational modifier helpers", () => {
  const configurator = readFileSync(
    root("apps/website/client/src/components/menu/ProductConfigurator.tsx"),
    "utf8",
  );
  assert.match(configurator, /getModifierGroupsForItem/);
  assert.match(configurator, /buildSelectedModifiers/);
  assert.doesNotMatch(configurator, /PIZZA_ADDON_DRINK_IDS/);
  assert.doesNotMatch(configurator, /PIZZA_TOPPING_SLUGS/);
});

test("checkout quote payload includes modifiers from cart extras", () => {
  const checkout = readFileSync(
    root("apps/website/client/src/lib/checkout-order.ts"),
    "utf8",
  );
  assert.match(checkout, /modifiers:/);
  assert.match(checkout, /groupCode/);
  assert.match(checkout, /optionCode/);
  assert.match(checkout, /extra\.label/);
});

test("WhatsApp order builder includes modifier lines", () => {
  const checkout = readFileSync(
    root("apps/website/client/src/lib/checkout-order.ts"),
    "utf8",
  );
  assert.match(checkout, /\+ \$\{extra\.label\}/);
});

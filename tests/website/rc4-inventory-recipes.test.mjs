/**
 * RC4-9 Inventory Recipes — website honesty + wiring.
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

describe("RC4-9 inventory recipes (website)", () => {
  it("wires recipe admin APIs and LIVE panel", () => {
    const api = read("apps/website/client/src/lib/admin-api.ts");
    assert.match(api, /listInventoryRecipes/);
    assert.match(api, /createInventoryRecipe/);
    assert.match(api, /activateInventoryRecipe/);

    const panels = read("apps/website/client/src/components/admin/inventory/InventoryWorkflowPanels.tsx");
    assert.match(panels, /Create draft recipe/);
    assert.match(panels, /COGS GL posting is DEFERRED/);

    const helper = read("apps/website/client/src/lib/admin-inventory.ts");
    assert.match(helper, /kitchen ticket → preparing/);
    assert.doesNotMatch(helper, /Planned for Phase 2 — menu catalog has sellable SKUs; no ingredient recipes/);
  });

  it("acceptance evidence pack exists", () => {
    for (const name of [
      "BASELINE.md",
      "RECIPE_MODEL.md",
      "UNIT_CONVERSION_RULES.md",
      "CONSUMPTION_EVENT_DECISION.md",
      "REVERSAL_RULES.md",
      "COSTING_SOURCE_MAP.md",
      "COGS_INTEGRATION.md",
      "RBAC_MATRIX.md",
      "TEST_RESULTS.md",
      "SCREENSHOT_INDEX.md",
      "KNOWN_LIMITATIONS.md",
      "FINAL_REPORT.md",
    ]) {
      assert.ok(read(`docs/testing/acceptance-evidence/rc4-inventory-recipes/${name}`).length > 60, name);
    }
  });
});

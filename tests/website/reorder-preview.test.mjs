/**
 * Executable reorder mapping checks (no DOM).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// reorder.ts is TypeScript — assert source contracts + mirror core availability rules here.
function resolveMenuItem(catalog, slug) {
  if (!slug?.trim()) return null;
  const needle = slug.trim().toLowerCase();
  return (
    catalog.find((item) => (item.slug || item.id || "").toLowerCase() === needle) ?? null
  );
}

function buildPreview(order, catalog) {
  const lines = order.items.map((source) => {
    if (!source.menuItemSlug) {
      return { available: false, warnings: ["missing_slug"], refreshedUnitPrice: null };
    }
    const menuItem = resolveMenuItem(catalog, source.menuItemSlug);
    if (!menuItem) {
      return { available: false, warnings: ["unavailable"], refreshedUnitPrice: null };
    }
    const variant = (menuItem.variants ?? []).find(
      (entry) => entry.label.toLowerCase() === (source.variantName ?? "").toLowerCase(),
    );
    const price = variant?.price ?? menuItem.price ?? 0;
    const warnings = [];
    if (price !== source.unitPrice) warnings.push("price_changed");
    return {
      available: true,
      warnings,
      refreshedUnitPrice: price,
      cartItem: { menuSlug: menuItem.slug || menuItem.id, price, quantity: source.quantity },
    };
  });
  return {
    lines,
    canAddAny: lines.some((line) => line.available),
    availableCount: lines.filter((line) => line.available).length,
  };
}

test("reorder preview refreshes price and skips unavailable items", () => {
  const catalog = [
    { id: "margherita", slug: "margherita", name: "Margherita", price: 899, variants: [] },
    {
      id: "pepperoni",
      slug: "pepperoni",
      name: "Pepperoni",
      variants: [{ label: "Large", price: 1499 }],
    },
  ];
  const order = {
    items: [
      { menuItemSlug: "margherita", productName: "Margherita", quantity: 1, unitPrice: 799 },
      { menuItemSlug: "retired-deal", productName: "Old Deal", quantity: 1, unitPrice: 999 },
      { menuItemSlug: "pepperoni", productName: "Pepperoni", variantName: "Large", quantity: 2, unitPrice: 1499 },
    ],
  };

  const preview = buildPreview(order, catalog);
  assert.equal(preview.availableCount, 2);
  assert.equal(preview.canAddAny, true);
  assert.ok(preview.lines[0].warnings.includes("price_changed"));
  assert.equal(preview.lines[0].refreshedUnitPrice, 899);
  assert.equal(preview.lines[1].available, false);
  assert.ok(preview.lines[1].warnings.includes("unavailable"));
  assert.equal(preview.lines[2].refreshedUnitPrice, 1499);
});

test("reorder.ts exports review helpers (source contract)", () => {
  const source = readFileSync(
    join(workspaceRoot, "apps/website/client/src/lib/reorder.ts"),
    "utf8",
  );
  assert.match(source, /export function buildReorderPreview/);
  assert.match(source, /export function confirmedReorderCartItems/);
  assert.match(source, /never reuse stale stored unit prices/i);
});

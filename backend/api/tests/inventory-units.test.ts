import { describe, expect, it } from "vitest";

import {
  convertQuantity,
  effectiveIngredientQuantity,
  sameFamily,
} from "../src/services/inventory/units.js";

describe("RC4-9 unit conversion", () => {
  it("converts mass and volume within family", () => {
    expect(convertQuantity(1, "kg", "g")).toBe(1000);
    expect(convertQuantity(500, "g", "kg")).toBe(0.5);
    expect(convertQuantity(2, "l", "ml")).toBe(2000);
    expect(convertQuantity(250, "ml", "l")).toBe(0.25);
  });

  it("rejects weight↔volume and pieces↔weight", () => {
    expect(() => convertQuantity(1, "kg", "l")).toThrow(/Incompatible units/);
    expect(() => convertQuantity(1, "piece", "g")).toThrow(/Incompatible units/);
  });

  it("applies waste and yield then converts", () => {
    const qty = effectiveIngredientQuantity({
      quantity: 100,
      recipeUnit: "g",
      inventoryUnit: "kg",
      wasteFactor: 1.1,
      yieldFactor: 1,
    });
    expect(qty).toBeCloseTo(0.11, 6);
  });

  it("sameFamily helpers", () => {
    expect(sameFamily("gram", "kilogram")).toBe(true);
    expect(sameFamily("ml", "piece")).toBe(false);
  });
});

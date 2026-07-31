/**
 * RC4-9 deterministic unit conversion.
 * Families: mass (g/kg), volume (ml/l), count (piece).
 * Never silently coerce across families.
 */

export type UnitFamily = "mass" | "volume" | "count";

const ALIASES: Record<string, { family: UnitFamily; toBase: number; canonical: string }> = {
  g: { family: "mass", toBase: 1, canonical: "g" },
  gram: { family: "mass", toBase: 1, canonical: "g" },
  grams: { family: "mass", toBase: 1, canonical: "g" },
  kg: { family: "mass", toBase: 1000, canonical: "kg" },
  kilogram: { family: "mass", toBase: 1000, canonical: "kg" },
  kilograms: { family: "mass", toBase: 1000, canonical: "kg" },
  ml: { family: "volume", toBase: 1, canonical: "ml" },
  millilitre: { family: "volume", toBase: 1, canonical: "ml" },
  milliliter: { family: "volume", toBase: 1, canonical: "ml" },
  millilitres: { family: "volume", toBase: 1, canonical: "ml" },
  milliliters: { family: "volume", toBase: 1, canonical: "ml" },
  l: { family: "volume", toBase: 1000, canonical: "l" },
  litre: { family: "volume", toBase: 1000, canonical: "l" },
  liter: { family: "volume", toBase: 1000, canonical: "l" },
  litres: { family: "volume", toBase: 1000, canonical: "l" },
  liters: { family: "volume", toBase: 1000, canonical: "l" },
  piece: { family: "count", toBase: 1, canonical: "piece" },
  pieces: { family: "count", toBase: 1, canonical: "piece" },
  pc: { family: "count", toBase: 1, canonical: "piece" },
  pcs: { family: "count", toBase: 1, canonical: "piece" },
  unit: { family: "count", toBase: 1, canonical: "piece" },
  each: { family: "count", toBase: 1, canonical: "piece" },
};

export const SUPPORTED_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "piece",
] as const;

export type SupportedUnit = (typeof SUPPORTED_UNITS)[number];

export function normalizeUnit(raw: string): string {
  return raw.trim().toLowerCase();
}

export function resolveUnit(raw: string): { family: UnitFamily; toBase: number; canonical: string } {
  const key = normalizeUnit(raw);
  const found = ALIASES[key];
  if (!found) {
    throw Object.assign(new Error(`Unsupported unit: ${raw}`), { code: "UNSUPPORTED_UNIT" });
  }
  return found;
}

export function sameFamily(a: string, b: string): boolean {
  return resolveUnit(a).family === resolveUnit(b).family;
}

/** Convert quantity from → to. Rejects cross-family. */
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw Object.assign(new Error("Quantity must be a non-negative finite number."), {
      code: "VALIDATION_ERROR",
    });
  }
  const from = resolveUnit(fromUnit);
  const to = resolveUnit(toUnit);
  if (from.family !== to.family) {
    throw Object.assign(
      new Error(`Incompatible units: cannot convert ${from.canonical} (${from.family}) to ${to.canonical} (${to.family}).`),
      { code: "INCOMPATIBLE_UNITS" },
    );
  }
  const base = quantity * from.toBase;
  return base / to.toBase;
}

/** Effective consume qty = quantity * wasteFactor / yieldFactor, converted to inventory unit. */
export function effectiveIngredientQuantity(input: {
  quantity: number;
  recipeUnit: string;
  inventoryUnit: string;
  wasteFactor?: number;
  yieldFactor?: number;
}): number {
  const waste = input.wasteFactor ?? 1;
  const yieldFactor = input.yieldFactor ?? 1;
  if (!(waste > 0) || !(yieldFactor > 0)) {
    throw Object.assign(new Error("wasteFactor and yieldFactor must be > 0."), {
      code: "VALIDATION_ERROR",
    });
  }
  const adjusted = (input.quantity * waste) / yieldFactor;
  return convertQuantity(adjusted, input.recipeUnit, input.inventoryUnit);
}

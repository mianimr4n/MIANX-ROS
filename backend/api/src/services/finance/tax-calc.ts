/**
 * RC4-8 tax calculation helpers — configurable rates only; no hardcoded jurisdiction rates.
 * Rounding: half-up to 2 decimal places (PKR minor units).
 */

export type TaxBasis = "exclusive" | "inclusive";

export interface TaxDefinitionLike {
  rate: number;
  taxBasis: TaxBasis;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

/** Half-up rounding to 2dp without floating drift surprises for money. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isTaxEffectiveOn(def: TaxDefinitionLike, onDate: string): boolean {
  if (!def.isActive) return false;
  if (onDate < def.effectiveFrom) return false;
  if (def.effectiveTo && onDate > def.effectiveTo) return false;
  return true;
}

/**
 * Calculate tax for a line subtotal (after line discount).
 * exclusive: tax = subtotal * rate
 * inclusive: tax = subtotal - subtotal/(1+rate)
 */
export function calculateLineTax(
  lineSubtotal: number,
  def: TaxDefinitionLike | null | undefined,
  onDate: string,
): { taxAmount: number; netAmount: number; grossAmount: number } {
  const sub = roundMoney(Math.max(0, lineSubtotal));
  if (!def || !isTaxEffectiveOn(def, onDate) || def.rate <= 0) {
    return { taxAmount: 0, netAmount: sub, grossAmount: sub };
  }
  if (def.taxBasis === "inclusive") {
    const net = roundMoney(sub / (1 + def.rate));
    const tax = roundMoney(sub - net);
    return { taxAmount: tax, netAmount: net, grossAmount: sub };
  }
  const tax = roundMoney(sub * def.rate);
  return { taxAmount: tax, netAmount: sub, grossAmount: roundMoney(sub + tax) };
}

export function calculateInvoiceTaxTotals(
  lineSubtotals: number[],
  def: TaxDefinitionLike | null | undefined,
  onDate: string,
  discountAmount = 0,
): { subtotal: number; discountAmount: number; taxAmount: number; totalAmount: number } {
  const rawSubtotal = roundMoney(lineSubtotals.reduce((s, n) => s + Math.max(0, n), 0));
  const discount = roundMoney(Math.min(Math.max(0, discountAmount), rawSubtotal));
  const taxableBase = roundMoney(rawSubtotal - discount);
  const { taxAmount, grossAmount } = calculateLineTax(taxableBase, def, onDate);
  return {
    subtotal: rawSubtotal,
    discountAmount: discount,
    taxAmount,
    totalAmount: def?.taxBasis === "inclusive" ? taxableBase : grossAmount,
  };
}

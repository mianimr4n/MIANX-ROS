/**
 * Sprint 4.2 quote warnings — non-fatal, machine-stable codes.
 * Hard validation failures remain ApiError (never demoted to warnings).
 */

export type QuoteWarningCode =
  | "CLIENT_MONEY_IGNORED"
  | "CLIENT_TOTAL_IGNORED"
  | "UNSUPPORTED_FIELD_IGNORED"
  | "ITEM_PRICE_CHANGED"
  | "VARIANT_PRICE_CHANGED"
  | "TOPPING_PRICE_CHANGED"
  | "BRANCH_AVAILABILITY_WARNING";

export interface QuoteWarning {
  code: QuoteWarningCode;
  message: string;
}

const MESSAGES: Record<QuoteWarningCode, string> = {
  CLIENT_MONEY_IGNORED: "Client item or topping prices were ignored; server catalog prices apply.",
  CLIENT_TOTAL_IGNORED: "Client subtotal/fees/tax/discount/total were ignored; server totals apply.",
  UNSUPPORTED_FIELD_IGNORED: "An optional field is not applied in this release and was ignored.",
  ITEM_PRICE_CHANGED: "An item price differs from the client display price; server price applies.",
  VARIANT_PRICE_CHANGED:
    "A variant price differs from the client display price; server price applies.",
  TOPPING_PRICE_CHANGED:
    "A topping price differs from the client display price; server price applies.",
  BRANCH_AVAILABILITY_WARNING: "Selected branch may have limited availability.",
};

export function warning(code: QuoteWarningCode, message?: string): QuoteWarning {
  return {
    code,
    message: message ?? MESSAGES[code],
  };
}

export function collectClientMoneyWarnings(input: {
  items: Array<{
    unitPrice?: number;
    extras?: Array<{ price?: number }>;
  }>;
  /** Optional client-submitted money fields on the request root (if ever accepted). */
  clientSubtotal?: number;
  clientTotal?: number;
  clientTax?: number;
  clientDiscount?: number;
  clientDeliveryFee?: number;
  couponCode?: string;
  /** When true, coupon was server-validated and applied — do not warn as ignored. */
  couponApplied?: boolean;
}): QuoteWarning[] {
  const out: QuoteWarning[] = [];
  const seen = new Set<QuoteWarningCode>();

  const push = (code: QuoteWarningCode) => {
    if (seen.has(code)) return;
    seen.add(code);
    out.push(warning(code));
  };

  let anyLineMoney = false;
  let anyToppingMoney = false;
  for (const item of input.items) {
    if (typeof item.unitPrice === "number") {
      anyLineMoney = true;
    }
    for (const extra of item.extras ?? []) {
      if (typeof extra.price === "number") {
        anyToppingMoney = true;
      }
    }
  }

  if (anyLineMoney || anyToppingMoney) {
    push("CLIENT_MONEY_IGNORED");
  }
  if (anyLineMoney) {
    push("ITEM_PRICE_CHANGED");
    push("VARIANT_PRICE_CHANGED");
  }
  if (anyToppingMoney) {
    push("TOPPING_PRICE_CHANGED");
  }

  if (
    typeof input.clientSubtotal === "number" ||
    typeof input.clientTotal === "number" ||
    typeof input.clientTax === "number" ||
    typeof input.clientDiscount === "number" ||
    typeof input.clientDeliveryFee === "number"
  ) {
    push("CLIENT_TOTAL_IGNORED");
  }

  if (input.couponCode?.trim() && input.couponApplied !== true) {
    push("UNSUPPORTED_FIELD_IGNORED");
  }

  return out;
}

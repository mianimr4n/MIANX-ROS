import type { CreateWebsiteOrderPayload } from "@/lib/customer-store";
import { normalizePhoneE164 } from "@/lib/phone";
import { BRAND } from "@/lib/brand";

export type CartLineInput = CreateWebsiteOrderPayload["items"][number];

export interface QuoteRequestInput {
  branchCode: string;
  orderType: "delivery" | "pickup" | "dine-in";
  couponCode?: string;
  contactPhone?: string;
  items: CartLineInput[];
}

/** Canonical cart lines for quote/create — client money fields included but server ignores them. */
export function buildQuoteItemsFromCart(
  items: Array<{
    menuSlug: string;
    variant?: string;
    quantity: number;
    price: number;
    name: string;
    instructions?: string;
    extras?: Array<{ label: string; price: number }>;
  }>,
): CartLineInput[] {
  return items.map((item) => ({
    menuItemSlug: item.menuSlug,
    variantLabel: item.variant,
    quantity: item.quantity,
    unitPrice: item.price,
    productName: item.name,
    variantName: item.variant,
    instructions: item.instructions,
    extras: item.extras,
  }));
}

export function buildQuoteRequest(input: {
  branchCode: string;
  orderType: "delivery" | "pickup" | "dine-in";
  couponCode?: string;
  contactPhone?: string;
  cartItems: Parameters<typeof buildQuoteItemsFromCart>[0];
}): QuoteRequestInput {
  return {
    branchCode: input.branchCode,
    orderType: input.orderType,
    couponCode: input.couponCode?.trim() || undefined,
    contactPhone: input.contactPhone?.trim()
      ? normalizePhoneE164(input.contactPhone)
      : undefined,
    items: buildQuoteItemsFromCart(input.cartItems),
  };
}

/** Fingerprint for rotating Idempotency-Key when material checkout data changes. */
export function checkoutAttemptFingerprint(input: {
  branchCode: string;
  orderType: string;
  contactName: string;
  contactPhone: string;
  deliveryAddress?: string;
  couponCode?: string;
  items: CartLineInput[];
}): string {
  return JSON.stringify({
    branchCode: input.branchCode,
    orderType: input.orderType,
    contactName: input.contactName.trim(),
    contactPhone: normalizePhoneE164(input.contactPhone),
    deliveryAddress: input.deliveryAddress?.trim() || null,
    couponCode: input.couponCode?.trim() || null,
    items: input.items.map((item) => ({
      menuItemSlug: item.menuItemSlug,
      variantLabel: item.variantLabel ?? null,
      quantity: item.quantity,
      extras: item.extras,
      instructions: item.instructions ?? null,
    })),
  });
}

export function isQuoteExpired(expiresAt: string, nowMs: number = Date.now()): boolean {
  const exp = Date.parse(expiresAt);
  return Number.isFinite(exp) && nowMs >= exp;
}

export function isQuoteExpiringSoon(expiresAt: string, bufferMs = 60_000, nowMs: number = Date.now()): boolean {
  const exp = Date.parse(expiresAt);
  if (!Number.isFinite(exp)) return false;
  return exp - nowMs <= bufferMs && exp > nowMs;
}

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  QUOTE_EXPIRED: "Your quote has expired. Please refresh and try again.",
  QUOTE_NOT_FOUND: "Quote is no longer valid. Please refresh and try again.",
  QUOTE_PAYLOAD_MISMATCH: "Your cart changed since the quote. Please refresh and try again.",
  QUOTE_BRANCH_UNAVAILABLE: "This branch is not accepting orders right now.",
  CATALOG_ITEM_UNAVAILABLE: "An item in your cart is no longer available.",
  VALIDATION_ERROR: "Please check your order details and try again.",
  IDEMPOTENCY_CONFLICT: "This order was already submitted with different details.",
  DELIVERY_ADDRESS_REQUIRED: "Delivery address is required.",
  IDEMPOTENCY_KEY_REQUIRED: "Order could not be submitted. Please try again.",
};

export function mapCheckoutApiError(code: string | undefined, fallbackMessage: string): string {
  if (code && CHECKOUT_ERROR_MESSAGES[code]) {
    return CHECKOUT_ERROR_MESSAGES[code];
  }
  if (fallbackMessage) return fallbackMessage;
  return "Could not complete checkout. Please try again.";
}

export function buildWhatsAppOrderUrl(input: {
  branchPhone?: string;
  orderNumber?: string;
  contactName: string;
  contactPhone: string;
  items: CartLineInput[];
  orderType: string;
  deliveryAddress?: string;
}): string {
  // Ordering support is a locked business number; branch display phones must not reroute orders.
  const phone = BRAND.phone.replace(/\D/g, "").replace(/^0/, "");
  const lines = [
    "Hi Telepizza, I'd like to place an order:",
    input.orderNumber ? `Order ref: ${input.orderNumber}` : null,
    `Name: ${input.contactName}`,
    `Phone: ${input.contactPhone}`,
    `Type: ${input.orderType}`,
    input.deliveryAddress ? `Address: ${input.deliveryAddress}` : null,
    "",
    ...input.items.map(
      (item) =>
        `- ${item.quantity}x ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`,
    ),
  ].filter(Boolean);
  return `https://wa.me/92${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

/** Mirrors apps/website/client/src/lib/phone.ts */
function normalizePhoneE164(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+92${digits}`;
  }
  if (digits.length >= 7) {
    return `+${digits}`;
  }
  return phone.trim();
}

/** Mirrors apps/website/client/src/lib/checkout-order.ts */
function buildQuoteItemsFromCart(items) {
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

function buildQuoteRequest(input) {
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

function checkoutAttemptFingerprint(input) {
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

function isQuoteExpired(expiresAt, nowMs = Date.now()) {
  const exp = Date.parse(expiresAt);
  return Number.isFinite(exp) && nowMs >= exp;
}

function isQuoteExpiringSoon(expiresAt, bufferMs = 60_000, nowMs = Date.now()) {
  const exp = Date.parse(expiresAt);
  if (!Number.isFinite(exp)) return false;
  return exp - nowMs <= bufferMs && exp > nowMs;
}

const CHECKOUT_ERROR_MESSAGES = {
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

function mapCheckoutApiError(code, fallbackMessage) {
  if (code && CHECKOUT_ERROR_MESSAGES[code]) {
    return CHECKOUT_ERROR_MESSAGES[code];
  }
  if (fallbackMessage) return fallbackMessage;
  return "Could not complete checkout. Please try again.";
}

function buildWhatsAppOrderUrl(input) {
  const phone = input.branchPhone.replace(/\D/g, "").replace(/^0/, "");
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

test("phone normalization matches Pakistan E.164 for checkout", () => {
  assert.equal(normalizePhoneE164("0304-1110495"), "+923041110495");
  assert.equal(normalizePhoneE164("03451234567"), "+923451234567");
  assert.equal(normalizePhoneE164("+92 304 1110495"), "+923041110495");
});

test("buildQuoteRequest maps cart lines and normalizes contact phone", () => {
  const request = buildQuoteRequest({
    branchCode: "royal-orchard",
    orderType: "delivery",
    couponCode: "  SAVE10 ",
    contactPhone: "0304-1110495",
    cartItems: [
      {
        menuSlug: "tele-special",
        variant: "6 inch Small",
        quantity: 2,
        price: 499,
        name: "Tele Special",
      },
    ],
  });

  assert.equal(request.branchCode, "royal-orchard");
  assert.equal(request.orderType, "delivery");
  assert.equal(request.couponCode, "SAVE10");
  assert.equal(request.contactPhone, "+923041110495");
  assert.equal(request.items.length, 1);
  assert.equal(request.items[0].menuItemSlug, "tele-special");
  assert.equal(request.items[0].quantity, 2);
});

test("checkoutAttemptFingerprint rotates when material fields change", () => {
  const base = {
    branchCode: "royal-orchard",
    orderType: "pickup",
    contactName: "Ali",
    contactPhone: "03041110495",
    items: [
      {
        menuItemSlug: "tele-special",
        variantLabel: "6 inch Small",
        quantity: 1,
      },
    ],
  };

  const first = checkoutAttemptFingerprint(base);
  const same = checkoutAttemptFingerprint(base);
  const qtyChanged = checkoutAttemptFingerprint({
    ...base,
    items: [{ ...base.items[0], quantity: 2 }],
  });

  assert.equal(first, same);
  assert.notEqual(first, qtyChanged);
});

test("quote expiry helpers detect expired and expiring-soon windows", () => {
  const now = Date.parse("2026-07-16T12:00:00.000Z");
  const expiresAt = "2026-07-16T12:05:00.000Z";

  assert.equal(isQuoteExpired(expiresAt, now), false);
  assert.equal(isQuoteExpiringSoon(expiresAt, 60_000, now), false);
  assert.equal(isQuoteExpiringSoon(expiresAt, 6 * 60_000, now), true);
  assert.equal(isQuoteExpired(expiresAt, Date.parse(expiresAt)), true);
});

test("mapCheckoutApiError returns stable customer-facing messages", () => {
  assert.match(mapCheckoutApiError("QUOTE_EXPIRED", ""), /expired/i);
  assert.match(mapCheckoutApiError("QUOTE_PAYLOAD_MISMATCH", ""), /cart changed/i);
  assert.match(mapCheckoutApiError("IDEMPOTENCY_CONFLICT", ""), /already submitted/i);
  assert.equal(mapCheckoutApiError(undefined, "Server down"), "Server down");
});

test("WhatsApp fallback preserves locked ordering number 0304-1110495", () => {
  const url = buildWhatsAppOrderUrl({
    branchPhone: "0304-1110495",
    contactName: "Sara",
    contactPhone: "03041110495",
    orderType: "pickup",
    items: [
      {
        quantity: 1,
        productName: "Tele Special",
        variantName: "6 inch Small",
      },
    ],
  });

  assert.match(url, /^https:\/\/wa\.me\/923041110495\?text=/);
  assert.match(decodeURIComponent(url), /Tele Special/);
});

test("Checkout page wires quote lifecycle, idempotency rotation, and API-only success", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");

  assert.match(checkout, /quoteOrder\(/);
  assert.match(checkout, /quoteRequestSeq/);
  assert.match(checkout, /checkoutAttemptFingerprint/);
  assert.match(checkout, /setIdempotencyKey\(crypto\.randomUUID\(\)\)/);
  assert.match(checkout, /requireApiSuccess:\s*true/);
  assert.match(checkout, /accessToken:\s*session\?\.access_token/);
  assert.match(checkout, /result\.source !== "api"/);
  assert.match(checkout, /clearCart\(\)/);
  assert.match(checkout, /buildWhatsAppOrderUrl/);
  assert.match(checkout, /serverTotals/);
  assert.doesNotMatch(checkout, /globalThis\.__telepizza_idk__/);
});

test("submitWebsiteOrder passes quoteId, idempotency key, and throws on API failure when required", () => {
  const submitOrder = read("apps/website/client/src/lib/submit-order.ts");

  assert.match(submitOrder, /createOrderWithIdempotency/);
  assert.match(submitOrder, /quoteId:\s*options\.quoteId/);
  assert.match(submitOrder, /options\.idempotencyKey/);
  assert.match(submitOrder, /requireApiSuccess/);
  assert.match(submitOrder, /CheckoutSubmitError/);
  assert.match(submitOrder, /mapCheckoutApiError/);
  assert.match(submitOrder, /saveLocalOrder\(payload, \{ source: "local" \}\)/);
});

test("api client surfaces error codes for checkout mapping", () => {
  const api = read("apps/website/client/src/lib/api.ts");
  assert.match(api, /code\?: string/);
  assert.match(api, /error\?\.code/);
});

test("Login and Register pages remain untouched by Sprint 4.3 checkout", () => {
  const login = read("apps/website/client/src/pages/Login.tsx");
  const register = read("apps/website/client/src/pages/Register.tsx");
  assert.doesNotMatch(login, /quoteOrder|checkoutAttemptFingerprint/);
  assert.doesNotMatch(register, /quoteOrder|checkoutAttemptFingerprint/);
});

// --- Sprint 4.3 Phase 11 extended coverage ---

test("checkout displays server totals and ignores client subtotal when quote is ready", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /serverTotals\.subtotal/);
  assert.match(checkout, /serverTotals\.totalAmount/);
  assert.match(checkout, /Subtotal \(estimate\)/);
  assert.match(checkout, /serverQuoteItems/);
});

test("fingerprint changes when branch or order type changes", () => {
  const base = {
    branchCode: "royal-orchard",
    orderType: "pickup",
    contactName: "Ali",
    contactPhone: "03041110495",
    items: [{ menuItemSlug: "tele-special", quantity: 1 }],
  };
  const branchChanged = checkoutAttemptFingerprint({
    ...base,
    branchCode: "other-branch",
  });
  const typeChanged = checkoutAttemptFingerprint({
    ...base,
    orderType: "delivery",
    deliveryAddress: "Multan",
  });
  assert.notEqual(checkoutAttemptFingerprint(base), branchChanged);
  assert.notEqual(checkoutAttemptFingerprint(base), typeChanged);
});

test("Checkout ignores stale quote responses via sequence guard", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /quoteRequestSeq\.current/);
  assert.match(checkout, /if \(seq !== quoteRequestSeq\.current\) return null/);
});

test("idempotency key stays stable until fingerprint changes", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /idempotencyKey/);
  assert.match(checkout, /lastFingerprint\.current !== attemptFingerprint/);
});

test("double submit is blocked while request is in flight", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /submitInFlight/);
  assert.match(checkout, /if \(submitInFlight\.current \|\| isSubmitting\) return/);
});

test("guest checkout requires name and phone without login", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /Name and phone are required/);
  assert.doesNotMatch(checkout, /must be logged in|login required/i);
});

test("delivery requires address; pickup does not gate address field on delivery mode only", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /Delivery address is required/);
  assert.match(checkout, /deliveryMode === "delivery"/);
});

test("cart is preserved on API failure and local fallback", () => {
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");
  assert.match(checkout, /result\.source !== "api"/);
  assert.match(checkout, /Cart was not cleared/);
  const submitOrder = read("apps/website/client/src/lib/submit-order.ts");
  assert.match(submitOrder, /requireApiSuccess/);
});

test("OrderSuccess distinguishes confirmed API orders from LOC/local fallback", () => {
  const success = read("apps/website/client/src/pages/OrderSuccess.tsx");
  assert.match(success, /LOC-/);
  assert.match(success, /isConfirmedApiOrder/);
  assert.match(success, /isLocalFallback/);
  assert.match(success, /not a confirmed branch order/i);
  assert.match(success, /Server total/);
});

test("catalog and auth regression guards remain intact", () => {
  const menuData = read("apps/website/client/src/data/menu-data.ts");
  assert.match(menuData, /tele-special/);
  const staffAccept = read("apps/website/client/src/pages/StaffAccept.tsx");
  assert.match(staffAccept, /\/auth\/staff\/invites/);
  assert.doesNotMatch(staffAccept, /quoteOrder/);
});

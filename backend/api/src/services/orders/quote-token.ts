/**
 * Sprint 4.2 — signed/stateless order quotes.
 *
 * Architecture choice (smallest safe): HMAC-signed opaque quoteId.
 * No order_quotes table / no migration. Create always re-prices (O8).
 * Server clock owns expiry; client clock is never trusted.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ApiError } from "../../common/http.js";
import { hashIdempotencyPayload } from "./pricing.js";

export const QUOTE_TTL_MS = 5 * 60 * 1000;
export const QUOTE_TOKEN_VERSION = 1 as const;
const QUOTE_PREFIX = "tpq1";

export interface QuoteCartLineCanon {
  menuItemSlug: string;
  variantLabel: string | null;
  quantity: number;
  toppings: Array<{ slug: string }>;
  extras: Array<{ slug: string | null; label: string | null }>;
  modifiers: Array<{ groupCode: string; optionCode: string }>;
  instructions: string | null;
}

export interface QuoteBindPayload {
  v: typeof QUOTE_TOKEN_VERSION;
  /** Opaque nonce — prevents guessing / enumeration of sequential IDs. */
  n: string;
  iat: number;
  exp: number;
  branchCode: string;
  orderType: string;
  /** Canonical cart hash (no client money). */
  cartHash: string;
  /** Server-priced totals sealed at quote time for drift detection. */
  pricedHash: string;
  subtotal: number;
  totalAmount: number;
  /** Optional E.164 bind when quote request included contactPhone. */
  contactPhoneE164: string | null;
}

export interface IssuedQuoteToken {
  quoteId: string;
  expiresAt: string;
  issuedAt: string;
  payload: QuoteBindPayload;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signBody(secret: string, body: string): string {
  return b64url(createHmac("sha256", secret).update(body).digest());
}

function signaturesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Canonical cart for quote binding — excludes all client money fields. */
export function buildQuoteCartCanon(
  items: Array<{
    menuItemSlug: string;
    variantLabel?: string;
    quantity: number;
    toppings?: Array<{ slug: string }>;
    extras?: Array<{ slug?: string; label?: string }>;
    modifiers?: Array<{ groupCode: string; optionCode: string }>;
    instructions?: string;
  }>,
): QuoteCartLineCanon[] {
  return items.map((item) => ({
    menuItemSlug: item.menuItemSlug,
    variantLabel: item.variantLabel ?? null,
    quantity: item.quantity,
    toppings: (item.toppings ?? []).map((t) => ({ slug: t.slug })).sort((a, b) => a.slug.localeCompare(b.slug)),
    extras: (item.extras ?? [])
      .map((extra) => ({
        slug: extra.slug ?? null,
        label: extra.label ?? null,
      }))
      .sort((a, b) => `${a.slug}:${a.label}`.localeCompare(`${b.slug}:${b.label}`)),
    modifiers: (item.modifiers ?? [])
      .map((modifier) => ({
        groupCode: modifier.groupCode,
        optionCode: modifier.optionCode,
      }))
      .sort((a, b) =>
        `${a.groupCode}:${a.optionCode}`.localeCompare(`${b.groupCode}:${b.optionCode}`),
      ),
    instructions: item.instructions?.trim() || null,
  }));
}

export function hashQuoteCart(items: QuoteCartLineCanon[]): string {
  return hashIdempotencyPayload(items);
}

export function hashPricedTotals(input: {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  lines: Array<{
    menuItemSlug: string;
    foodUnitPrice: number;
    lineUnitPrice: number;
    lineTotal: number;
    quantity: number;
    extras: Array<{ slug: string; price: number }>;
  }>;
}): string {
  return hashIdempotencyPayload(input);
}

export function issueQuoteToken(input: {
  signingSecret: string;
  branchCode: string;
  orderType: string;
  cartHash: string;
  pricedHash: string;
  subtotal: number;
  totalAmount: number;
  contactPhoneE164?: string | null;
  nowMs?: number;
  ttlMs?: number;
}): IssuedQuoteToken {
  const now = input.nowMs ?? Date.now();
  const ttl = input.ttlMs ?? QUOTE_TTL_MS;
  const payload: QuoteBindPayload = {
    v: QUOTE_TOKEN_VERSION,
    n: b64url(randomBytes(18)),
    iat: now,
    exp: now + ttl,
    branchCode: input.branchCode,
    orderType: input.orderType,
    cartHash: input.cartHash,
    pricedHash: input.pricedHash,
    subtotal: input.subtotal,
    totalAmount: input.totalAmount,
    contactPhoneE164: input.contactPhoneE164 ?? null,
  };

  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = signBody(input.signingSecret, `${QUOTE_PREFIX}.${body}`);
  const quoteId = `${QUOTE_PREFIX}.${body}.${sig}`;

  return {
    quoteId,
    expiresAt: new Date(payload.exp).toISOString(),
    issuedAt: new Date(payload.iat).toISOString(),
    payload,
  };
}

/**
 * Verify signature + structural shape. Does NOT check expiry or cart match —
 * callers do that with server clock / request data.
 */
export function parseAndVerifyQuoteToken(
  quoteId: string,
  signingSecret: string,
): QuoteBindPayload {
  if (typeof quoteId !== "string" || quoteId.length < 20 || quoteId.length > 4000) {
    throw new ApiError(400, "QUOTE_NOT_FOUND", "Quote was not found or is invalid.");
  }

  const parts = quoteId.split(".");
  if (parts.length !== 3 || parts[0] !== QUOTE_PREFIX) {
    throw new ApiError(400, "QUOTE_NOT_FOUND", "Quote was not found or is invalid.");
  }

  const [, body, sig] = parts;
  if (!body || !sig) {
    throw new ApiError(400, "QUOTE_NOT_FOUND", "Quote was not found or is invalid.");
  }

  const expected = signBody(signingSecret, `${QUOTE_PREFIX}.${body}`);
  if (!signaturesEqual(sig, expected)) {
    // Treat tamper as not-found to avoid oracle / enumeration hints.
    throw new ApiError(400, "QUOTE_NOT_FOUND", "Quote was not found or is invalid.");
  }

  let payload: QuoteBindPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as QuoteBindPayload;
  } catch {
    throw new ApiError(400, "QUOTE_NOT_FOUND", "Quote was not found or is invalid.");
  }

  if (
    payload.v !== QUOTE_TOKEN_VERSION ||
    typeof payload.n !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.branchCode !== "string" ||
    typeof payload.orderType !== "string" ||
    typeof payload.cartHash !== "string" ||
    typeof payload.pricedHash !== "string"
  ) {
    throw new ApiError(400, "QUOTE_NOT_FOUND", "Quote was not found or is invalid.");
  }

  return payload;
}

export function assertQuoteNotExpired(payload: QuoteBindPayload, nowMs: number = Date.now()): void {
  if (nowMs >= payload.exp) {
    throw new ApiError(
      400,
      "QUOTE_EXPIRED",
      "This quote has expired. Please request a new quote.",
    );
  }
}

export function assertQuoteMatchesCreate(input: {
  payload: QuoteBindPayload;
  branchCode: string;
  orderType: string;
  cartHash: string;
  contactPhoneE164: string;
}): void {
  if (input.payload.branchCode !== input.branchCode) {
    throw new ApiError(
      409,
      "QUOTE_PAYLOAD_MISMATCH",
      "Quote does not match this order branch.",
    );
  }
  if (input.payload.orderType !== input.orderType) {
    throw new ApiError(
      409,
      "QUOTE_PAYLOAD_MISMATCH",
      "Quote does not match this order type.",
    );
  }
  if (input.payload.cartHash !== input.cartHash) {
    throw new ApiError(
      409,
      "QUOTE_PAYLOAD_MISMATCH",
      "Quote does not match this cart.",
    );
  }
  if (
    input.payload.contactPhoneE164 &&
    input.payload.contactPhoneE164 !== input.contactPhoneE164
  ) {
    throw new ApiError(
      409,
      "QUOTE_PAYLOAD_MISMATCH",
      "Quote does not match this contact phone.",
    );
  }
}

export function assertQuotePricesStillValid(input: {
  payload: QuoteBindPayload;
  pricedHash: string;
  subtotal: number;
  totalAmount: number;
}): void {
  const epsilon = 0.009;
  if (
    input.payload.pricedHash !== input.pricedHash ||
    Math.abs(input.payload.subtotal - input.subtotal) > epsilon ||
    Math.abs(input.payload.totalAmount - input.totalAmount) > epsilon
  ) {
    throw new ApiError(
      409,
      "QUOTE_PAYLOAD_MISMATCH",
      "Catalog prices changed since this quote was issued. Please request a new quote.",
    );
  }
}

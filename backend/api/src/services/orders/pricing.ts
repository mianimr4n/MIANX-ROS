import { createHash } from "node:crypto";

import { ApiError } from "../../common/http.js";

export type ToppingSizeTier = "small" | "medium" | "large";

export interface CatalogVariant {
  id: string;
  label: string;
  price: number | string;
  is_available: boolean;
  size_code?: string | null;
}

export interface CatalogMenuItem {
  id: string;
  slug: string;
  name: string;
  base_price: number | string | null;
  product_type?: string | null;
  is_available?: boolean | null;
  variants: CatalogVariant[] | null;
}

export interface QuoteToppingInput {
  slug?: string;
  label?: string;
  /** Ignored — never trusted for pricing. */
  price?: number;
}

export interface QuoteLineInput {
  menuItemSlug: string;
  variantLabel?: string;
  quantity: number;
  instructions?: string;
  /** Preferred pizza topping SKUs. */
  toppings?: Array<{ slug: string }>;
  /**
   * Legacy extras (website today). Prices ignored.
   * Resolve via slug, topping label heuristics, or menu item name (addons).
   */
  extras?: QuoteToppingInput[];
  /** Ignored money / display fields from clients. */
  unitPrice?: number;
  productName?: string;
  variantName?: string;
}

export interface PricedExtraSnapshot {
  slug: string;
  label: string;
  price: number;
  kind: "topping" | "addon";
}

export interface PricedOrderLine {
  menuItemId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  foodUnitPrice: number;
  extras: PricedExtraSnapshot[];
  lineUnitPrice: number;
  lineTotal: number;
  instructions: string | null;
  extrasSnapshot: PricedExtraSnapshot[];
}

export interface OrderPricingResult {
  currency: "PKR";
  lines: PricedOrderLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  pricingSnapshot: {
    engine: "sprint4.1";
    discountAmount: number;
    taxAmount: number;
    deliveryFee: number;
    pricedAt: string;
  };
}

export function parseNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Digits-only compare helper (tracking). */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Canonical Pakistan E.164 (+923XXXXXXXXX) when possible; otherwise digits with +.
 */
export function normalizePhoneE164(phone: string): string {
  const digits = normalizePhoneDigits(phone);
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
  throw new ApiError(400, "INVALID_CONTACT_PHONE", "Contact phone is invalid.");
}

export function getToppingTierFromVariantLabel(label: string): ToppingSizeTier {
  const normalized = label.toLowerCase();
  if (normalized.includes("12 inch") || normalized.includes('12"') || normalized === "large") {
    return "large";
  }
  if (
    normalized.includes("10 inch") ||
    normalized.includes('10"') ||
    normalized.includes("9 inch") ||
    normalized === "medium"
  ) {
    return "medium";
  }
  return "small";
}

export function inferToppingSlugFromLabel(label: string): string | null {
  const normalized = label.toLowerCase();
  if (normalized.includes("cheese slice")) return "extra-cheese-slice";
  if (normalized.includes("extra cheese") || normalized.startsWith("extra cheese")) {
    return "extra-cheese";
  }
  if (normalized.includes("extra chicken") || normalized.startsWith("extra chicken")) {
    return "extra-chicken";
  }
  return null;
}

export function hashIdempotencyPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function resolveVariant(
  menuItem: CatalogMenuItem,
  variantLabel: string | undefined,
): CatalogVariant | null {
  const variants = menuItem.variants ?? [];
  if (variantLabel) {
    const match = variants.find((entry) => entry.label === variantLabel);
    return match ?? null;
  }
  return variants.find((entry) => entry.is_available) ?? variants[0] ?? null;
}

function resolveToppingPrice(
  topping: CatalogMenuItem,
  tier: ToppingSizeTier,
): { variant: CatalogVariant; price: number } {
  const variants = topping.variants ?? [];
  const bySize = variants.find((entry) => entry.size_code === tier && entry.is_available);
  if (bySize) {
    return { variant: bySize, price: parseNumber(bySize.price) };
  }

  const byLabel = variants.find((entry) => {
    const label = entry.label.toLowerCase();
    if (!entry.is_available) return false;
    if (tier === "large") return label.includes("large");
    if (tier === "medium") return label.includes("medium");
    return label.includes("small");
  });
  if (byLabel) {
    return { variant: byLabel, price: parseNumber(byLabel.price) };
  }

  // Single-price toppings (e.g. cheese slice) — any available variant or base.
  const any = variants.find((entry) => entry.is_available) ?? variants[0];
  if (any) {
    return { variant: any, price: parseNumber(any.price) };
  }
  if (topping.base_price !== null) {
    return {
      variant: {
        id: topping.id,
        label: "default",
        price: parseNumber(topping.base_price),
        is_available: true,
        size_code: tier,
      },
      price: parseNumber(topping.base_price),
    };
  }

  throw new ApiError(
    400,
    "TOPPING_PRICE_UNAVAILABLE",
    `Topping '${topping.slug}' has no price for size tier '${tier}'.`,
  );
}

function collectExtraRefs(line: QuoteLineInput): Array<{ slug?: string; label?: string }> {
  const refs: Array<{ slug?: string; label?: string }> = [];
  for (const topping of line.toppings ?? []) {
    refs.push({ slug: topping.slug });
  }
  for (const extra of line.extras ?? []) {
    refs.push({
      slug: extra.slug ?? inferToppingSlugFromLabel(extra.label ?? "") ?? undefined,
      label: extra.label,
    });
  }
  return refs;
}

/**
 * Price order lines from catalog rows. Never uses client unitPrice / extras.price.
 */
export function priceOrderLines(input: {
  lines: QuoteLineInput[];
  menuBySlug: Map<string, CatalogMenuItem>;
}): OrderPricingResult {
  if (input.lines.length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "At least one order item is required.");
  }
  if (input.lines.length > 50) {
    throw new ApiError(400, "VALIDATION_ERROR", "Too many order lines.");
  }

  const pricedLines: PricedOrderLine[] = [];
  let subtotal = 0;

  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
      throw new ApiError(400, "VALIDATION_ERROR", "Item quantity must be between 1 and 20.");
    }

    const menuItem = input.menuBySlug.get(line.menuItemSlug);
    if (!menuItem) {
      throw new ApiError(
        400,
        "MENU_ITEM_NOT_FOUND",
        `Menu item '${line.menuItemSlug}' is not available for online ordering.`,
      );
    }
    if (menuItem.product_type === "topping") {
      throw new ApiError(
        400,
        "MENU_ITEM_NOT_FOUND",
        `Topping SKU '${line.menuItemSlug}' cannot be ordered as a standalone line.`,
      );
    }
    if (menuItem.is_available === false) {
      throw new ApiError(
        400,
        "MENU_ITEM_UNAVAILABLE",
        `Menu item '${line.menuItemSlug}' is currently unavailable.`,
      );
    }

    const variant = resolveVariant(menuItem, line.variantLabel);
    if (line.variantLabel && !variant) {
      throw new ApiError(
        400,
        "VARIANT_NOT_FOUND",
        `Variant '${line.variantLabel}' for '${line.menuItemSlug}' was not found.`,
      );
    }
    if (variant && !variant.is_available) {
      throw new ApiError(
        400,
        "VARIANT_UNAVAILABLE",
        `Variant '${variant.label}' for '${line.menuItemSlug}' is not available.`,
      );
    }

    let foodUnitPrice = 0;
    let variantId: string | null = null;
    let variantName: string | null = null;
    let tier: ToppingSizeTier = "small";

    if (variant) {
      variantId = variant.id;
      variantName = variant.label;
      foodUnitPrice = parseNumber(variant.price);
      tier = getToppingTierFromVariantLabel(variant.label);
    } else if (menuItem.base_price !== null) {
      foodUnitPrice = parseNumber(menuItem.base_price);
    } else {
      throw new ApiError(
        400,
        "PRICE_UNAVAILABLE",
        `No server price available for '${line.menuItemSlug}'.`,
      );
    }

    const extras: PricedExtraSnapshot[] = [];
    for (const ref of collectExtraRefs(line)) {
      let catalogItem: CatalogMenuItem | undefined;
      if (ref.slug) {
        catalogItem = input.menuBySlug.get(ref.slug);
      } else if (ref.label) {
        const needle = ref.label.trim().toLowerCase();
        for (const candidate of input.menuBySlug.values()) {
          if (candidate.name.trim().toLowerCase() === needle) {
            catalogItem = candidate;
            break;
          }
        }
      }

      if (!catalogItem) {
        throw new ApiError(
          400,
          "TOPPING_NOT_FOUND",
          `Could not resolve topping/addon '${ref.slug ?? ref.label ?? "unknown"}' from catalog.`,
        );
      }
      if (catalogItem.is_available === false) {
        throw new ApiError(
          400,
          "TOPPING_UNAVAILABLE",
          `Topping/addon '${catalogItem.slug}' is currently unavailable.`,
        );
      }

      if (catalogItem.product_type === "topping") {
        const priced = resolveToppingPrice(catalogItem, tier);
        extras.push({
          slug: catalogItem.slug,
          label: catalogItem.name,
          price: priced.price,
          kind: "topping",
        });
      } else {
        const addonVariant = resolveVariant(catalogItem, undefined);
        const price = addonVariant
          ? parseNumber(addonVariant.price)
          : parseNumber(catalogItem.base_price);
        if (!price && catalogItem.base_price === null && !addonVariant) {
          throw new ApiError(
            400,
            "PRICE_UNAVAILABLE",
            `No server price available for addon '${catalogItem.slug}'.`,
          );
        }
        extras.push({
          slug: catalogItem.slug,
          label: catalogItem.name,
          price,
          kind: "addon",
        });
      }
    }

    const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
    const lineUnitPrice = foodUnitPrice + extrasTotal;
    const lineTotal = lineUnitPrice * line.quantity;
    subtotal += lineTotal;

    pricedLines.push({
      menuItemId: menuItem.id,
      variantId,
      productName: menuItem.name,
      variantName,
      quantity: line.quantity,
      foodUnitPrice,
      extras,
      lineUnitPrice,
      lineTotal,
      instructions: line.instructions?.trim() || null,
      extrasSnapshot: extras,
    });
  }

  const discountAmount = 0;
  const taxAmount = 0;
  const deliveryFee = 0;
  const totalAmount = subtotal - discountAmount + taxAmount + deliveryFee;

  return {
    currency: "PKR",
    lines: pricedLines,
    subtotal,
    discountAmount,
    taxAmount,
    deliveryFee,
    totalAmount,
    pricingSnapshot: {
      engine: "sprint4.1",
      discountAmount,
      taxAmount,
      deliveryFee,
      pricedAt: new Date().toISOString(),
    },
  };
}

export function collectCatalogSlugs(lines: QuoteLineInput[]): string[] {
  const slugs = new Set<string>();
  for (const line of lines) {
    slugs.add(line.menuItemSlug);
    for (const topping of line.toppings ?? []) {
      slugs.add(topping.slug);
    }
    for (const extra of line.extras ?? []) {
      const inferred = extra.slug ?? (extra.label ? inferToppingSlugFromLabel(extra.label) : null);
      if (inferred) slugs.add(inferred);
    }
  }
  return [...slugs];
}

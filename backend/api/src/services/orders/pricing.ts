import { createHash } from "node:crypto";

import { ApiError } from "../../common/http.js";
import {
  priceModifierSelections,
  type ModifierOptionRow,
  type PricedModifierSnapshot,
} from "./modifiers.js";

export type ToppingSizeTier = "small" | "medium" | "large";

/**
 * A canonical sellable SKU row. Exactly one price per row — `menu_item_variants` is
 * deprecated and is never consulted for pricing.
 */
export interface CatalogMenuItem {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  product_group_slug?: string | null;
  size_label?: string | null;
  size_code?: string | null;
  sort_order?: number | null;
  product_type?: string | null;
  is_available?: boolean | null;
}

/** Slug/ID lookups over the canonical SKU rows loaded for one quote. */
export interface CatalogLookup {
  /** Keyed by menu_items.id. */
  bySkuId: Map<string, CatalogMenuItem>;
  /** Keyed by menu_items.slug. */
  bySkuSlug: Map<string, CatalogMenuItem>;
  /** Keyed by menu_items.product_group_slug — legacy clients still send family slugs. */
  byGroupSlug: Map<string, CatalogMenuItem[]>;
}

export function buildCatalogLookup(rows: Iterable<CatalogMenuItem>): CatalogLookup {
  const bySkuId = new Map<string, CatalogMenuItem>();
  const bySkuSlug = new Map<string, CatalogMenuItem>();
  const byGroupSlug = new Map<string, CatalogMenuItem[]>();

  for (const row of rows) {
    bySkuId.set(row.id, row);
    bySkuSlug.set(row.slug, row);
    const groupSlug = row.product_group_slug ?? row.slug;
    const siblings = byGroupSlug.get(groupSlug) ?? [];
    siblings.push(row);
    byGroupSlug.set(groupSlug, siblings);
  }

  for (const siblings of byGroupSlug.values()) {
    siblings.sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  }

  return { bySkuId, bySkuSlug, byGroupSlug };
}

export interface QuoteToppingInput {
  slug?: string;
  label?: string;
  /** Ignored — never trusted for pricing. */
  price?: number;
}

export interface QuoteModifierInput {
  groupCode: string;
  optionCode: string;
}

export interface QuoteLineInput {
  /** Preferred: the canonical sellable SKU id. */
  menuItemId?: string;
  /** Canonical SKU slug, or a legacy product-family slug. */
  menuItemSlug?: string;
  /**
   * LEGACY size hint from pre-SKU clients. Resolved against sibling SKU `size_label`.
   * New clients send `menuItemId` and omit this.
   */
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
  /** Relational modifier selections (preferred). */
  modifiers?: QuoteModifierInput[];
  /** Ignored money / display fields from clients. */
  unitPrice?: number;
  productName?: string;
  variantName?: string;
}

export interface PricedExtraSnapshot {
  slug: string;
  label: string;
  price: number;
  kind: "topping" | "addon" | "modifier";
  groupCode?: string;
  optionCode?: string;
}

export interface PricedModifierLine {
  modifierOptionId: string;
  groupCode: string;
  groupName: string;
  optionCode: string;
  optionName: string;
  priceDelta: number;
  sortOrder: number;
}

export interface PricedOrderLine {
  /** The exact sellable SKU that was priced. */
  menuItemId: string;
  menuItemSlug: string;
  /** Deprecated snapshot column — always null for SKU-priced orders. */
  variantId: string | null;
  productName: string;
  /** Size/option label snapshot (previously the variant label). */
  variantName: string | null;
  quantity: number;
  foodUnitPrice: number;
  extras: PricedExtraSnapshot[];
  modifiers: PricedModifierLine[];
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
    engine: "sprint4.2";
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

/** Resolve the size tier from the SKU's machine size code, falling back to its label. */
export function getToppingTierFromSku(sku: CatalogMenuItem): ToppingSizeTier {
  const code = sku.size_code?.toLowerCase();
  if (code === "large" || code === "medium" || code === "small") {
    return code;
  }
  return sku.size_label ? getToppingTierFromVariantLabel(sku.size_label) : "small";
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

/**
 * Resolve the exact sellable SKU for an order line.
 *
 * Preferred path is `menuItemId`. Slugs still resolve for compatibility: first as a SKU
 * slug, then as a product-family slug narrowed by the legacy `variantLabel` hint.
 */
export function resolveSku(catalog: CatalogLookup, line: QuoteLineInput): CatalogMenuItem {
  if (line.menuItemId) {
    const bySkuId = catalog.bySkuId.get(line.menuItemId);
    if (!bySkuId) {
      throw new ApiError(
        400,
        "MENU_ITEM_NOT_FOUND",
        `Menu item '${line.menuItemId}' is not available for ordering.`,
      );
    }
    return bySkuId;
  }

  const reference = line.menuItemSlug;
  if (!reference) {
    throw new ApiError(400, "VALIDATION_ERROR", "Each order line requires menuItemId or menuItemSlug.");
  }

  const bySlug = catalog.bySkuSlug.get(reference);
  if (bySlug) {
    return bySlug;
  }

  const siblings = catalog.byGroupSlug.get(reference) ?? [];
  if (siblings.length === 0) {
    throw new ApiError(
      400,
      "MENU_ITEM_NOT_FOUND",
      `Menu item '${reference}' is not available for online ordering.`,
    );
  }

  if (line.variantLabel) {
    const needle = line.variantLabel.trim().toLowerCase();
    const match = siblings.find((sku) => (sku.size_label ?? "").trim().toLowerCase() === needle);
    if (!match) {
      throw new ApiError(
        400,
        "SKU_NOT_FOUND",
        `Option '${line.variantLabel}' for '${reference}' was not found.`,
      );
    }
    return match;
  }

  if (siblings.length > 1) {
    throw new ApiError(
      400,
      "SKU_SELECTION_REQUIRED",
      `'${reference}' has multiple sellable options; submit the exact menuItemId.`,
    );
  }

  return siblings[0]!;
}

/** Pick the topping SKU that matches the base item's size tier. */
function resolveToppingPrice(
  catalog: CatalogLookup,
  topping: CatalogMenuItem,
  tier: ToppingSizeTier,
): { sku: CatalogMenuItem; price: number } {
  const groupSlug = topping.product_group_slug ?? topping.slug;
  const siblings = catalog.byGroupSlug.get(groupSlug) ?? [topping];
  const available = siblings.filter((sku) => sku.is_available !== false);
  const candidates = available.length > 0 ? available : siblings;

  const bySize = candidates.find((sku) => (sku.size_code ?? "").toLowerCase() === tier);
  if (bySize) {
    return { sku: bySize, price: parseNumber(bySize.price) };
  }

  const byLabel = candidates.find((sku) => (sku.size_label ?? "").toLowerCase().includes(tier));
  if (byLabel) {
    return { sku: byLabel, price: parseNumber(byLabel.price) };
  }

  // Single-price toppings (e.g. cheese slice) have exactly one SKU in the family.
  const single = candidates[0];
  if (single) {
    return { sku: single, price: parseNumber(single.price) };
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
  catalog: CatalogLookup;
  /** Optional relational modifiers keyed by groupCode::optionCode */
  modifiersByKey?: Map<string, ModifierOptionRow>;
  /** Server-validated coupon discount; never trust client money. */
  discountAmount?: number;
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

    const menuItem = resolveSku(input.catalog, line);
    const reference = line.menuItemId ?? line.menuItemSlug ?? menuItem.slug;

    if (menuItem.product_type === "topping") {
      throw new ApiError(
        400,
        "MENU_ITEM_NOT_FOUND",
        `Topping SKU '${menuItem.slug}' cannot be ordered as a standalone line.`,
      );
    }
    if (menuItem.is_available === false) {
      throw new ApiError(
        400,
        "CATALOG_ITEM_UNAVAILABLE",
        `Menu item '${reference}' is currently unavailable.`,
      );
    }

    const foodUnitPrice = parseNumber(menuItem.price);
    if (!Number.isFinite(foodUnitPrice) || foodUnitPrice < 0) {
      throw new ApiError(400, "PRICE_UNAVAILABLE", `No server price available for '${reference}'.`);
    }

    // Historical snapshot columns keep their meaning: variant_id is null for SKU orders.
    const variantId: string | null = null;
    const variantName: string | null = menuItem.size_label ?? null;
    const tier: ToppingSizeTier = getToppingTierFromSku(menuItem);

    const modifierSelections = line.modifiers ?? [];
    let pricedModifiers: PricedModifierSnapshot[] = [];
    if (modifierSelections.length > 0) {
      if (!input.modifiersByKey || input.modifiersByKey.size === 0) {
        throw new ApiError(
          400,
          "MODIFIER_NOT_FOUND",
          "Modifier catalog is unavailable for pricing.",
        );
      }
      pricedModifiers = priceModifierSelections({
        selections: modifierSelections,
        optionsByKey: input.modifiersByKey,
        tier,
      });
    }

    const extras: PricedExtraSnapshot[] = pricedModifiers.map((modifier) => ({
      slug: modifier.optionCode,
      label: modifier.optionName,
      price: modifier.priceDelta,
      kind: "modifier" as const,
      groupCode: modifier.groupCode,
      optionCode: modifier.optionCode,
    }));

    // Legacy extras / toppings path when modifiers were not provided
    if (pricedModifiers.length === 0) {
      for (const ref of collectExtraRefs(line)) {
        let catalogItem: CatalogMenuItem | undefined;
        if (ref.slug) {
          catalogItem =
            input.catalog.bySkuSlug.get(ref.slug) ?? input.catalog.byGroupSlug.get(ref.slug)?.[0];
        } else if (ref.label) {
          const needle = ref.label.trim().toLowerCase();
          for (const candidate of input.catalog.bySkuSlug.values()) {
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
            "CATALOG_ITEM_UNAVAILABLE",
            `Topping/addon '${catalogItem.slug}' is currently unavailable.`,
          );
        }

        if (catalogItem.product_type === "topping") {
          const priced = resolveToppingPrice(input.catalog, catalogItem, tier);
          extras.push({
            slug: priced.sku.slug,
            label: catalogItem.name,
            price: priced.price,
            kind: "topping",
          });
        } else {
          extras.push({
            slug: catalogItem.slug,
            label: catalogItem.name,
            price: parseNumber(catalogItem.price),
            kind: "addon",
          });
        }
      }
    }

    const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
    const lineUnitPrice = foodUnitPrice + extrasTotal;
    const lineTotal = lineUnitPrice * line.quantity;
    subtotal += lineTotal;

    pricedLines.push({
      menuItemId: menuItem.id,
      menuItemSlug: menuItem.slug,
      variantId,
      productName: menuItem.name,
      variantName,
      quantity: line.quantity,
      foodUnitPrice,
      extras,
      modifiers: pricedModifiers.map((modifier) => ({
        modifierOptionId: modifier.modifierOptionId,
        groupCode: modifier.groupCode,
        groupName: modifier.groupName,
        optionCode: modifier.optionCode,
        optionName: modifier.optionName,
        priceDelta: modifier.priceDelta,
        sortOrder: modifier.sortOrder,
      })),
      lineUnitPrice,
      lineTotal,
      instructions: line.instructions?.trim() || null,
      extrasSnapshot: extras,
    });
  }

  const rawDiscount = typeof input.discountAmount === "number" && Number.isFinite(input.discountAmount)
    ? Math.max(0, input.discountAmount)
    : 0;
  const discountAmount = Math.min(rawDiscount, subtotal);
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
      engine: "sprint4.2",
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
    if (line.menuItemSlug) slugs.add(line.menuItemSlug);
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

/** Canonical SKU ids referenced directly by the submitted lines. */
export function collectCatalogSkuIds(lines: QuoteLineInput[]): string[] {
  const ids = new Set<string>();
  for (const line of lines) {
    if (line.menuItemId) ids.add(line.menuItemId);
  }
  return [...ids];
}

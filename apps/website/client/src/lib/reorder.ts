/**
 * Reorder mapping: resolve prior order lines against the live catalog.
 * Prices always refresh from catalog — never reuse stale stored unit prices silently.
 */

import type { CartExtra, CartItem } from "@/contexts/CartContext";
import type { StoredOrder, StoredOrderItem } from "@/lib/customer-store";
import type { MenuItem } from "@/lib/telepizza-types";

export type ReorderLineWarning =
  | "unavailable"
  | "variant_unavailable"
  | "price_changed"
  | "missing_slug"
  | "extras_adjusted";

export type ReorderLinePreview = {
  source: StoredOrderItem;
  available: boolean;
  warnings: ReorderLineWarning[];
  cartItem: CartItem | null;
  previousUnitPrice: number;
  refreshedUnitPrice: number | null;
  message: string | null;
};

export type ReorderPreview = {
  order: StoredOrder;
  lines: ReorderLinePreview[];
  availableCount: number;
  unavailableCount: number;
  hasPriceChanges: boolean;
  canAddAny: boolean;
};

function catalogKey(item: MenuItem): string {
  return (item.slug || item.id || "").trim().toLowerCase();
}

/**
 * Resolve a stored order line to an exact sellable SKU.
 *
 * Historical lines were captured before sizes became their own SKUs, so their slug may be a
 * product-family slug qualified by `variantName`. Those still resolve; `skuExact` reports
 * whether the original size was found so the customer can be warned.
 */
function resolveSku(
  catalog: MenuItem[],
  slug: string | undefined,
  variantName: string | undefined,
): { sku: MenuItem; skuExact: boolean } | null {
  if (!slug?.trim()) return null;
  const needle = slug.trim().toLowerCase();

  const direct =
    catalog.find((item) => catalogKey(item) === needle) ??
    catalog.find((item) => item.id.toLowerCase() === needle);
  if (direct) return { sku: direct, skuExact: true };

  const family = catalog.filter((item) => (item.productGroupSlug ?? "").toLowerCase() === needle);
  if (family.length === 0) return null;

  if (variantName?.trim()) {
    const wanted = variantName.trim().toLowerCase();
    const match = family.find((item) => (item.sizeLabel ?? "").trim().toLowerCase() === wanted);
    if (match) return { sku: match, skuExact: true };
    return { sku: family[0]!, skuExact: false };
  }

  return { sku: family[0]!, skuExact: family.length === 1 };
}

function refreshExtras(
  menuItem: MenuItem,
  extras: StoredOrderItem["extras"],
): { extras: CartExtra[]; adjusted: boolean } {
  if (!extras?.length) return { extras: [], adjusted: false };

  const optionIndex = new Map<string, { label: string; price: number; code: string; groupCode: string }>();
  for (const group of menuItem.modifierGroups ?? []) {
    for (const option of group.options) {
      optionIndex.set(option.code.toLowerCase(), {
        label: option.name,
        price: option.priceDelta,
        code: option.code,
        groupCode: group.code,
      });
      optionIndex.set(option.name.trim().toLowerCase(), {
        label: option.name,
        price: option.priceDelta,
        code: option.code,
        groupCode: group.code,
      });
    }
  }

  let adjusted = false;
  const next: CartExtra[] = [];
  for (const extra of extras) {
    const byCode = extra.optionCode
      ? optionIndex.get(extra.optionCode.toLowerCase())
      : undefined;
    const bySlug = extra.slug ? optionIndex.get(extra.slug.toLowerCase()) : undefined;
    const byLabel = optionIndex.get(extra.label.trim().toLowerCase());
    const resolved = byCode ?? bySlug ?? byLabel;
    if (!resolved) {
      adjusted = true;
      continue;
    }
    if (resolved.price !== extra.price || resolved.label !== extra.label) {
      adjusted = true;
    }
    next.push({
      label: resolved.label,
      price: resolved.price,
      slug: resolved.code,
      groupCode: resolved.groupCode,
      optionCode: resolved.code,
    });
  }
  if (next.length !== extras.length) adjusted = true;
  return { extras: next, adjusted };
}

export function buildReorderPreview(
  order: StoredOrder,
  catalog: MenuItem[],
): ReorderPreview {
  const lines: ReorderLinePreview[] = order.items.map((source) => {
    const previousUnitPrice = source.unitPrice;
    if (!source.menuItemSlug) {
      return {
        source,
        available: false,
        warnings: ["missing_slug"],
        cartItem: null,
        previousUnitPrice,
        refreshedUnitPrice: null,
        message: "This item cannot be reordered (saved before catalog linking).",
      };
    }

    const resolved = resolveSku(catalog, source.menuItemSlug, source.variantName);
    if (!resolved) {
      return {
        source,
        available: false,
        warnings: ["unavailable"],
        cartItem: null,
        previousUnitPrice,
        refreshedUnitPrice: null,
        message: `"${source.productName}" is not on the current menu.`,
      };
    }

    const menuItem = resolved.sku;
    const warnings: ReorderLineWarning[] = [];
    if (!resolved.skuExact) {
      warnings.push("variant_unavailable");
    }

    const { extras, adjusted } = refreshExtras(menuItem, source.extras);
    if (adjusted) warnings.push("extras_adjusted");

    const basePrice = menuItem.price;
    const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
    const refreshedUnitPrice = basePrice + extrasTotal;
    if (refreshedUnitPrice !== previousUnitPrice) {
      warnings.push("price_changed");
    }

    const cartItem: CartItem = {
      id: `${catalogKey(menuItem)}-${extras.map((e) => e.optionCode ?? e.slug ?? e.label).join("|") || "plain"}`,
      menuItemId: menuItem.id,
      menuSlug: menuItem.slug || menuItem.id,
      name: menuItem.name,
      price: basePrice,
      quantity: source.quantity,
      category: menuItem.category,
      variant: menuItem.sizeLabel,
      image: menuItem.image,
      description: menuItem.description,
      extras: extras.length ? extras : undefined,
      instructions: source.instructions,
    };

    const messages: string[] = [];
    if (warnings.includes("variant_unavailable")) {
      messages.push(
        `Size "${source.variantName ?? "as ordered"}" is unavailable — using ${menuItem.sizeLabel ?? menuItem.name} instead (review before adding).`,
      );
    }
    if (warnings.includes("extras_adjusted")) {
      messages.push("Some toppings/extras changed or are unavailable — review the refreshed line.");
    }
    if (warnings.includes("price_changed")) {
      messages.push(
        `Price refreshed: was Rs ${previousUnitPrice.toLocaleString()}, now Rs ${refreshedUnitPrice.toLocaleString()}.`,
      );
    }

    return {
      source,
      available: true,
      warnings,
      cartItem,
      previousUnitPrice,
      refreshedUnitPrice,
      message: messages.length ? messages.join(" ") : null,
    };
  });

  const availableCount = lines.filter((line) => line.available && line.cartItem).length;
  return {
    order,
    lines,
    availableCount,
    unavailableCount: lines.length - availableCount,
    hasPriceChanges: lines.some((line) => line.warnings.includes("price_changed")),
    canAddAny: availableCount > 0,
  };
}

/** Cart lines the customer confirmed after review — never silent substitution of unavailable items. */
export function confirmedReorderCartItems(preview: ReorderPreview): CartItem[] {
  return preview.lines
    .filter((line) => line.available && line.cartItem)
    .map((line) => line.cartItem!);
}

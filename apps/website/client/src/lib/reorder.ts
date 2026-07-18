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

function resolveMenuItem(catalog: MenuItem[], slug: string | undefined): MenuItem | null {
  if (!slug?.trim()) return null;
  const needle = slug.trim().toLowerCase();
  return (
    catalog.find((item) => catalogKey(item) === needle) ??
    catalog.find((item) => item.id.toLowerCase() === needle) ??
    null
  );
}

function resolveVariantPrice(
  menuItem: MenuItem,
  variantName: string | undefined,
): { price: number; variantLabel: string | undefined; variantOk: boolean } {
  const variants = menuItem.variants ?? [];
  if (variants.length === 0) {
    return {
      price: menuItem.price ?? 0,
      variantLabel: variantName,
      variantOk: !variantName,
    };
  }

  if (variantName?.trim()) {
    const match = variants.find(
      (variant) => variant.label.trim().toLowerCase() === variantName.trim().toLowerCase(),
    );
    if (match) {
      return { price: match.price, variantLabel: match.label, variantOk: true };
    }
    const fallback = variants.find((variant) => variant.isDefault) ?? variants[0];
    return {
      price: fallback.price,
      variantLabel: fallback.label,
      variantOk: false,
    };
  }

  const preferred = variants.find((variant) => variant.isDefault) ?? variants[0];
  return { price: preferred.price, variantLabel: preferred.label, variantOk: true };
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

    const menuItem = resolveMenuItem(catalog, source.menuItemSlug);
    if (!menuItem) {
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

    const warnings: ReorderLineWarning[] = [];
    const variant = resolveVariantPrice(menuItem, source.variantName);
    if (!variant.variantOk && source.variantName) {
      warnings.push("variant_unavailable");
    }

    const { extras, adjusted } = refreshExtras(menuItem, source.extras);
    if (adjusted) warnings.push("extras_adjusted");

    const basePrice = variant.price;
    const extrasTotal = extras.reduce((sum, extra) => sum + extra.price, 0);
    const refreshedUnitPrice = basePrice + extrasTotal;
    if (refreshedUnitPrice !== previousUnitPrice) {
      warnings.push("price_changed");
    }

    const cartItem: CartItem = {
      id: `${catalogKey(menuItem)}-${variant.variantLabel ?? "standard"}-${extras.map((e) => e.optionCode ?? e.slug ?? e.label).join("|") || "plain"}`,
      menuSlug: menuItem.slug || menuItem.id,
      name: menuItem.name,
      price: basePrice,
      quantity: source.quantity,
      category: menuItem.category,
      variant: variant.variantLabel,
      image: menuItem.image,
      description: menuItem.description,
      extras: extras.length ? extras : undefined,
      instructions: source.instructions,
    };

    const messages: string[] = [];
    if (warnings.includes("variant_unavailable")) {
      messages.push(
        `Size/variant "${source.variantName}" is unavailable — using ${variant.variantLabel ?? "standard"} instead (review before adding).`,
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

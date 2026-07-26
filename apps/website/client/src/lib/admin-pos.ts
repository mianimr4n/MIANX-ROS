/** POS helpers — map UX modes to supported order types; no invented payments. */

import type { MenuItem, MenuProductGroup } from "@/lib/telepizza-types";

export type PosChannelMode = "dine-in" | "takeaway" | "phone" | "walk-in" | "delivery";

export type PosOrderType = "delivery" | "pickup" | "dine-in";

export type PosCartLine = {
  key: string;
  /** Exact sellable SKU id the server must price. */
  menuItemId: string;
  menuItemSlug: string;
  productName: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
  instructions?: string;
  modifiers?: Array<{ groupCode: string; optionCode: string; label: string; priceDelta: number }>;
  image?: string;
};

export function channelToOrderType(channel: PosChannelMode): PosOrderType {
  switch (channel) {
    case "dine-in":
      return "dine-in";
    case "delivery":
    case "phone":
      return "delivery";
    case "takeaway":
    case "walk-in":
    default:
      return "pickup";
  }
}

export function channelLabel(channel: PosChannelMode): string {
  const map: Record<PosChannelMode, string> = {
    "dine-in": "Dine-In",
    takeaway: "Takeaway",
    phone: "Phone Order",
    "walk-in": "Walk-in",
    delivery: "Delivery",
  };
  return map[channel];
}

/** The SKU a POS tile represents by default: the family's first (smallest/lowest sort) option. */
export function defaultSku(group: MenuProductGroup): MenuItem | null {
  return group.options[0] ?? null;
}

export function displayPrice(group: MenuProductGroup): number {
  return defaultSku(group)?.price ?? 0;
}

export function itemHasModifiers(item: MenuItem): boolean {
  return Boolean(item.modifierGroups && item.modifierGroups.length > 0);
}

/** A tile opens the configurator when the cashier must pick a SKU or a required modifier. */
export function itemNeedsConfiguration(group: MenuProductGroup): boolean {
  const multipleSkus = group.options.length > 1;
  const requiredMods = group.options.some((sku) =>
    (sku.modifierGroups ?? []).some((g) => g.isRequired || g.minSelect > 0),
  );
  return multipleSkus || requiredMods;
}

export function lineUnitPrice(line: PosCartLine): number {
  const mods = line.modifiers?.reduce((sum, m) => sum + m.priceDelta, 0) ?? 0;
  return line.unitPrice + mods;
}

export function lineTotal(line: PosCartLine): number {
  return lineUnitPrice(line) * line.quantity;
}

export function cartSubtotal(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function currentShiftLabel(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Karachi",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value ?? "12",
  );
  if (hour < 16) return "Day shift (display only)";
  return "Evening shift (display only)";
}

export function mapCategoryBucket(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("pizza")) return "Pizza";
  if (n.includes("deal") || n.includes("combo")) return "Deals";
  if (n.includes("side") || n.includes("fries") || n.includes("garlic")) return "Sides";
  if (n.includes("drink") || n.includes("beverage") || n.includes("dip")) return "Drinks";
  if (n.includes("dessert") || n.includes("sweet")) return "Desserts";
  return "Extras";
}

export const POS_SIDEBAR_BUCKETS = ["Pizza", "Deals", "Sides", "Drinks", "Desserts", "Extras"] as const;

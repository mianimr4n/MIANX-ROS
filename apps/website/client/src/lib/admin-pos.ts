/** POS helpers — map UX modes to supported order types; no invented payments. */

import type { MenuItem, MenuVariant } from "@/lib/telepizza-types";

export type PosChannelMode = "dine-in" | "takeaway" | "phone" | "walk-in" | "delivery";

export type PosOrderType = "delivery" | "pickup" | "dine-in";

export type PosCartLine = {
  key: string;
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

export function defaultVariant(item: MenuItem): MenuVariant | null {
  if (!item.variants || item.variants.length === 0) return null;
  return item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null;
}

export function displayPrice(item: MenuItem): number {
  const variant = defaultVariant(item);
  if (variant) return variant.price;
  return item.price ?? 0;
}

export function itemHasModifiers(item: MenuItem): boolean {
  return Boolean(item.modifierGroups && item.modifierGroups.length > 0);
}

export function itemNeedsConfiguration(item: MenuItem): boolean {
  const multiVariant = (item.variants?.length ?? 0) > 1;
  const requiredMods = (item.modifierGroups ?? []).some((g) => g.isRequired || g.minSelect > 0);
  return multiVariant || requiredMods;
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

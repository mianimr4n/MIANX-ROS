import { ApiError } from "../../common/http.js";
import type { ToppingSizeTier } from "./pricing.js";

export interface ModifierOptionRow {
  id: string;
  code: string;
  name: string;
  price_delta: number | string;
  price_delta_by_size: Partial<Record<ToppingSizeTier, number>> | null;
  size_code: string | null;
  linked_menu_item_id: string | null;
  is_active: boolean;
  sort_order: number;
  group: {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
  } | null;
}

export interface ModifierSelectionInput {
  groupCode: string;
  optionCode: string;
}

export interface PricedModifierSnapshot {
  modifierOptionId: string;
  groupCode: string;
  groupName: string;
  optionCode: string;
  optionName: string;
  priceDelta: number;
  sortOrder: number;
  /** For extras_snapshot backward compatibility */
  linkedMenuItemSlug?: string | null;
}

function parseNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function resolveModifierPriceDelta(
  option: Pick<ModifierOptionRow, "price_delta" | "price_delta_by_size">,
  tier: ToppingSizeTier,
): number {
  const bySize = option.price_delta_by_size?.[tier];
  if (typeof bySize === "number" && Number.isFinite(bySize)) {
    return bySize;
  }
  return parseNumber(option.price_delta);
}

/**
 * Price selected modifiers from a preloaded option map keyed by `${groupCode}::${optionCode}`.
 */
export function priceModifierSelections(input: {
  selections: ModifierSelectionInput[];
  optionsByKey: Map<string, ModifierOptionRow>;
  tier: ToppingSizeTier;
}): PricedModifierSnapshot[] {
  const priced: PricedModifierSnapshot[] = [];

  for (const selection of input.selections) {
    const key = `${selection.groupCode}::${selection.optionCode}`;
    const option = input.optionsByKey.get(key);
    if (!option || !option.group) {
      throw new ApiError(
        400,
        "MODIFIER_NOT_FOUND",
        `Modifier '${selection.groupCode}/${selection.optionCode}' was not found.`,
      );
    }
    if (!option.is_active || !option.group.is_active) {
      throw new ApiError(
        400,
        "MODIFIER_UNAVAILABLE",
        `Modifier '${selection.optionCode}' is currently unavailable.`,
      );
    }

    priced.push({
      modifierOptionId: option.id,
      groupCode: option.group.code,
      groupName: option.group.name,
      optionCode: option.code,
      optionName: option.name,
      priceDelta: resolveModifierPriceDelta(option, input.tier),
      sortOrder: option.sort_order,
    });
  }

  return priced.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function modifierSelectionKey(groupCode: string, optionCode: string): string {
  return `${groupCode}::${optionCode}`;
}

import {
  getStaticModifierGroupsForItem,
  resolveModifierOptionPrice,
  type ModifierGroupDef,
  type ModifierOptionDef,
  type ModifierSizeTier,
} from "@/data/modifier-catalog";
import { getToppingTierFromVariantLabel } from "@/data/cart-config";
import type { MenuItem } from "@/lib/telepizza-types";

export type { ModifierGroupDef, ModifierOptionDef, ModifierSizeTier };

export interface SelectedModifier {
  groupCode: string;
  groupName: string;
  optionCode: string;
  optionName: string;
  priceDelta: number;
  linkedMenuItemSlug?: string;
}

export function getModifierGroupsForItem(item: MenuItem): ModifierGroupDef[] {
  if (item.modifierGroups && item.modifierGroups.length > 0) {
    return item.modifierGroups as ModifierGroupDef[];
  }
  const slug = item.slug ?? item.id;
  return getStaticModifierGroupsForItem(slug);
}

export function resolveOptionPriceForTier(
  option: ModifierOptionDef,
  sizeTier: ModifierSizeTier,
  catalogItems: MenuItem[] = [],
): number {
  if (option.linkedMenuItemSlug) {
    const linked = catalogItems.find(
      (entry) => entry.id === option.linkedMenuItemSlug || entry.slug === option.linkedMenuItemSlug,
    );
    if (linked?.variants?.length) {
      const byCode = linked.variants.find((variant) => variant.sizeCode === sizeTier);
      if (byCode) return byCode.price;
      const byLabel = linked.variants.find((variant) =>
        variant.label.toLowerCase().includes(sizeTier),
      );
      if (byLabel) return byLabel.price;
      if (!option.priceDeltaBySize && linked.price != null) return linked.price;
    } else if (linked?.price != null && !option.priceDeltaBySize) {
      return linked.price;
    }
  }
  return resolveModifierOptionPrice(option, sizeTier);
}

export function sizeTierFromVariantLabel(label: string | undefined): ModifierSizeTier {
  if (!label) return "small";
  return getToppingTierFromVariantLabel(label);
}

export function buildSelectedModifiers(input: {
  groups: ModifierGroupDef[];
  /** Map groupCode -> selected option codes */
  selections: Record<string, string[]>;
  sizeTier: ModifierSizeTier;
  catalogItems?: MenuItem[];
}): SelectedModifier[] {
  const selected: SelectedModifier[] = [];
  for (const group of input.groups) {
    const codes = input.selections[group.code] ?? [];
    for (const optionCode of codes) {
      const option = group.options.find((entry) => entry.code === optionCode);
      if (!option) continue;
      selected.push({
        groupCode: group.code,
        groupName: group.name,
        optionCode: option.code,
        optionName: option.name,
        priceDelta: resolveOptionPriceForTier(option, input.sizeTier, input.catalogItems),
        linkedMenuItemSlug: option.linkedMenuItemSlug,
      });
    }
  }
  return selected;
}

export function validateModifierSelections(
  groups: ModifierGroupDef[],
  selections: Record<string, string[]>,
): string | null {
  for (const group of groups) {
    const selected = selections[group.code] ?? [];
    const min = group.minSelect;
    const max = group.maxSelect;
    if (group.isRequired && selected.length < Math.max(min, 1)) {
      return `Please choose ${group.name}.`;
    }
    if (selected.length < min) {
      return `Select at least ${min} option(s) for ${group.name}.`;
    }
    if (max != null && selected.length > max) {
      return `Select at most ${max} option(s) for ${group.name}.`;
    }
  }
  return null;
}

export function defaultSelectionsForGroups(groups: ModifierGroupDef[]): Record<string, string[]> {
  const selections: Record<string, string[]> = {};
  for (const group of groups) {
    const defaults = group.options.filter((option) => option.isDefault).map((option) => option.code);
    if (defaults.length > 0) {
      selections[group.code] = group.selectionType === "single" ? [defaults[0]] : defaults;
    } else if (group.isRequired && group.selectionType === "single" && group.options[0]) {
      selections[group.code] = [group.options[0].code];
    } else {
      selections[group.code] = [];
    }
  }
  return selections;
}

export function toggleGroupOption(input: {
  group: ModifierGroupDef;
  current: string[];
  optionCode: string;
  checked: boolean;
}): string[] {
  if (input.group.selectionType === "single") {
    if (!input.checked) {
      if (input.group.isRequired) return input.current;
      return [];
    }
    return [input.optionCode];
  }

  if (input.checked) {
    if (input.current.includes(input.optionCode)) return input.current;
    const next = [...input.current, input.optionCode];
    if (input.group.maxSelect != null && next.length > input.group.maxSelect) {
      return next.slice(next.length - input.group.maxSelect);
    }
    return next;
  }
  return input.current.filter((code) => code !== input.optionCode);
}

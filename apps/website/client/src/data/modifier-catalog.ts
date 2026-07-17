/**
 * Static modifier catalog — mirrors supabase migration seed
 * `20260718120000_product_modifier_system.sql` for offline / bundled website use.
 * Source of truth for Admin CRUD is the database; this file is the fallback only.
 */

export type ModifierSelectionType = "single" | "multi";
export type ModifierSizeTier = "small" | "medium" | "large";

export interface ModifierOptionDef {
  code: string;
  name: string;
  priceDelta: number;
  priceDeltaBySize?: Partial<Record<ModifierSizeTier, number>>;
  sizeCode?: ModifierSizeTier;
  /** Linked browse/menu slug for drinks/sides/topping SKUs */
  linkedMenuItemSlug?: string;
  isDefault?: boolean;
  sortOrder: number;
}

export interface ModifierGroupDef {
  code: string;
  name: string;
  description?: string;
  selectionType: ModifierSelectionType;
  minSelect: number;
  maxSelect: number | null;
  isRequired: boolean;
  sortOrder: number;
  options: ModifierOptionDef[];
}

/** Groups attached to pizza catalog items (size stays on variants). */
export const PIZZA_MODIFIER_GROUP_CODES = [
  "crust",
  "extra-chicken",
  "extra-cheese",
  "extra-vegetables",
  "extra-toppings",
  "add-drinks",
  "add-sides",
] as const;

export const PIZZA_MENU_SLUGS = [
  "tele-special",
  "peri-peri",
  "bihari-kabab",
  "kababish",
  "tikka",
  "bonfire",
  "chicken-supreme",
  "real-fajita",
  "mexicana",
  "cheese-lover",
  "chicago-extreme",
  "crown-crust",
  "stuffed-crust",
  "tele-extreme",
  "sixteen-inch-incher",
] as const;

export const STATIC_MODIFIER_GROUPS: ModifierGroupDef[] = [
  {
    code: "size",
    name: "Size",
    description: "Reusable size group for items without variants",
    selectionType: "single",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    sortOrder: 10,
    options: [
      { code: "small", name: "6 inch Small", priceDelta: 0, sizeCode: "small", isDefault: true, sortOrder: 1 },
      { code: "medium", name: "9 inch Medium", priceDelta: 0, sizeCode: "medium", sortOrder: 2 },
      { code: "large", name: "12 inch Large", priceDelta: 0, sizeCode: "large", sortOrder: 3 },
    ],
  },
  {
    code: "crust",
    name: "Crust",
    selectionType: "single",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    sortOrder: 20,
    options: [
      { code: "classic", name: "Classic Crust", priceDelta: 0, isDefault: true, sortOrder: 1 },
      { code: "thin", name: "Thin Crust", priceDelta: 0, sortOrder: 2 },
      { code: "thick", name: "Thick Crust", priceDelta: 50, sortOrder: 3 },
      { code: "cheese-burst", name: "Cheese Burst Crust", priceDelta: 150, sortOrder: 4 },
    ],
  },
  {
    code: "extra-chicken",
    name: "Extra chicken",
    selectionType: "multi",
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    sortOrder: 30,
    options: [
      {
        code: "extra-chicken",
        name: "Extra Chicken",
        priceDelta: 50,
        priceDeltaBySize: { small: 50, medium: 100, large: 150 },
        linkedMenuItemSlug: "extra-chicken",
        sortOrder: 1,
      },
    ],
  },
  {
    code: "extra-cheese",
    name: "Extra cheese",
    selectionType: "multi",
    minSelect: 0,
    maxSelect: 3,
    isRequired: false,
    sortOrder: 40,
    options: [
      {
        code: "extra-cheese",
        name: "Extra Cheese",
        priceDelta: 50,
        priceDeltaBySize: { small: 50, medium: 100, large: 150 },
        linkedMenuItemSlug: "extra-cheese",
        sortOrder: 1,
      },
      {
        code: "extra-cheese-slice",
        name: "Extra Cheese Slice",
        priceDelta: 50,
        linkedMenuItemSlug: "extra-cheese-slice",
        sortOrder: 2,
      },
    ],
  },
  {
    code: "extra-vegetables",
    name: "Extra vegetables",
    selectionType: "multi",
    minSelect: 0,
    maxSelect: 8,
    isRequired: false,
    sortOrder: 50,
    options: [
      { code: "olives", name: "Olives", priceDelta: 40, sortOrder: 1 },
      { code: "mushrooms", name: "Mushrooms", priceDelta: 40, sortOrder: 2 },
      { code: "onions", name: "Onions", priceDelta: 30, sortOrder: 3 },
      { code: "bell-peppers", name: "Bell Peppers", priceDelta: 30, sortOrder: 4 },
      { code: "jalapenos", name: "Jalapeños", priceDelta: 40, sortOrder: 5 },
      { code: "sweet-corn", name: "Sweet Corn", priceDelta: 30, sortOrder: 6 },
      { code: "tomatoes", name: "Tomatoes", priceDelta: 30, sortOrder: 7 },
    ],
  },
  {
    code: "extra-toppings",
    name: "Extra toppings",
    selectionType: "multi",
    minSelect: 0,
    maxSelect: 6,
    isRequired: false,
    sortOrder: 60,
    options: [
      { code: "pepperoni", name: "Pepperoni", priceDelta: 80, sortOrder: 1 },
      { code: "smoked-chicken", name: "Smoked Chicken", priceDelta: 80, sortOrder: 2 },
      { code: "bbq-chicken", name: "BBQ Chicken", priceDelta: 80, sortOrder: 3 },
    ],
  },
  {
    code: "add-drinks",
    name: "Add drinks",
    selectionType: "single",
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    sortOrder: 70,
    options: [
      { code: "drink-345ml", name: "Drink 345ml", priceDelta: 70, linkedMenuItemSlug: "drink-345ml", sortOrder: 1 },
      { code: "drink-500ml", name: "Drink 500ml", priceDelta: 100, linkedMenuItemSlug: "drink-500ml", sortOrder: 2 },
      { code: "drink-1l", name: "Drink 1L", priceDelta: 150, linkedMenuItemSlug: "drink-1l", sortOrder: 3 },
      { code: "drink-1-5l", name: "Drink 1.5L", priceDelta: 200, linkedMenuItemSlug: "drink-1-5l", sortOrder: 4 },
    ],
  },
  {
    code: "add-sides",
    name: "Add sides",
    selectionType: "single",
    minSelect: 0,
    maxSelect: 1,
    isRequired: false,
    sortOrder: 80,
    options: [
      { code: "french-fries", name: "French Fries", priceDelta: 199, linkedMenuItemSlug: "french-fries", sortOrder: 1 },
      { code: "family-fries", name: "Family Fries", priceDelta: 449, linkedMenuItemSlug: "family-fries", sortOrder: 2 },
      { code: "loaded-fries", name: "Loaded Fries", priceDelta: 399, linkedMenuItemSlug: "loaded-fries", sortOrder: 3 },
    ],
  },
];

export function getStaticModifierGroupsForItem(menuSlug: string): ModifierGroupDef[] {
  if (!(PIZZA_MENU_SLUGS as readonly string[]).includes(menuSlug)) {
    return [];
  }
  return STATIC_MODIFIER_GROUPS.filter((group) =>
    (PIZZA_MODIFIER_GROUP_CODES as readonly string[]).includes(group.code),
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveModifierOptionPrice(
  option: Pick<ModifierOptionDef, "priceDelta" | "priceDeltaBySize">,
  sizeTier: ModifierSizeTier = "small",
): number {
  const bySize = option.priceDeltaBySize?.[sizeTier];
  if (typeof bySize === "number" && Number.isFinite(bySize)) {
    return bySize;
  }
  return option.priceDelta;
}

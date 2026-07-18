/**
 * GENERATED FILE — do not edit prices by hand.
 *
 * Source of truth: data/catalog/telepizza-canonical-menu.json
 * Generator: node scripts/generate-menu-fallback-from-canonical.mjs
 * Live path: Supabase / API via MenuCatalogContext (preferred).
 * This file is the offline emergency fallback only (priced copy of canonical).
 *
 * Manifest status: BLOCKED_OWNER_EVIDENCE_REQUIRED
 * Generated from canonical dated: 2026-07-18
 */
import type { MenuItem, MenuVariant } from "@/lib/telepizza-types";
import { withMenuItemImages } from "@/lib/menu-images";

export type MenuSize = "Small" | "Medium" | "Large";
export type { MenuItem, MenuVariant } from "@/lib/telepizza-types";

/** Customer browse categories only (13 + All). Toppings are internal catalog SKUs, not a menu tab. */
export const menuCategories = [
  "All",
  "Signature Pizzas",
  "Classic Pizzas",
  "Specialty Pizzas",
  "Burgers",
  "Sandwiches",
  "Wings",
  "Fries",
  "Wraps & Rolls",
  "Pasta",
  "Chicken & Sides",
  "Dips",
  "Drinks",
  "Deals",
] as const;

const baseMenuItems: MenuItem[] = [
  {
    id: "tele-special",
    name: "Tele Special",
    category: "Signature Pizzas",
    description:
      "Special chicken with special sauce, topped with olive, mushroom & capsicum.",
    image: "/images/menu-pizza.jpg",
    badge: "Signature",
    featured: true,
    variants: [
    { label: "6 inch Small", price: 499, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 950, sizeCode: "medium" },
    { label: "12 inch Large", price: 1570, sizeCode: "large" },
  ],
  },
  {
    id: "peri-peri",
    name: "Peri Peri",
    category: "Signature Pizzas",
    description:
      "Peri peri sauce with tikka chicken topped with kabab, sausages & tomato.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 499, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 950, sizeCode: "medium" },
    { label: "12 inch Large", price: 1570, sizeCode: "large" },
  ],
  },
  {
    id: "bihari-kabab",
    name: "Bihari Kabab",
    category: "Signature Pizzas",
    description:
      "Garlic sauce with tikka chicken topped kabab slice, onion & mushroom.",
    image: "/images/menu-pizza.jpg",
    badge: "Hot",
    variants: [
    { label: "6 inch Small", price: 499, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 950, sizeCode: "medium" },
    { label: "12 inch Large", price: 1570, sizeCode: "large" },
  ],
  },
  {
    id: "kababish",
    name: "Kababish",
    category: "Signature Pizzas",
    description:
      "Special sauce with fajita chicken topped with kabab mushroom & capsicum.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 499, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 950, sizeCode: "medium" },
    { label: "12 inch Large", price: 1570, sizeCode: "large" },
  ],
  },
  {
    id: "tikka",
    name: "Tikka",
    category: "Classic Pizzas",
    description:
      "Tikka sauce with tikka chicken topped with olive & onion.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 470, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 890, sizeCode: "medium" },
    { label: "12 inch Large", price: 1470, sizeCode: "large" },
  ],
  },
  {
    id: "bonfire",
    name: "Bonfire",
    category: "Classic Pizzas",
    description:
      "Bonfire sauce with fajita chicken topped with jalapeno, mushroom & tomato.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 470, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 890, sizeCode: "medium" },
    { label: "12 inch Large", price: 1470, sizeCode: "large" },
  ],
  },
  {
    id: "chicken-supreme",
    name: "Chicken Supreme",
    category: "Classic Pizzas",
    description:
      "Original red base sauce, three types of chicken topped with olive, mushroom jalapeno & capsicum.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 470, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 890, sizeCode: "medium" },
    { label: "12 inch Large", price: 1470, sizeCode: "large" },
  ],
  },
  {
    id: "real-fajita",
    name: "Real Fajita",
    category: "Classic Pizzas",
    description:
      "Fajita sauce with fajita chicken topped with onion & capsicum.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 470, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 890, sizeCode: "medium" },
    { label: "12 inch Large", price: 1470, sizeCode: "large" },
  ],
  },
  {
    id: "mexicana",
    name: "Mexicana",
    category: "Classic Pizzas",
    description:
      "Special sauce with smoked chicken topped with sausages, black olive, tomato & capsicum.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 470, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 890, sizeCode: "medium" },
    { label: "12 inch Large", price: 1470, sizeCode: "large" },
  ],
  },
  {
    id: "cheese-lover",
    name: "Cheese Lover",
    category: "Classic Pizzas",
    description:
      "Original red base sauce loaded with mozzarella cheese.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "6 inch Small", price: 470, sizeCode: "small", isDefault: true },
    { label: "9 inch Medium", price: 890, sizeCode: "medium" },
    { label: "12 inch Large", price: 1470, sizeCode: "large" },
  ],
  },
  {
    id: "chicago-extreme",
    name: "Chicago Extreme",
    category: "Specialty Pizzas",
    description:
      "Double layers extreme pizza with 2 premium sauces, lots of cheese & chicken.",
    image: "/images/menu-pizza.jpg",
    variants: [
    { label: "Medium", price: 1199, sizeCode: "medium", isDefault: true },
    { label: "Large", price: 1899, sizeCode: "large" },
  ],
  },
  {
    id: "crown-crust",
    name: "Crown Crust",
    category: "Specialty Pizzas",
    description:
      "Any flavour with chicken stuffing on edges & Tele Pizza signature sauce.",
    image: "/images/menu-pizza.jpg",
    badge: "Chef Special",
    featured: true,
    variants: [
    { label: "Medium", price: 1199, sizeCode: "medium", isDefault: true },
    { label: "Large", price: 1799, sizeCode: "large" },
  ],
  },
  {
    id: "stuffed-crust",
    name: "Stuffed Crust",
    category: "Specialty Pizzas",
    description:
      "Any flavour with kabab stuffing on edges.",
    image: "/images/menu-pizza.jpg",
    price: 1749,
  },
  {
    id: "tele-extreme",
    name: "Tele Extreme Pizza",
    category: "Specialty Pizzas",
    description:
      "2 premium sauces with loaded chicken & lots of cheese.",
    image: "/images/menu-pizza.jpg",
    price: 1699,
  },
  {
    id: "sixteen-inch-incher",
    name: "16\" Incher",
    category: "Specialty Pizzas",
    description:
      "Sixteen-inch specialty pizza.",
    image: "/images/menu-pizza.jpg",
    price: 2399,
  },
  {
    id: "zinger-burger",
    name: "Zinger Burger",
    category: "Burgers",
    description:
      "Crispy zinger burger.",
    image: "/images/menu-burger.jpg",
    badge: "Popular",
    featured: true,
    price: 450,
  },
  {
    id: "patty-burger",
    name: "Patty Burger",
    category: "Burgers",
    description:
      "Tele Pizza patty burger.",
    image: "/images/menu-burger.jpg",
    price: 299,
  },
  {
    id: "crunchy-sandwich",
    name: "Crunchy Sandwich",
    category: "Sandwiches",
    description:
      "Served with dip sauce & fries.",
    image: "/images/sides-platter.jpg",
    price: 799,
  },
  {
    id: "special-sandwich",
    name: "Special Sandwich",
    category: "Sandwiches",
    description:
      "Served with dip sauce & fries.",
    image: "/images/sides-platter.jpg",
    price: 749,
  },
  {
    id: "baked-smoked-sandwich",
    name: "Baked Smoked",
    category: "Sandwiches",
    description:
      "Served with dip sauce & fries.",
    image: "/images/sides-platter.jpg",
    price: 749,
  },
  {
    id: "sizzling-sandwich",
    name: "Sizzling Sandwich",
    category: "Sandwiches",
    description:
      "Served with dip sauce & fries.",
    image: "/images/sides-platter.jpg",
    price: 749,
  },
  {
    id: "jumbo-wrap",
    name: "Tele Pizza Special Jumbo Wrap",
    category: "Wraps & Rolls",
    description:
      "Tele Pizza special jumbo wrap.",
    image: "/images/sides-platter.jpg",
    price: 649,
  },
  {
    id: "crunchy-wrap",
    name: "Crunchy Wrap",
    category: "Wraps & Rolls",
    description:
      "Crunchy chicken wrap.",
    image: "/images/sides-platter.jpg",
    price: 399,
  },
  {
    id: "dynamite-wrap",
    name: "Dynamite Wrap",
    category: "Wraps & Rolls",
    description:
      "Dynamite-flavoured wrap.",
    image: "/images/sides-platter.jpg",
    price: 399,
  },
  {
    id: "behari-roll",
    name: "Behari Roll",
    category: "Wraps & Rolls",
    description:
      "4 pcs special chicken with special sauce, wrapped in crispy tortilla baked with lots of cheese, mushroom & olives, served with dip sauce & fries.",
    image: "/images/sides-platter.jpg",
    price: 799,
  },
  {
    id: "crunchy-pasta",
    name: "Crunchy Pasta",
    category: "Pasta",
    description:
      "Crunchy pasta.",
    image: "/images/pasta-dish.jpg",
    badge: "Hot",
    price: 849,
  },
  {
    id: "special-pasta",
    name: "Special Pasta / Flaming Pasta",
    category: "Pasta",
    description:
      "Special flaming pasta.",
    image: "/images/pasta-dish.jpg",
    price: 749,
  },
  {
    id: "fried-crispy-wings",
    name: "Fried & Crispy",
    category: "Wings",
    description:
      "Crispy fried chicken wings.",
    image: "/images/sides-platter.jpg",
    price: 599,
  },
  {
    id: "bbq-wings",
    name: "BBQ",
    category: "Wings",
    description:
      "BBQ-flavoured chicken wings.",
    image: "/images/sides-platter.jpg",
    price: 599,
  },
  {
    id: "creamo-wings",
    name: "Creamo",
    category: "Wings",
    description:
      "Creamy-style chicken wings.",
    image: "/images/sides-platter.jpg",
    price: 599,
  },
  {
    id: "oven-baked-wings",
    name: "Oven Baked",
    category: "Wings",
    description:
      "Oven-baked chicken wings.",
    image: "/images/sides-platter.jpg",
    price: 549,
  },
  {
    id: "flaming-wings",
    name: "Flaming",
    category: "Wings",
    description:
      "Spicy flaming chicken wings.",
    image: "/images/sides-platter.jpg",
    price: 549,
  },
  {
    id: "loaded-fries",
    name: "Loaded Fries",
    category: "Fries",
    description:
      "Loaded fries.",
    image: "/images/sides-platter.jpg",
    price: 650,
  },
  {
    id: "french-fries",
    name: "French Fries",
    category: "Fries",
    description:
      "French fries.",
    image: "/images/sides-platter.jpg",
    price: 199,
  },
  {
    id: "family-fries",
    name: "Family Fries",
    category: "Fries",
    description:
      "Family-size fries.",
    image: "/images/sides-platter.jpg",
    price: 350,
  },
  {
    id: "chicken-tender-strips",
    name: "Chicken Tender Strips",
    category: "Chicken & Sides",
    description:
      "5 pcs juicy chicken tender strips with blend of spices, served with secret delicious dip sauce.",
    image: "/images/sides-platter.jpg",
    price: 590,
  },
  {
    id: "crispy-box",
    name: "Crispy Box",
    category: "Chicken & Sides",
    description:
      "3 pcs crispy chicken (1 Chest, 1 Drum, 1 Wing) with 1 Garlic Ranch.",
    image: "/images/sides-platter.jpg",
    price: 670,
  },
  {
    id: "fried-chicken-chest",
    name: "Fried Chicken (Chest)",
    category: "Chicken & Sides",
    description:
      "Fried chicken chest piece.",
    image: "/images/sides-platter.jpg",
    price: 250,
  },
  {
    id: "fried-chicken",
    name: "Fried Chicken",
    category: "Chicken & Sides",
    description:
      "Fried chicken piece.",
    image: "/images/sides-platter.jpg",
    price: 220,
  },
  {
    id: "nuggets",
    name: "Nuggets",
    category: "Chicken & Sides",
    description:
      "10 pieces.",
    image: "/images/sides-platter.jpg",
    price: 449,
  },
  {
    id: "hot-shots",
    name: "Hot Shots",
    category: "Chicken & Sides",
    description:
      "10 pieces.",
    image: "/images/sides-platter.jpg",
    price: 449,
  },
  {
    id: "special-sauce-dip",
    name: "Special Sauce",
    category: "Dips",
    description:
      "Tele Pizza special sauce dip.",
    image: "/images/sides-platter.jpg",
    price: 50,
  },
  {
    id: "bone-fire-dip",
    name: "Bone Fire",
    category: "Dips",
    description:
      "Bone fire sauce dip.",
    image: "/images/sides-platter.jpg",
    price: 50,
  },
  {
    id: "dip-sauce",
    name: "Dip Sauce",
    category: "Dips",
    description:
      "Classic dip sauce.",
    image: "/images/sides-platter.jpg",
    price: 50,
  },
  {
    id: "garlic-ranch-dip",
    name: "Garlic Ranch",
    category: "Dips",
    description:
      "Garlic ranch dip.",
    image: "/images/sides-platter.jpg",
    price: 50,
  },
  {
    id: "drink-1-5l",
    name: "1.5 Liter",
    category: "Drinks",
    description:
      "1.5 liter soft drink.",
    image: "/images/desserts-drinks.jpg",
    price: 210,
  },
  {
    id: "drink-1l",
    name: "1 Liter",
    category: "Drinks",
    description:
      "1 liter soft drink.",
    image: "/images/desserts-drinks.jpg",
    price: 170,
  },
  {
    id: "drink-500ml",
    name: "500 ml",
    category: "Drinks",
    description:
      "500 ml soft drink.",
    image: "/images/desserts-drinks.jpg",
    price: 110,
  },
  {
    id: "drink-345ml",
    name: "345 ml",
    category: "Drinks",
    description:
      "345 ml soft drink.",
    image: "/images/desserts-drinks.jpg",
    price: 70,
  },
  {
    id: "large-water",
    name: "Large Water",
    category: "Drinks",
    description:
      "Large bottled water.",
    image: "/images/desserts-drinks.jpg",
    price: 99,
  },
  {
    id: "small-water",
    name: "Small Water",
    category: "Drinks",
    description:
      "Small bottled water.",
    image: "/images/desserts-drinks.jpg",
    price: 50,
  },
  {
    id: "family-deal",
    name: "Family Deal",
    category: "Deals",
    description:
      "1 Large Pizza + 10 Pcs Wings + 1.5 Liter Drink.",
    image: "/images/promos/family-deal.jpg",
    featured: true,
    price: 2250,
  },
  {
    id: "pizza-fest",
    name: "Pizza Fest",
    category: "Deals",
    description:
      "1 Large Pizza + 1.5 Liter Drink.",
    image: "/images/promos/pizza-fest.jpg",
    badge: "Hot",
    featured: true,
    price: 1680,
  },
  {
    id: "mega-offer",
    name: "Mega Offer",
    category: "Deals",
    description:
      "2 Large Pizza + 1.5 Liter Coke.",
    image: "/images/products/deal-combo.jpg",
    price: 3140,
  },
  {
    id: "pair-deal",
    name: "Pair Deal",
    category: "Deals",
    description:
      "2 Medium Pizza + 1.5 Liter Coke.",
    image: "/images/promos/pair-deal.jpg",
    badge: "Hot",
    featured: true,
    price: 1999,
  },
  {
    id: "family-festival",
    name: "Family Festival",
    category: "Deals",
    description:
      "5 Zinger Burger + 1.5 Drink.",
    image: "/images/products/deal-combo.jpg",
    price: 2350,
  },
  {
    id: "deal-for-two",
    name: "Deal for 2",
    category: "Deals",
    description:
      "2 Zinger Burger + 2 Drink 345ml.",
    image: "/images/products/deal-combo.jpg",
    price: 999,
  },
  {
    id: "knock-out-deal",
    name: "Knock Out Deal",
    category: "Deals",
    description:
      "3 Zinger Burger + 1 Liter Drink.",
    image: "/images/promos/knock-out-deal.jpg",
    price: 1440,
  },
  {
    id: "extra-chicken",
    name: "Extra Chicken",
    category: "Toppings",
    categorySlug: "toppings",
    description:
      "Extra chicken topping for pizza. Size tier matches small / medium / large pizza.",
    image: "/images/menu-pizza.jpg",
    productType: "topping",
    variants: [
    { label: "Small", price: 50, sizeCode: "small", isDefault: true },
    { label: "Medium", price: 100, sizeCode: "medium" },
    { label: "Large", price: 150, sizeCode: "large" },
  ],
  },
  {
    id: "extra-cheese",
    name: "Extra Cheese",
    category: "Toppings",
    categorySlug: "toppings",
    description:
      "Extra cheese topping for pizza. Size tier matches small / medium / large pizza.",
    image: "/images/menu-pizza.jpg",
    productType: "topping",
    variants: [
    { label: "Small", price: 50, sizeCode: "small", isDefault: true },
    { label: "Medium", price: 100, sizeCode: "medium" },
    { label: "Large", price: 150, sizeCode: "large" },
  ],
  },
  {
    id: "extra-cheese-slice",
    name: "Extra Cheese Slice",
    category: "Toppings",
    categorySlug: "toppings",
    description:
      "Extra cheese slice topping for pizza (single verified price).",
    image: "/images/menu-pizza.jpg",
    productType: "topping",
    price: 60,
  },
];

export const menuItems: MenuItem[] = withMenuItemImages(baseMenuItems);

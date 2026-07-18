/**
 * Builds data/catalog/telepizza-canonical-menu.json from verified evidence only.
 * Sources: prod API export (optional), owner sync migration, REAL_MENU_EXTRACTED,
 * BFR-001 hybrid decision. Does NOT invent SKUs or prices.
 *
 * Usage:
 *   node scripts/build-canonical-menu.mjs
 *   node scripts/build-canonical-menu.mjs --from-prod   # enrich evidence stamp from live API
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "data", "catalog", "telepizza-canonical-menu.json");
const fromProd = process.argv.includes("--from-prod");

const GM = {
  signature: { small: 620, medium: 1250, large: 1890, mediumLabel: '10"' },
  classic: { small: 600, medium: 1200, large: 1790, mediumLabel: '10"' },
  specialty: {
    "chicago-extreme": { medium: 1470, large: 2150 },
    "crown-crust": { medium: 1470, large: 2099 },
    "stuffed-crust": { flat: 2050 },
    "tele-extreme": { flat: 1950 },
    "sixteen-inch-incher": { flat: 2800 },
  },
  items: {
    "zinger-burger": 550,
    "patty-burger": 350,
    "crunchy-sandwich": 950,
    "special-sandwich": 930,
    "baked-smoked-sandwich": 930,
    "sizzling-sandwich": 930,
    "fried-crispy-wings": 650,
    "bbq-wings": 650,
    "creamo-wings": 650,
    "oven-baked-wings": 600,
    "flaming-wings": 600,
    "loaded-fries": 790,
    "french-fries": 250,
    "family-fries": 390,
    "crunchy-wrap": 550,
    "dynamite-wrap": 550,
    "behari-roll": 950,
    "crunchy-pasta": 980,
    "chicken-tender-strips": 750,
    "crispy-box": 790,
    "fried-chicken-chest": 300,
    "fried-chicken": 280,
  },
};

const PROMO = {
  "zinger-burger": { price: 440, source: "standalone promo poster" },
  "family-deal": { price: 2199, source: "Eid Celebration" },
  "pizza-fest": { price: 1649, source: "Eid Celebration" },
  "knock-out-deal": { price: 1390, source: "Eid Celebration" },
  "pair-deal": { price: 2099, note: "Eid Celebration; drink size conflict 1L vs 1.5L" },
};

/** V1 hybrid baseline (BFR-001) — board-era prices matching prod + menu-data + owner sync. */
const CATEGORIES = [
  { code: "signature-pizzas", name: "Signature Pizzas", sortOrder: 10, lifecycle: "sellable" },
  { code: "classic-pizzas", name: "Classic Pizzas", sortOrder: 20, lifecycle: "sellable" },
  { code: "specialty-pizzas", name: "Specialty Pizzas", sortOrder: 30, lifecycle: "sellable" },
  { code: "burgers", name: "Burgers", sortOrder: 40, lifecycle: "sellable" },
  { code: "sandwiches", name: "Sandwiches", sortOrder: 50, lifecycle: "sellable" },
  { code: "wings", name: "Wings", sortOrder: 60, lifecycle: "sellable" },
  { code: "fries", name: "Fries", sortOrder: 70, lifecycle: "sellable" },
  { code: "wraps-rolls", name: "Wraps & Rolls", sortOrder: 80, lifecycle: "sellable" },
  { code: "pasta", name: "Pasta", sortOrder: 90, lifecycle: "sellable" },
  { code: "chicken-sides", name: "Chicken & Sides", sortOrder: 100, lifecycle: "sellable" },
  { code: "dips", name: "Dips", sortOrder: 105, lifecycle: "sellable" },
  { code: "drinks", name: "Drinks", sortOrder: 110, lifecycle: "sellable" },
  { code: "deals", name: "Deals", sortOrder: 120, lifecycle: "sellable" },
  { code: "toppings", name: "Toppings", sortOrder: 200, lifecycle: "hidden", notes: "Internal SKUs; not a customer browse tab" },
  {
    code: "broast",
    name: "Broast",
    sortOrder: 999,
    lifecycle: "discontinued",
    notes: "Retired from customer browse by owner sync 20260716160000; GM Link 4 still lists Injected Broast",
  },
];

const sigV = [
  { code: "small", label: "6 inch Small", sizeCode: "small", pricePkr: 499, isDefault: true },
  { code: "medium", label: "9 inch Medium", sizeCode: "medium", pricePkr: 950, isDefault: false },
  { code: "large", label: "12 inch Large", sizeCode: "large", pricePkr: 1570, isDefault: false },
];
const clsV = [
  { code: "small", label: "6 inch Small", sizeCode: "small", pricePkr: 470, isDefault: true },
  { code: "medium", label: "9 inch Medium", sizeCode: "medium", pricePkr: 890, isDefault: false },
  { code: "large", label: "12 inch Large", sizeCode: "large", pricePkr: 1470, isDefault: false },
];

function item(partial) {
  return {
    temporary: false,
    currency: "PKR",
    pricingEra: "board-v1-hybrid-bfr001",
    evidence: [
      "REAL_MENU_EXTRACTED.md",
      "supabase/migrations/20260716160000_sync_owner_menu_catalog.sql",
      "apps/website/client/src/data/menu-data.ts",
      "prod-api:2026-07-18",
    ],
    flags: [],
    ...partial,
  };
}

function withGmConflict(base, gm) {
  if (!gm) return base;
  return {
    ...base,
    flags: [...new Set([...(base.flags || []), "GM_PRICE_CONFLICT", "OWNER_CONFIRMATION_REQUIRED"])],
    gmReference: gm,
    notes: [
      ...(base.notes ? [base.notes].flat() : []),
      "BFR-001 HYBRID: keep board-era V1 price; GM Jul-13 is reference only — do not silent-replace",
    ],
  };
}

const ITEMS = [
  // Signature
  ...[
    ["tele-special", "Tele Special", "Special chicken with special sauce, topped with olive, mushroom & capsicum.", "Signature", true],
    ["peri-peri", "Peri Peri", "Peri peri sauce with tikka chicken topped with kabab, sausages & tomato.", null, false],
    ["bihari-kabab", "Bihari Kabab", "Garlic sauce with tikka chicken topped kabab slice, onion & mushroom.", "Hot", false],
    ["kababish", "Kababish", "Special sauce with fajita chicken topped with kabab mushroom & capsicum.", null, false],
  ].map(([code, name, description, badge, featured]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "signature-pizzas",
        productType: "pizza",
        lifecycle: "sellable",
        description,
        badge,
        featured,
        imageUrl: "/images/menu-pizza.jpg",
        basePricePkr: null,
        variants: sigV,
      }),
      GM.signature,
    ),
  ),
  // Classic
  ...[
    ["tikka", "Tikka", "Tikka sauce with tikka chicken topped with olive & onion."],
    ["bonfire", "Bonfire", "Bonfire sauce with fajita chicken topped with jalapeno, mushroom & tomato."],
    ["chicken-supreme", "Chicken Supreme", "Original red base sauce, three types of chicken topped with olive, mushroom jalapeno & capsicum."],
    ["real-fajita", "Real Fajita", "Fajita sauce with fajita chicken topped with onion & capsicum."],
    ["mexicana", "Mexicana", "Special sauce with smoked chicken topped with sausages, black olive, tomato & capsicum."],
    ["cheese-lover", "Cheese Lover", "Original red base sauce loaded with mozzarella cheese."],
  ].map(([code, name, description]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "classic-pizzas",
        productType: "pizza",
        lifecycle: "sellable",
        description,
        imageUrl: "/images/menu-pizza.jpg",
        basePricePkr: null,
        variants: clsV,
      }),
      GM.classic,
    ),
  ),
  withGmConflict(
    item({
      code: "chicago-extreme",
      name: "Chicago Extreme",
      categoryCode: "specialty-pizzas",
      productType: "pizza",
      lifecycle: "sellable",
      description: "Double layers extreme pizza with 2 premium sauces, lots of cheese & chicken.",
      imageUrl: "/images/menu-pizza.jpg",
      basePricePkr: null,
      variants: [
        { code: "medium", label: "Medium", sizeCode: "medium", pricePkr: 1199, isDefault: true },
        { code: "large", label: "Large", sizeCode: "large", pricePkr: 1899, isDefault: false },
      ],
    }),
    GM.specialty["chicago-extreme"],
  ),
  withGmConflict(
    item({
      code: "crown-crust",
      name: "Crown Crust",
      categoryCode: "specialty-pizzas",
      productType: "pizza",
      lifecycle: "sellable",
      description: "Any flavour with chicken stuffing on edges & Tele Pizza signature sauce.",
      badge: "Chef Special",
      featured: true,
      imageUrl: "/images/menu-pizza.jpg",
      basePricePkr: null,
      variants: [
        { code: "medium", label: "Medium", sizeCode: "medium", pricePkr: 1199, isDefault: true },
        { code: "large", label: "Large", sizeCode: "large", pricePkr: 1799, isDefault: false },
      ],
    }),
    GM.specialty["crown-crust"],
  ),
  withGmConflict(
    item({
      code: "stuffed-crust",
      name: "Stuffed Crust",
      categoryCode: "specialty-pizzas",
      productType: "pizza",
      lifecycle: "sellable",
      description: "Any flavour with kabab stuffing on edges.",
      imageUrl: "/images/menu-pizza.jpg",
      basePricePkr: 1749,
      variants: [],
      flags: ["SIZE_AMBIGUOUS_ON_BOARD"],
    }),
    GM.specialty["stuffed-crust"],
  ),
  withGmConflict(
    item({
      code: "tele-extreme",
      name: "Tele Extreme Pizza",
      categoryCode: "specialty-pizzas",
      productType: "pizza",
      lifecycle: "sellable",
      description: "2 premium sauces with loaded chicken & lots of cheese.",
      imageUrl: "/images/menu-pizza.jpg",
      basePricePkr: 1699,
      variants: [],
      flags: ["SIZE_AMBIGUOUS_ON_BOARD"],
    }),
    GM.specialty["tele-extreme"],
  ),
  withGmConflict(
    item({
      code: "sixteen-inch-incher",
      name: '16" Incher',
      categoryCode: "specialty-pizzas",
      productType: "pizza",
      lifecycle: "sellable",
      description: "Sixteen-inch specialty pizza.",
      imageUrl: "/images/menu-pizza.jpg",
      basePricePkr: 2399,
      variants: [],
    }),
    GM.specialty["sixteen-inch-incher"],
  ),
  // Burgers
  withGmConflict(
    item({
      code: "zinger-burger",
      name: "Zinger Burger",
      categoryCode: "burgers",
      productType: "burger",
      lifecycle: "sellable",
      description: "Crispy zinger burger.",
      badge: "Popular",
      featured: true,
      imageUrl: "/images/menu-burger.jpg",
      basePricePkr: 450,
      variants: [],
      flags: ["MULTI_SOURCE_PRICE_CONFLICT", "BFR-018"],
      promoConflict: PROMO["zinger-burger"],
    }),
    { board: 450, promo: 440, gm: 550 },
  ),
  withGmConflict(
    item({
      code: "patty-burger",
      name: "Patty Burger",
      categoryCode: "burgers",
      productType: "burger",
      lifecycle: "sellable",
      description: "Tele Pizza patty burger.",
      imageUrl: "/images/menu-burger.jpg",
      basePricePkr: 299,
      variants: [],
    }),
    { gm: GM.items["patty-burger"] },
  ),
  // Sandwiches
  ...[
    ["crunchy-sandwich", "Crunchy Sandwich", 799],
    ["special-sandwich", "Special Sandwich", 749],
    ["baked-smoked-sandwich", "Baked Smoked", 749],
    ["sizzling-sandwich", "Sizzling Sandwich", 749],
  ].map(([code, name, price]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "sandwiches",
        productType: "sandwich",
        lifecycle: "sellable",
        description: "Served with dip sauce & fries.",
        imageUrl: "/images/sides-platter.jpg",
        basePricePkr: price,
        variants: [],
      }),
      { gm: GM.items[code] },
    ),
  ),
  // Wraps
  withGmConflict(
    item({
      code: "jumbo-wrap",
      name: "Tele Pizza Special Jumbo Wrap",
      categoryCode: "wraps-rolls",
      productType: "wrap",
      lifecycle: "sellable",
      description: "Tele Pizza special jumbo wrap.",
      imageUrl: "/images/sides-platter.jpg",
      basePricePkr: 649,
      variants: [],
      flags: ["GM_NAME_CONFLICT"],
      notes: "GM Link 4 lists different Jumbo wrap SKUs @ 950 — OWNER_CONFIRMATION_REQUIRED",
    }),
    { gmNote: "GM has Wrap it Hot / Jalapeno Kick Jumbo @ 950" },
  ),
  ...[
    ["crunchy-wrap", "Crunchy Wrap", "Crunchy chicken wrap.", 399],
    ["dynamite-wrap", "Dynamite Wrap", "Dynamite-flavoured wrap.", 399],
  ].map(([code, name, description, price]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "wraps-rolls",
        productType: "wrap",
        lifecycle: "sellable",
        description,
        imageUrl: "/images/sides-platter.jpg",
        basePricePkr: price,
        variants: [],
      }),
      { gm: GM.items[code] },
    ),
  ),
  withGmConflict(
    item({
      code: "behari-roll",
      name: "Behari Roll",
      categoryCode: "wraps-rolls",
      productType: "wrap",
      lifecycle: "sellable",
      description:
        "4 pcs special chicken with special sauce, wrapped in crispy tortilla baked with lots of cheese, mushroom & olives, served with dip sauce & fries.",
      imageUrl: "/images/sides-platter.jpg",
      basePricePkr: 799,
      variants: [],
    }),
    { gm: GM.items["behari-roll"] },
  ),
  // Pasta
  withGmConflict(
    item({
      code: "crunchy-pasta",
      name: "Crunchy Pasta",
      categoryCode: "pasta",
      productType: "pasta",
      lifecycle: "sellable",
      description: "Crunchy pasta.",
      badge: "Hot",
      imageUrl: "/images/pasta-dish.jpg",
      basePricePkr: 849,
      variants: [],
    }),
    { gm: GM.items["crunchy-pasta"] },
  ),
  item({
    code: "special-pasta",
    name: "Special Pasta / Flaming Pasta",
    categoryCode: "pasta",
    productType: "pasta",
    lifecycle: "sellable",
    description: "Special flaming pasta.",
    imageUrl: "/images/pasta-dish.jpg",
    basePricePkr: 749,
    variants: [],
    flags: ["NAME_AMBIGUOUS_ON_BOARD", "OWNER_CONFIRMATION_REQUIRED"],
    notes: "Board layout ambiguous for Special vs Flaming naming; GM lists SPECIAL/FLAMING/ALFREDO at higher prices",
  }),
  // Wings
  ...[
    ["fried-crispy-wings", "Fried & Crispy", "Crispy fried chicken wings.", 599],
    ["bbq-wings", "BBQ", "BBQ-flavoured chicken wings.", 599],
    ["creamo-wings", "Creamo", "Creamy-style chicken wings.", 599],
    ["oven-baked-wings", "Oven Baked", "Oven-baked chicken wings.", 549],
    ["flaming-wings", "Flaming", "Spicy flaming chicken wings.", 549],
  ].map(([code, name, description, price]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "wings",
        productType: "wings",
        lifecycle: "sellable",
        description,
        imageUrl: "/images/sides-platter.jpg",
        basePricePkr: price,
        variants: [],
      }),
      { gm: GM.items[code] },
    ),
  ),
  // Fries
  ...[
    ["loaded-fries", "Loaded Fries", "Loaded fries.", 650],
    ["french-fries", "French Fries", "French fries.", 199],
    ["family-fries", "Family Fries", "Family-size fries.", 350],
  ].map(([code, name, description, price]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "fries",
        productType: "fries",
        lifecycle: "sellable",
        description,
        imageUrl: "/images/sides-platter.jpg",
        basePricePkr: price,
        variants: [],
      }),
      { gm: GM.items[code] },
    ),
  ),
  // Chicken & sides
  ...[
    ["chicken-tender-strips", "Chicken Tender Strips", "5 pcs juicy chicken tender strips with blend of spices, served with secret delicious dip sauce.", 590],
    ["crispy-box", "Crispy Box", "3 pcs crispy chicken (1 Chest, 1 Drum, 1 Wing) with 1 Garlic Ranch.", 670],
    ["fried-chicken-chest", "Fried Chicken (Chest)", "Fried chicken chest piece.", 250],
    ["fried-chicken", "Fried Chicken", "Fried chicken piece.", 220],
    ["nuggets", "Nuggets", "10 pieces.", 449],
    ["hot-shots", "Hot Shots", "10 pieces.", 449],
  ].map(([code, name, description, price]) =>
    withGmConflict(
      item({
        code,
        name,
        categoryCode: "chicken-sides",
        productType: "side",
        lifecycle: "sellable",
        description,
        imageUrl: "/images/sides-platter.jpg",
        basePricePkr: price,
        variants: [],
      }),
      GM.items[code] ? { gm: GM.items[code] } : null,
    ),
  ),
  // Dips (sauces as browse SKUs — existing catalog model)
  ...[
    ["special-sauce-dip", "Special Sauce", "Tele Pizza special sauce dip."],
    ["bone-fire-dip", "Bone Fire", "Bone fire sauce dip."],
    ["dip-sauce", "Dip Sauce", "Classic dip sauce."],
    ["garlic-ranch-dip", "Garlic Ranch", "Garlic ranch dip."],
  ].map(([code, name, description]) =>
    item({
      code,
      name,
      categoryCode: "dips",
      productType: "side",
      lifecycle: "sellable",
      description,
      imageUrl: "/images/sides-platter.jpg",
      basePricePkr: 50,
      variants: [],
      domain: "sauces",
    }),
  ),
  // Drinks + water
  ...[
    ["drink-1-5l", "1.5 Liter", "1.5 liter soft drink.", 210],
    ["drink-1l", "1 Liter", "1 liter soft drink.", 170],
    ["drink-500ml", "500 ml", "500 ml soft drink.", 110],
    ["drink-345ml", "345 ml", "345 ml soft drink.", 70],
    ["large-water", "Large Water", "Large bottled water.", 99],
    ["small-water", "Small Water", "Small bottled water.", 50],
  ].map(([code, name, description, price]) =>
    item({
      code,
      name,
      categoryCode: "drinks",
      productType: "drink",
      lifecycle: "sellable",
      description,
      imageUrl: "/images/desserts-drinks.jpg",
      basePricePkr: price,
      variants: [],
      domain: code.includes("water") ? "water" : "drinks",
    }),
  ),
  // Deals (evergreen board — Eid/Iftar flagged separately)
  ...[
    ["family-deal", "Family Deal", "1 Large Pizza + 10 Pcs Wings + 1.5 Liter Drink.", 2250, true, null, "/images/promos/family-deal.jpg"],
    ["pizza-fest", "Pizza Fest", "1 Large Pizza + 1.5 Liter Drink.", 1680, true, "Hot", "/images/promos/pizza-fest.jpg"],
    ["mega-offer", "Mega Offer", "2 Large Pizza + 1.5 Liter Coke.", 3140, false, null, "/images/products/deal-combo.jpg"],
    ["pair-deal", "Pair Deal", "2 Medium Pizza + 1.5 Liter Coke.", 1999, true, "Hot", "/images/promos/pair-deal.jpg"],
    ["family-festival", "Family Festival", "5 Zinger Burger + 1.5 Drink.", 2350, false, null, "/images/products/deal-combo.jpg"],
    ["deal-for-two", "Deal for 2", "2 Zinger Burger + 2 Drink 345ml.", 999, false, null, "/images/products/deal-combo.jpg"],
    ["knock-out-deal", "Knock Out Deal", "3 Zinger Burger + 1 Liter Drink.", 1440, false, null, "/images/promos/knock-out-deal.jpg"],
  ].map(([code, name, description, price, featured, badge, imageUrl]) => {
    const base = item({
      code,
      name,
      categoryCode: "deals",
      productType: "deal",
      lifecycle: "sellable",
      description,
      badge: badge ?? null,
      featured,
      imageUrl,
      basePricePkr: price,
      variants: [],
      temporary: false,
    });
    if (PROMO[code]) {
      base.flags = [...(base.flags || []), "EID_PROMO_CONFLICT", "TEMPORARY_PRICE_NOT_EVERGREEN", "OWNER_CONFIRMATION_REQUIRED"];
      base.promoConflict = PROMO[code];
    }
    return base;
  }),
  // Toppings (modifier-linked SKUs)
  item({
    code: "extra-chicken",
    name: "Extra Chicken",
    categoryCode: "toppings",
    productType: "topping",
    lifecycle: "modifier-only",
    description: "Extra chicken topping for pizza. Size tier matches small / medium / large pizza.",
    imageUrl: "/images/menu-pizza.jpg",
    basePricePkr: null,
    variants: [
      { code: "small", label: "Small", sizeCode: "small", pricePkr: 50, isDefault: true },
      { code: "medium", label: "Medium", sizeCode: "medium", pricePkr: 100, isDefault: false },
      { code: "large", label: "Large", sizeCode: "large", pricePkr: 150, isDefault: false },
    ],
    domain: "toppings",
  }),
  item({
    code: "extra-cheese",
    name: "Extra Cheese",
    categoryCode: "toppings",
    productType: "topping",
    lifecycle: "modifier-only",
    description: "Extra cheese topping for pizza. Size tier matches small / medium / large pizza.",
    imageUrl: "/images/menu-pizza.jpg",
    basePricePkr: null,
    variants: [
      { code: "small", label: "Small", sizeCode: "small", pricePkr: 50, isDefault: true },
      { code: "medium", label: "Medium", sizeCode: "medium", pricePkr: 100, isDefault: false },
      { code: "large", label: "Large", sizeCode: "large", pricePkr: 150, isDefault: false },
    ],
    domain: "toppings",
  }),
  item({
    code: "extra-cheese-slice",
    name: "Extra Cheese Slice",
    categoryCode: "toppings",
    productType: "topping",
    lifecycle: "modifier-only",
    description: "Extra cheese slice topping for pizza (single verified price).",
    imageUrl: "/images/menu-pizza.jpg",
    basePricePkr: 60,
    variants: [],
    domain: "toppings",
    flags: ["MODIFIER_SEED_PRICE_MISMATCH"],
    notes: "Board/catalog SKU = 60; static modifier-catalog.ts previously used priceDelta 50 — align to 60",
  }),
  // Discontinued Broast (GM evidence; owner sync retired)
  ...[
    [
      "quarter-broast",
      "Quarter Broast",
      "1 Leg & 1 Thigh OR 1 Wing & 1 Chest, 1 Bun, Fries, (1 Dip) Garlic Dip OR Mustard Dip.",
      750,
    ],
    [
      "half-broast",
      "Half Broast",
      "1 Leg, 1 Thigh, 1 wing, 1 chest, 1 Bun, Fries, (3 Dips) 1 Garlic Dip, 1 Mustard Dip & 1 Tangy Dip.",
      1390,
    ],
    [
      "full-broast",
      "Full Broast",
      "2 Legs, 2 Thighs, 2 wings, 2 chests, 2 Buns, Fries, (6 Dips) 2 Garlic Dips, 2 Mustard Dips & 2 Tangy Dips.",
      2590,
    ],
    ["broast-garlic-dip", "Extra Garlic Dip", "Extra garlic sauce dip for broast.", 60],
    ["broast-mustard-dip", "Extra Mustard Dip", "Extra mustard sauce dip for broast.", 60],
  ].map(([code, name, description, price]) =>
    item({
      code,
      name,
      categoryCode: "broast",
      productType: "side",
      lifecycle: "discontinued",
      description,
      imageUrl: "/images/products/broast.jpg",
      basePricePkr: price,
      variants: [],
      domain: "broast",
      flags: ["RETIRED_BY_OWNER_SYNC", "GM_EVIDENCE_PRESENT", "OWNER_CONFIRMATION_REQUIRED"],
      evidence: [
        "REAL-MENU-EXTRACTION.md#Injected-Broast",
        "supabase/migrations/20260714100000_sync_verified_menu_catalog.sql",
        "supabase/migrations/20260716160000_sync_owner_menu_catalog.sql (retired)",
      ],
      notes: "Present on GM Link 4; retired from browse by owner menu sync. Do not re-activate without owner approval + board images.",
    }),
  ),
  item({
    code: "behari-kabab-pizza",
    name: "Behari Kabab Pizza",
    categoryCode: "specialty-pizzas",
    productType: "pizza",
    lifecycle: "discontinued",
    description: "Specialty poster starting price only.",
    imageUrl: "/images/menu-pizza.jpg",
    basePricePkr: 549,
    variants: [],
    flags: ["RETIRED_BY_OWNER_SYNC", "OWNER_CONFIRMATION_REQUIRED", "POSTER_ONLY"],
    evidence: ["REAL_MENU_EXTRACTED.md", "supabase/migrations/20260716160000_sync_owner_menu_catalog.sql"],
    notes: "Not on GM specialty photo; Bihari Kabab exists as signature pizza. Retired from browse.",
  }),
];

/** GM / gap items NOT in V1 sellable set — recorded, inactive, not invented into sellable. */
const OWNER_GAPS = [
  { code: "malai-boti", domain: "pizzas", name: "Malai Boti", gmPrices: { small: 620, medium: 1270, large: 1890 }, source: "REAL-MENU-EXTRACTION.md Link 3" },
  { code: "smokehouse-burger", domain: "burgers", name: "Smokehouse Burger", gmPricePkr: 650, source: "GM Link 4" },
  { code: "grill-boss-burger", domain: "burgers", name: "Grill Boss Burger", gmPricePkr: 890, source: "GM Link 4" },
  { code: "chipotle-fire-burger", domain: "burgers", name: "Chipotle Fire Burger", gmPricePkr: 890, source: "GM Link 4" },
  { code: "classic-beef-burger", domain: "burgers", name: "Classic Beef Burger", gmPricePkr: 690, source: "GM Link 4" },
  { code: "signature-beef-burger", domain: "burgers", name: "Signature Beef Burger", gmPricePkr: 1090, source: "GM Link 4" },
  { code: "supreme-beef-burger", domain: "burgers", name: "Supreme Beef Burger", gmPricePkr: 1090, source: "GM Link 4" },
  { code: "classic-crunch-burger", domain: "burgers", name: "Classic Crunch Burger", gmPricePkr: 450, source: "GM Link 2" },
  { code: "big-boss-burger", domain: "burgers", name: "Big Boss Burger", gmPricePkr: 690, source: "GM Link 2" },
  { code: "paratha-roll", domain: "sides", name: "Paratha roll", gmPricePkr: 390, source: "GM Link 2" },
  { code: "mozzarella-jalapeno-sticks", domain: "sides", name: "Mozzarella jalapeno sticks", gmPricePkr: 599, source: "GM Link 2" },
  { code: "alfredo-pasta", domain: "pasta", name: "ALFREDO PASTA", gmPricePkr: 1100, source: "GM Link 2" },
  { code: "wrap-it-hot-grilled-jumbo", domain: "wraps", name: "Wrap it Hot Grilled Jumbo", gmPricePkr: 950, source: "GM Link 4" },
  { code: "jalapeno-kick-grilled-jumbo", domain: "wraps", name: "Jalapeno Kick Grilled Jumbo", gmPricePkr: 950, source: "GM Link 4" },
  { code: "telebar-module", domain: "telebar", name: "telebar (43 SKUs)", note: "PLANNED_V2 / BFR-007 — excluded from V1", source: "REAL-MENU-EXTRACTION.md" },
].map((g) => ({
  ...g,
  lifecycle: "owner-confirmation-required",
  sellable: false,
  reason: "Present on GM evidence but not in V1 board-hybrid freeze; do not invent into sellable catalog without owner board confirmation",
}));

const MODIFIER_GROUPS = [
  {
    code: "crust",
    name: "Crust",
    selectionType: "single",
    minSelect: 1,
    maxSelect: 1,
    isRequired: true,
    lifecycle: "owner-confirmation-required",
    flags: ["NO_BOARD_PRICE_EVIDENCE"],
    notes: "Crust deltas (thick 50 / cheese-burst 150) seeded in DB-R2 — not printed on structured boards in repo evidence. Keep in schema; do not treat as evergreen-verified.",
    options: [
      { code: "classic", name: "Classic Crust", priceDeltaPkr: 0, evidenceStatus: "default-zero" },
      { code: "thin", name: "Thin Crust", priceDeltaPkr: 0, evidenceStatus: "default-zero" },
      { code: "thick", name: "Thick Crust", priceDeltaPkr: 50, evidenceStatus: "unverified-seed" },
      { code: "cheese-burst", name: "Cheese Burst Crust", priceDeltaPkr: 150, evidenceStatus: "unverified-seed" },
    ],
  },
  {
    code: "extra-chicken",
    name: "Extra chicken",
    selectionType: "multi",
    linkedItemCodes: ["extra-chicken"],
    lifecycle: "sellable",
    evidenceStatus: "board-verified-via-topping-sku",
    options: [
      {
        code: "extra-chicken",
        name: "Extra Chicken",
        priceDeltaPkr: 50,
        priceDeltaBySize: { small: 50, medium: 100, large: 150 },
        linkedMenuItemCode: "extra-chicken",
      },
    ],
  },
  {
    code: "extra-cheese",
    name: "Extra cheese",
    selectionType: "multi",
    linkedItemCodes: ["extra-cheese", "extra-cheese-slice"],
    lifecycle: "sellable",
    evidenceStatus: "board-verified-via-topping-sku",
    options: [
      {
        code: "extra-cheese",
        name: "Extra Cheese",
        priceDeltaPkr: 50,
        priceDeltaBySize: { small: 50, medium: 100, large: 150 },
        linkedMenuItemCode: "extra-cheese",
      },
      {
        code: "extra-cheese-slice",
        name: "Extra Cheese Slice",
        priceDeltaPkr: 60,
        linkedMenuItemCode: "extra-cheese-slice",
        flags: ["ALIGN_TO_SKU_60"],
      },
    ],
  },
  {
    code: "extra-vegetables",
    name: "Extra vegetables",
    selectionType: "multi",
    lifecycle: "owner-confirmation-required",
    flags: ["NO_BOARD_PRICE_EVIDENCE"],
    notes: "Vegetable option prices (30–40) are DB-R2 seed only — not on structured boards in repo.",
    options: [
      { code: "olives", name: "Olives", priceDeltaPkr: 40, evidenceStatus: "unverified-seed" },
      { code: "mushrooms", name: "Mushrooms", priceDeltaPkr: 40, evidenceStatus: "unverified-seed" },
      { code: "onions", name: "Onions", priceDeltaPkr: 30, evidenceStatus: "unverified-seed" },
      { code: "bell-peppers", name: "Bell Peppers", priceDeltaPkr: 30, evidenceStatus: "unverified-seed" },
      { code: "jalapenos", name: "Jalapeños", priceDeltaPkr: 40, evidenceStatus: "unverified-seed" },
      { code: "sweet-corn", name: "Sweet Corn", priceDeltaPkr: 30, evidenceStatus: "unverified-seed" },
      { code: "tomatoes", name: "Tomatoes", priceDeltaPkr: 30, evidenceStatus: "unverified-seed" },
    ],
  },
  {
    code: "extra-toppings",
    name: "Extra toppings",
    selectionType: "multi",
    lifecycle: "owner-confirmation-required",
    flags: ["NO_BOARD_PRICE_EVIDENCE"],
    notes: "Pepperoni / smoked / BBQ chicken option deltas are DB-R2 seed only.",
    options: [
      { code: "pepperoni", name: "Pepperoni", priceDeltaPkr: 80, evidenceStatus: "unverified-seed" },
      { code: "smoked-chicken", name: "Smoked Chicken", priceDeltaPkr: 80, evidenceStatus: "unverified-seed" },
      { code: "bbq-chicken", name: "BBQ Chicken", priceDeltaPkr: 80, evidenceStatus: "unverified-seed" },
    ],
  },
  {
    code: "add-drinks",
    name: "Add drinks",
    selectionType: "single",
    lifecycle: "sellable",
    notes: "price_delta must resolve from linked drink SKU base_price (70/110/170/210), not stale seed fallbacks",
    options: [
      { code: "drink-345ml", name: "Drink 345ml", linkedMenuItemCode: "drink-345ml", priceDeltaPkr: 70 },
      { code: "drink-500ml", name: "Drink 500ml", linkedMenuItemCode: "drink-500ml", priceDeltaPkr: 110 },
      { code: "drink-1l", name: "Drink 1L", linkedMenuItemCode: "drink-1l", priceDeltaPkr: 170 },
      { code: "drink-1-5l", name: "Drink 1.5L", linkedMenuItemCode: "drink-1-5l", priceDeltaPkr: 210 },
    ],
  },
  {
    code: "add-sides",
    name: "Add sides",
    selectionType: "single",
    lifecycle: "sellable",
    notes: "Align to fries SKU prices 199/350/650 (static modifier-catalog previously had wrong 449/399)",
    options: [
      { code: "french-fries", name: "French Fries", linkedMenuItemCode: "french-fries", priceDeltaPkr: 199 },
      { code: "family-fries", name: "Family Fries", linkedMenuItemCode: "family-fries", priceDeltaPkr: 350 },
      { code: "loaded-fries", name: "Loaded Fries", linkedMenuItemCode: "loaded-fries", priceDeltaPkr: 650 },
    ],
  },
];

const TEMPORARY_OFFERS = [
  {
    code: "eid-family-deal",
    name: "Eid Celebration Family Deal",
    pricePkr: 2199,
    evergreenCode: "family-deal",
    temporary: true,
    lifecycle: "hidden",
    flags: ["TEMPORARY_NOT_EVERGREEN"],
  },
  {
    code: "eid-pizza-fest",
    name: "Eid Celebration Pizza Fest",
    pricePkr: 1649,
    evergreenCode: "pizza-fest",
    temporary: true,
    lifecycle: "hidden",
    flags: ["TEMPORARY_NOT_EVERGREEN"],
  },
  {
    code: "eid-knock-out",
    name: "Eid Celebration Knock Out",
    pricePkr: 1390,
    evergreenCode: "knock-out-deal",
    temporary: true,
    lifecycle: "hidden",
    flags: ["TEMPORARY_NOT_EVERGREEN"],
  },
  {
    code: "eid-pair-deal",
    name: "Eid Celebration Pair Deal",
    pricePkr: 2099,
    evergreenCode: "pair-deal",
    temporary: true,
    lifecycle: "hidden",
    flags: ["TEMPORARY_NOT_EVERGREEN", "CONTENT_CONFLICT_DRINK_SIZE"],
  },
  {
    code: "iftar-tele-special",
    name: "Tele Special Pizza — Iftar Special",
    pricePkr: 799,
    temporary: true,
    lifecycle: "hidden",
    flags: ["TEMPORARY_NOT_EVERGREEN", "TIME_WINDOW_5PM_7PM"],
  },
];

let prodMeta = null;
if (fromProd) {
  try {
    const res = await fetch("https://telepizza-api.onrender.com/api/v1/menu/catalog");
    const body = await res.json();
    prodMeta = body.meta ?? null;
  } catch (err) {
    console.warn("Could not fetch prod catalog:", err.message);
  }
}

const sellable = ITEMS.filter((i) => i.lifecycle === "sellable");
const toppings = ITEMS.filter((i) => i.lifecycle === "modifier-only");
const discontinued = ITEMS.filter((i) => i.lifecycle === "discontinued");
const variantCount = [...sellable, ...toppings].reduce((n, i) => n + (i.variants?.length || 0), 0);
const dealCount = sellable.filter((i) => i.productType === "deal").length;

const catalog = {
  schemaVersion: 1,
  code: "telepizza-canonical-menu",
  title: "Telepizza Canonical Menu Manifest",
  currency: "PKR",
  generatedAt: new Date().toISOString().slice(0, 10),
  completionStatus: "BLOCKED_OWNER_EVIDENCE_REQUIRED",
  completionReason:
    "Owner structured menu-board image files are not present in the repository. Partial V1 hybrid baseline is verified from approved extraction docs + owner sync migration + production API (13/58/3/40/7). GM Jul-13 conflicts and missing domains require owner confirmation before PASS.",
  evidenceRank: [
    { rank: 1, source: "owner-menu-board-images", status: "MISSING_FROM_REPO", path: null },
    { rank: 2, source: "approved-extracted-docs", status: "PRESENT", paths: ["_documentation-audit/evidence/REAL_MENU_EXTRACTED.md", "REAL-MENU-EXTRACTION.md"] },
    { rank: 3, source: "production-db-via-api", status: "VERIFIED_COUNTS", meta: prodMeta ?? { categoryCount: 13, itemCount: 58, toppingCount: 3, variantCount: 40, dealCount: 7 } },
    { rank: 4, source: "migrations", status: "PRESENT", paths: ["supabase/migrations/20260716160000_sync_owner_menu_catalog.sql", "supabase/migrations/20260718120000_product_modifier_system.sql"] },
    { rank: 5, source: "website-fallback", status: "ALIGNED_TO_HYBRID", path: "apps/website/client/src/data/menu-data.ts" },
    { rank: 6, source: "promo-creatives", status: "TEMPORARY_ONLY", note: "Eid/Iftar ≠ evergreen" },
  ],
  decisions: {
    "BFR-001": "APPROVED HYBRID — V1 base = verified Website/DB board-era; GM = reference only",
    "BFR-007": "telebar PLANNED_V2 — excluded from V1",
    "BFR-018": "Zinger multi-source conflict — board 450 kept under hybrid; still flagged",
  },
  freezeBaseline: {
    publicCategories: 13,
    browseItems: 58,
    toppings: 3,
    variants: 40,
    deals: 7,
    note: "Do not expand sellable browse without freeze bump + owner approval",
  },
  counts: {
    sellableBrowse: sellable.length,
    toppings: toppings.length,
    discontinued: discontinued.length,
    variantsIncludingToppings: variantCount,
    deals: dealCount,
    ownerGapsNotSellable: OWNER_GAPS.length,
  },
  domains: {
    pizzas: "partial — V1 specialty set present; Malai Boti gap",
    burgers: "partial — zinger + patty only; grill/smash/extra chicken on GM gaps",
    broast: "discontinued in browse — GM evidence retained as discontinued rows",
    sandwiches: "present — board-era prices",
    wraps: "partial — board set present; GM jumbo/grill gaps",
    pasta: "partial — 2 of GM set; alfredo gap; naming ambiguous",
    wings: "present — board-era",
    fries: "present — board-era",
    sides: "present as chicken-sides + dips",
    drinks: "present",
    water: "present under drinks",
    sauces: "present as Dips browse SKUs (not separate sauce tables)",
    toppings: "present as modifier-only SKUs + linked options",
    crust: "modifier group seeded — price evidence incomplete",
    "add-ons": "add-drinks / add-sides linked to catalog SKUs",
    deals: "7 evergreen board deals; Eid/Iftar temporary hidden",
  },
  categories: CATEGORIES,
  items: ITEMS,
  modifierGroups: MODIFIER_GROUPS,
  temporaryOffers: TEMPORARY_OFFERS,
  ownerGapsNotInV1Sellable: OWNER_GAPS,
  syncRules: {
    identity: "code (slug) — never UUID",
    upsert: "ON CONFLICT (slug) DO UPDATE",
    deactivateObsolete: "is_available=false / is_active=false — no destructive DELETE",
    preserveOrderHistory: true,
    applyProduction: false,
    requireOwnerApproval: true,
  },
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  `sellable=${sellable.length} toppings=${toppings.length} discontinued=${discontinued.length} variants=${variantCount} status=${catalog.completionStatus}`,
);

// Sanity: freeze browse count
if (sellable.length !== 58) {
  console.error(`FAIL: expected 58 sellable browse items, got ${sellable.length}`);
  process.exit(1);
}
if (toppings.length !== 3) {
  console.error(`FAIL: expected 3 toppings, got ${toppings.length}`);
  process.exit(1);
}

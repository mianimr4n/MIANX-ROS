/** Inventory helpers — honesty-first; no invented stock balances or movements. */

import type { MenuItem } from "@/lib/telepizza-types";

export type InventoryIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type InventoryKpiSnapshot = {
  menuBrowseSkus: number;
  menuInternalSkus: number;
  modifierGroupsInCatalog: number;
  unmappedRecipeProducts: number;
};

export type InventoryInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation";
};

export type InventoryReadinessGroup = {
  id: string;
  title: string;
  unavailable: string;
  why: string;
  entities: string[];
  apis: string[];
  permission: string;
  related: string;
};

export function integrationChecks(): InventoryIntegrationCheck[] {
  return [
    {
      id: "stock-items",
      label: "Stock item master",
      status: "missing",
      note: "No inventory_items / stock_items tables in committed migrations.",
    },
    {
      id: "branch-balance",
      label: "Branch stock balances",
      status: "missing",
      note: "No branch_inventory or quantity_on_hand columns in schema.",
    },
    {
      id: "movements",
      label: "Stock movement ledger",
      status: "missing",
      note: "No stock_movements table or admin movement API.",
    },
    {
      id: "recipes",
      label: "Recipe / BOM mapping",
      status: "missing",
      note: "Menu catalog has sellable SKUs and modifiers — no ingredient recipes.",
    },
    {
      id: "consumption",
      label: "Order consumption engine",
      status: "missing",
      note: "Orders create line snapshots — no server-side inventory deduction.",
    },
    {
      id: "suppliers",
      label: "Suppliers & purchase orders",
      status: "missing",
      note: "No supplier or PO tables in repository.",
    },
    {
      id: "valuation",
      label: "Cost valuation",
      status: "missing",
      note: "Menu prices are retail — no purchase cost history.",
    },
    {
      id: "menu-catalog",
      label: "Menu catalog (read)",
      status: "present",
      note: "GET /api/v1/menu/catalog — sellable products, variants, modifiers.",
    },
    {
      id: "permission",
      label: "Inventory permission",
      status: "partial",
      note: "No inventory.manage — workspace gated on branch.manage until seeded.",
    },
  ];
}

export function buildInventoryKpis(items: MenuItem[], toppings: MenuItem[]): InventoryKpiSnapshot {
  const modifierGroups = [...items, ...toppings].reduce(
    (sum, item) => sum + (item.modifierGroups?.length ?? 0),
    0,
  );
  return {
    menuBrowseSkus: items.length,
    menuInternalSkus: toppings.length,
    modifierGroupsInCatalog: modifierGroups,
    unmappedRecipeProducts: items.length + toppings.length,
  };
}

export function buildInventoryInsights(
  snapshot: InventoryKpiSnapshot,
  branchLabel: string,
): InventoryInsightItem[] {
  const items: InventoryInsightItem[] = [];

  if (snapshot.unmappedRecipeProducts > 0) {
    items.push({
      id: "unmapped-recipes",
      title: `${snapshot.unmappedRecipeProducts} catalog SKUs have no recipe mapping in the repository.`,
      detail: "Rule-based: no recipes table or menu→ingredient linkage exists.",
      source: "derived",
    });
  }

  if (snapshot.modifierGroupsInCatalog > 0) {
    items.push({
      id: "modifiers-not-ingredients",
      title: `${snapshot.modifierGroupsInCatalog} modifier groups exist on menu SKUs — these are not ingredient stock records.`,
      detail: "Modifier options adjust selling price; they do not prove inventory quantity.",
      source: "derived",
    });
  }

  items.push({
    id: "no-ledger",
    title: "No persistent stock movement ledger was found.",
    detail: "Receiving, transfers, adjustments, waste, and consumption cannot be audited yet.",
    source: "foundation",
  });

  items.push({
    id: "no-valuation",
    title: "Stock valuation is unavailable because purchase cost history does not exist.",
    detail: "Retail menu prices must not be used as inventory cost.",
    source: "foundation",
  });

  items.push({
    id: "branch-scope",
    title: `Branch context: ${branchLabel} — stock balances are not branch-scoped in API yet.`,
    detail: "Future inventory APIs must enforce branch_id on reads and writes.",
    source: "foundation",
  });

  return items.slice(0, 6);
}

export function readinessGroups(): InventoryReadinessGroup[] {
  return [
    {
      id: "ledger",
      title: "Stock ledger",
      unavailable: "On-hand quantities and movement history",
      why: "Operational inventory requires immutable movement rows — not menu availability flags.",
      entities: ["inventory_items", "branch_stock_balances", "stock_movements"],
      apis: ["GET/POST /api/v1/admin/inventory/items", "GET /api/v1/admin/inventory/movements"],
      permission: "inventory.manage (proposed)",
      related: "Menu SKUs remain separate from ingredient stock items.",
    },
    {
      id: "recipes",
      title: "Recipe mapping",
      unavailable: "Menu → ingredient BOM with units and yield",
      why: "Sales consumption must deduct ingredients server-side from versioned recipes.",
      entities: ["recipes", "recipe_ingredients", "ingredient_units"],
      apis: ["GET/POST /api/v1/admin/recipes", "link menu_item_id → recipe_id"],
      permission: "inventory.manage or menu.write",
      related: "Variants and modifiers need explicit consumption rules.",
    },
    {
      id: "receiving",
      title: "Receiving & purchase receipts",
      unavailable: "Goods receipt against PO or ad-hoc receiving",
      why: "Cannot increment balances in the browser without validated server ledger entries.",
      entities: ["purchase_orders", "goods_receipts", "receipt_lines"],
      apis: ["POST /api/v1/admin/inventory/receipts"],
      permission: "inventory.manage",
      related: "Supplier master and unit cost capture on receipt.",
    },
    {
      id: "transfers",
      title: "Stock transfers",
      unavailable: "Branch-to-branch or location transfers",
      why: "Transfers require dual-sided movement records and approval workflow.",
      entities: ["stock_transfers", "transfer_lines", "transfer_status_log"],
      apis: ["POST /api/v1/admin/inventory/transfers"],
      permission: "inventory.manage + branch scope",
      related: "Dispatch and receive quantities must reconcile.",
    },
    {
      id: "adjustments",
      title: "Adjustments & stock counts",
      unavailable: "Count corrections, damage, theft, opening balance",
      why: "Adjustments mutate ledger with actor, reason, and audit trail.",
      entities: ["stock_adjustments", "stock_count_sessions"],
      apis: ["POST /api/v1/admin/inventory/adjustments"],
      permission: "inventory.manage",
      related: "Variance from physical counts vs system on-hand.",
    },
    {
      id: "waste",
      title: "Waste & spoilage",
      unavailable: "Logged waste with category and optional cost",
      why: "Waste must create negative movement rows — not estimated in UI.",
      entities: ["waste_events", "waste_reason_codes"],
      apis: ["POST /api/v1/admin/inventory/waste"],
      permission: "inventory.manage",
      related: "Kitchen overproduction may link to prep tickets later.",
    },
    {
      id: "reorder",
      title: "Reorder planning",
      unavailable: "Par levels, reorder points, suggested PO quantities",
      why: "Low-stock alerts require configured thresholds on real balances.",
      entities: ["reorder_rules", "par_levels", "preferred_suppliers"],
      apis: ["GET /api/v1/admin/inventory/reorder-suggestions"],
      permission: "inventory.manage",
      related: "Purchasing module consumes suggestions — no AI demand forecast.",
    },
    {
      id: "valuation",
      title: "Stock valuation",
      unavailable: "Weighted average / FIFO / standard cost",
      why: "Selling price is not cost — purchase history and method required.",
      entities: ["item_cost_history", "valuation_snapshots"],
      apis: ["GET /api/v1/admin/inventory/valuation"],
      permission: "inventory.manage + payment.read",
      related: "Finance module consumes valuation snapshots.",
    },
  ];
}

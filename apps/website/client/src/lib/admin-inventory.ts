/** Inventory helpers — honesty-first; live stock APIs where present, no invented balances. */

import type { InventoryItem, StockMovement } from "@/lib/admin-api";
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
  stockItemCount: number | null;
  lowStockCount: number | null;
};

export type InventoryInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation" | "live";
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
      status: "present",
      note: "inventory_items + GET/POST/PATCH /api/v1/admin/inventory/items.",
    },
    {
      id: "branch-balance",
      label: "Branch stock balances",
      status: "present",
      note: "current_stock on inventory_items is branch-scoped.",
    },
    {
      id: "movements",
      label: "Stock movement ledger",
      status: "present",
      note: "stock_movements + GET /api/v1/admin/inventory/movements + POST adjustments.",
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
      status: "present",
      note: "suppliers + purchase_orders via /api/v1/admin/purchasing/* (see Purchasing workspace).",
    },
    {
      id: "valuation",
      label: "Cost valuation",
      status: "partial",
      note: "cost_price optional on items — no FIFO/WAC valuation engine yet.",
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
      status: "present",
      note: "inventory.manage seeded; routes also accept admin.access.",
    },
  ];
}

export function isLowStock(item: InventoryItem): boolean {
  const threshold = Math.max(item.reorderLevel, item.minimumStock);
  return item.currentStock <= threshold;
}

export function buildInventoryKpis(
  items: MenuItem[],
  toppings: MenuItem[],
  stockItems: InventoryItem[] | null = null,
): InventoryKpiSnapshot {
  const modifierGroups = [...items, ...toppings].reduce(
    (sum, item) => sum + (item.modifierGroups?.length ?? 0),
    0,
  );
  return {
    menuBrowseSkus: items.length,
    menuInternalSkus: toppings.length,
    modifierGroupsInCatalog: modifierGroups,
    unmappedRecipeProducts: items.length + toppings.length,
    stockItemCount: stockItems == null ? null : stockItems.length,
    lowStockCount: stockItems == null ? null : stockItems.filter(isLowStock).length,
  };
}

export function buildInventoryInsights(
  snapshot: InventoryKpiSnapshot,
  branchLabel: string,
): InventoryInsightItem[] {
  const items: InventoryInsightItem[] = [];

  if (snapshot.stockItemCount != null) {
    items.push({
      id: "live-stock-count",
      title: `${snapshot.stockItemCount} stock item${snapshot.stockItemCount === 1 ? "" : "s"} in branch scope.`,
      detail: "Live from GET /admin/inventory/items — empty until staff add SKUs.",
      source: "live",
    });
  }

  if (snapshot.lowStockCount != null && snapshot.lowStockCount > 0) {
    items.push({
      id: "live-low-stock",
      title: `${snapshot.lowStockCount} item(s) at or below reorder/minimum threshold.`,
      detail: "Rule-based comparison of current_stock vs reorder_level / minimum_stock.",
      source: "live",
    });
  }

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
    id: "no-valuation",
    title: "Full stock valuation (FIFO/WAC) is Coming Soon.",
    detail: "Optional cost_price may exist per item — retail menu prices must not be used as inventory cost.",
    source: "foundation",
  });

  items.push({
    id: "branch-scope",
    title: `Branch context: ${branchLabel} — stock reads/writes are branch-scoped.`,
    detail: "inventory.manage or admin.access required for write APIs.",
    source: "live",
  });

  return items.slice(0, 6);
}

export function readinessGroups(): InventoryReadinessGroup[] {
  return [
    {
      id: "ledger",
      title: "Stock ledger",
      unavailable: "— LIVE",
      why: "inventory_items + stock_movements with branch-scoped RLS and admin APIs.",
      entities: ["inventory_items", "stock_movements"],
      apis: [
        "GET/POST/PATCH /api/v1/admin/inventory/items",
        "POST /api/v1/admin/inventory/adjustments",
        "GET /api/v1/admin/inventory/movements",
      ],
      permission: "inventory.manage or admin.access",
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
      unavailable: "Goods receipt against PO (Coming Soon)",
      why: "PO-linked receiving is not shipped — use stock adjustments / opening stock for now.",
      entities: ["purchase_orders", "goods_receipts", "receipt_lines"],
      apis: ["POST /api/v1/admin/inventory/receipts"],
      permission: "inventory.manage",
      related: "Supplier master and unit cost capture on receipt.",
    },
    {
      id: "transfers",
      title: "Stock transfers",
      unavailable: "Branch-to-branch transfers (Coming Soon)",
      why: "Transfers require dual-sided movement records and approval workflow.",
      entities: ["stock_transfers", "transfer_lines", "transfer_status_log"],
      apis: ["POST /api/v1/admin/inventory/transfers"],
      permission: "inventory.manage + branch scope",
      related: "Dispatch and receive quantities must reconcile.",
    },
    {
      id: "adjustments",
      title: "Adjustments & stock counts",
      unavailable: "— LIVE",
      why: "POST /admin/inventory/adjustments writes stock_movements and updates current_stock.",
      entities: ["stock_movements", "inventory_items"],
      apis: ["POST /api/v1/admin/inventory/adjustments"],
      permission: "inventory.manage or admin.access",
      related: "Physical count variance workflows Coming Soon.",
    },
    {
      id: "waste",
      title: "Waste & spoilage",
      unavailable: "Dedicated waste API (Coming Soon)",
      why: "Use adjustments with movementType=waste until waste reason codes ship.",
      entities: ["waste_events", "waste_reason_codes"],
      apis: ["POST /api/v1/admin/inventory/waste"],
      permission: "inventory.manage",
      related: "Kitchen overproduction may link to prep tickets later.",
    },
    {
      id: "reorder",
      title: "Reorder planning",
      unavailable: "Suggested PO quantities (Coming Soon)",
      why: "Low-stock list uses reorder_level / minimum_stock on live balances; suggestions API not shipped.",
      entities: ["reorder_rules", "par_levels", "preferred_suppliers"],
      apis: ["GET /api/v1/admin/inventory/reorder-suggestions"],
      permission: "inventory.manage",
      related: "Purchasing module consumes suggestions — no AI demand forecast.",
    },
    {
      id: "valuation",
      title: "Stock valuation",
      unavailable: "Weighted average / FIFO / standard cost (Coming Soon)",
      why: "Selling price is not cost — valuation method engine required.",
      entities: ["item_cost_history", "valuation_snapshots"],
      apis: ["GET /api/v1/admin/inventory/valuation"],
      permission: "inventory.manage + payment.read",
      related: "Finance module consumes valuation snapshots.",
    },
  ];
}

export function formatStockQty(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
  return `${rounded} ${unit}`;
}

export function formatMovementLabel(movement: StockMovement): string {
  const sign = movement.quantity > 0 ? "+" : "";
  const name = movement.itemName ?? movement.itemSku ?? movement.inventoryItemId.slice(0, 8);
  return `${movement.movementType}: ${sign}${movement.quantity} · ${name}`;
}

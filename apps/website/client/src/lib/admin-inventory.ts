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
  stockValue: number | null;
  wasteTodayQty: number | null;
  receivedTodayQty: number | null;
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
      status: "present",
      note: "RC4-9 inventory_recipes + activate sync to menu_item_inventory_components.",
    },
    {
      id: "consumption",
      label: "Order consumption engine",
      status: "present",
      note: "LIVE — kitchen ticket → preparing consumes mapped stock once (REQ-KIT-012 / RC4-9).",
    },
    {
      id: "suppliers",
      label: "Suppliers & purchase orders",
      status: "present",
      note: "suppliers + purchase_orders via /api/v1/admin/purchasing/* (see Purchasing workspace).",
    },
    {
      id: "receiving",
      label: "Goods receiving / GRN",
      status: "present",
      note: "GET/POST /api/v1/admin/purchasing/receiving — GRN posts stock for mapped inventory lines.",
    },
    {
      id: "valuation",
      label: "Cost valuation",
      status: "partial",
      note: "Derived Σ(current_stock × cost_price) when cost set — FIFO/WAC engine Planned for Phase 2.",
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
  movements: StockMovement[] | null = null,
): InventoryKpiSnapshot {
  const modifierGroups = [...items, ...toppings].reduce(
    (sum, item) => sum + (item.modifierGroups?.length ?? 0),
    0,
  );
  const today = new Date().toISOString().slice(0, 10);
  let stockValue: number | null = null;
  let wasteTodayQty: number | null = null;
  let receivedTodayQty: number | null = null;

  if (stockItems != null) {
    stockValue = stockItems.reduce((sum, item) => {
      if (item.costPrice == null) return sum;
      return sum + item.currentStock * item.costPrice;
    }, 0);
  }

  if (movements != null) {
    wasteTodayQty = 0;
    receivedTodayQty = 0;
    for (const m of movements) {
      if (m.createdAt.slice(0, 10) !== today) continue;
      const type = m.movementType.toLowerCase();
      if (type === "waste") wasteTodayQty += Math.abs(m.quantity);
      if (type === "receipt" || type === "purchase") receivedTodayQty += Math.abs(m.quantity);
    }
  }

  return {
    menuBrowseSkus: items.length,
    menuInternalSkus: toppings.length,
    modifierGroupsInCatalog: modifierGroups,
    unmappedRecipeProducts: items.length + toppings.length,
    stockItemCount: stockItems == null ? null : stockItems.length,
    lowStockCount: stockItems == null ? null : stockItems.filter(isLowStock).length,
    stockValue,
    wasteTodayQty,
    receivedTodayQty,
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
      title:
        snapshot.stockItemCount === 0
          ? `No inventory items have been added for ${branchLabel}.`
          : `${snapshot.stockItemCount} stock item${snapshot.stockItemCount === 1 ? "" : "s"} on hand for ${branchLabel}`,
      detail:
        snapshot.stockItemCount === 0
          ? "Add opening stock to begin low-stock monitoring."
          : "Updated from current branch operations.",
      source: "live",
    });
  }

  if (snapshot.lowStockCount != null && snapshot.lowStockCount > 0) {
    items.push({
      id: "live-low-stock",
      title: `${snapshot.lowStockCount} item${snapshot.lowStockCount === 1 ? "" : "s"} need replenishment`,
      detail: "On-hand quantity is at or below the reorder / minimum level you set on each item.",
      source: "live",
    });
  } else if (snapshot.lowStockCount === 0) {
    items.push({
      id: "live-low-stock-clear",
      title: "No low-stock alerts right now",
      detail: "Every tracked item is above its minimum / reorder level in this scope.",
      source: "live",
    });
  }

  if (snapshot.wasteTodayQty != null && snapshot.wasteTodayQty > 0) {
    items.push({
      id: "waste-today",
      title: `Waste logged today: ${snapshot.wasteTodayQty}`,
      detail: "From waste movements recorded today.",
      source: "live",
    });
  }

  if (snapshot.unmappedRecipeProducts > 0) {
    items.push({
      id: "unmapped-recipes",
      title: `${snapshot.unmappedRecipeProducts} catalog SKUs may lack active recipes.`,
      detail: "Items without an active recipe do not deduct stock at kitchen preparing.",
      source: "derived",
    });
  }

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
      unavailable: "— LIVE via Purchasing GRN",
      why: "Goods receiving posts stock for mapped inventory lines via /admin/purchasing/receiving.",
      entities: ["goods_receiving", "goods_receiving_lines", "stock_movements"],
      apis: ["GET/POST /api/v1/admin/purchasing/receiving"],
      permission: "purchasing.manage or inventory.manage",
      related: "Open Purchasing workspace to record GRNs.",
    },
    {
      id: "transfers",
      title: "Stock transfers",
      unavailable: "Branch-to-branch transfers — Planned for Phase 2",
      why: "Transfers require dual-sided movement records and approval workflow.",
      entities: ["stock_transfers", "transfer_lines", "transfer_status_log"],
      apis: ["POST /api/v1/admin/inventory/transfers (Planned for Phase 2)"],
      permission: "inventory.manage + branch scope",
      related: "Dispatch and receive quantities must reconcile.",
    },
    {
      id: "adjustments",
      title: "Adjustments & stock counts",
      unavailable: "— LIVE",
      why: "POST /admin/inventory/adjustments writes stock_movements and updates current_stock (adjustment|receipt|waste).",
      entities: ["stock_movements", "inventory_items"],
      apis: ["POST /api/v1/admin/inventory/adjustments"],
      permission: "inventory.manage or admin.access",
      related: "Physical count variance workflows Planned for Phase 2.",
    },
    {
      id: "waste",
      title: "Waste & spoilage",
      unavailable: "— LIVE via adjustments (movementType=waste)",
      why: "Post negative quantity adjustments with movementType waste; dedicated reason-code master Planned for Phase 2.",
      entities: ["stock_movements"],
      apis: ["POST /api/v1/admin/inventory/adjustments"],
      permission: "inventory.manage",
      related: "Kitchen overproduction may link to prep tickets later.",
    },
    {
      id: "reorder",
      title: "Reorder planning",
      unavailable: "Suggested PO quantities — Planned for Phase 2",
      why: "Low-stock list uses reorder_level / minimum_stock on live balances; suggestions API not shipped.",
      entities: ["reorder_rules", "par_levels", "preferred_suppliers"],
      apis: ["GET /api/v1/admin/inventory/reorder-suggestions (Planned for Phase 2)"],
      permission: "inventory.manage",
      related: "Purchasing module consumes suggestions — no AI demand forecast.",
    },
    {
      id: "valuation",
      title: "Stock valuation",
      unavailable: "FIFO/WAC engine — Planned for Phase 2 (derived cost×qty LIVE)",
      why: "Derived Σ(current_stock × cost_price) when cost is set. Selling price is not cost.",
      entities: ["inventory_items"],
      apis: ["GET /api/v1/admin/inventory/items"],
      permission: "inventory.manage + payment.read",
      related: "Finance GL auto-post of COGS Planned for Phase 2.",
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

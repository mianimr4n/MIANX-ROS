import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Atomic inventory adjustment — movement insert + current_stock update are one RPC.
 * If the RPC fails, no movement is returned (DB rolls back both writes).
 */

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
  }),
}));

import { createInventoryService } from "../src/services/inventory/management.js";
import { ApiError } from "../src/common/http.js";

const ITEM_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const BRANCH_ID = "550e8400-e29b-41d4-a716-446655440000";

const scope = {
  userId: "user-admin",
  isSuperAdmin: false,
  roles: ["branch-manager"],
  branchIds: [BRANCH_ID],
};

function chain(result: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const method of ["select", "eq", "order", "limit", "update", "insert", "in"]) {
    api[method] = vi.fn(self);
  }
  api.maybeSingle = vi.fn(async () => result);
  api.single = vi.fn(async () => result);
  return api;
}

const envStatus = {
  config: {
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceRoleKey: "service-role-key",
  },
} as never;

const itemRow = {
  id: ITEM_ID,
  branch_id: BRANCH_ID,
  sku: "FLOUR-25",
  name: "Flour 25kg",
  category: "dry",
  unit: "bag",
  current_stock: 10,
  minimum_stock: 2,
  reorder_level: 4,
  cost_price: 4500,
  status: "active",
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T00:00:00.000Z",
  branch: { id: BRANCH_ID, branch_code: "royal-orchard", name: "Royal Orchard" },
};

describe("atomic inventory stock adjustment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "inventory_items") {
        return chain({ data: itemRow, error: null });
      }
      if (table === "branches") {
        return chain({
          data: { id: BRANCH_ID, branch_code: "royal-orchard", name: "Royal Orchard", status: "active" },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });
  });

  it("routes adjustments through adjust_inventory_stock_atomic", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        item: {
          id: ITEM_ID,
          branchId: BRANCH_ID,
          sku: "FLOUR-25",
          name: "Flour 25kg",
          category: "dry",
          unit: "bag",
          currentStock: 12,
          minimumStock: 2,
          reorderLevel: 4,
          costPrice: 4500,
          status: "active",
          createdAt: itemRow.created_at,
          updatedAt: itemRow.updated_at,
        },
        movement: {
          id: "mov-1",
          inventoryItemId: ITEM_ID,
          branchId: BRANCH_ID,
          movementType: "adjustment",
          quantity: 2,
          referenceType: null,
          referenceId: null,
          reason: "Count correction",
          createdBy: "user-admin",
          itemName: "Flour 25kg",
          itemSku: "FLOUR-25",
        },
      },
      error: null,
    });

    const service = createInventoryService(envStatus);
    const result = await service.createAdjustment(scope, "user-admin", {
      inventoryItemId: ITEM_ID,
      quantityDelta: 2,
      reason: "Count correction",
    });

    expect(rpc).toHaveBeenCalledWith("adjust_inventory_stock_atomic", {
      p_inventory_item_id: ITEM_ID,
      p_quantity_delta: 2,
      p_movement_type: "adjustment",
      p_reason: "Count correction",
      p_actor_user_id: "user-admin",
      p_reference_type: null,
      p_reference_id: null,
    });
    expect(result.item.currentStock).toBe(12);
    expect(result.movement.quantity).toBe(2);
    // No separate stock_movements insert outside the RPC.
    expect(from).not.toHaveBeenCalledWith("stock_movements");
  });

  it("does not record a movement when the atomic update fails", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "INVENTORY_STOCK_UPDATE_FAILED" },
    });

    const service = createInventoryService(envStatus);
    await expect(
      service.createAdjustment(scope, "user-admin", {
        inventoryItemId: ITEM_ID,
        quantityDelta: 1,
      }),
    ).rejects.toMatchObject({ code: "STOCK_ADJUSTMENT_FAILED", statusCode: 500 });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalledWith("stock_movements");
  });

  it("surfaces INSUFFICIENT_STOCK from the atomic RPC without writing a movement", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "INSUFFICIENT_STOCK" },
    });

    const service = createInventoryService(envStatus);
    await expect(
      service.createAdjustment(scope, "user-admin", {
        inventoryItemId: ITEM_ID,
        quantityDelta: -999,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", statusCode: 409 });

    expect(from).not.toHaveBeenCalledWith("stock_movements");
  });

  it("rejects zero quantity before calling the RPC", async () => {
    const service = createInventoryService(envStatus);
    await expect(
      service.createAdjustment(scope, "user-admin", {
        inventoryItemId: ITEM_ID,
        quantityDelta: 0,
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(rpc).not.toHaveBeenCalled();
  });
});

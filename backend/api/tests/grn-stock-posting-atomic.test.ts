import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GRN create posts stock_movements (purchase) + current_stock for mapped inventory lines.
 */

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
  }),
}));

import { createPurchasingService } from "../src/services/purchasing/management.js";

const BRANCH_ID = "550e8400-e29b-41d4-a716-446655440000";
const ITEM_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const GRN_ID = "6ba7b820-9dad-11d1-80b4-00c04fd430c8";

const scope = {
  userId: "user-admin",
  isSuperAdmin: false,
  roles: ["branch-manager"],
  branchIds: [BRANCH_ID],
};

function chain(result: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const method of ["select", "eq", "order", "limit", "update", "insert", "in", "maybeSingle", "single"]) {
    api[method] = vi.fn(typeof method === "string" && (method === "maybeSingle" || method === "single") ? async () => result : self);
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

const grnRow = {
  id: GRN_ID,
  branch_id: BRANCH_ID,
  purchase_order_id: null,
  grn_number: "GRN-TEST-1",
  status: "posted",
  received_at: "2026-07-30T12:00:00.000Z",
  notes: null,
  created_by: "user-admin",
  created_at: "2026-07-30T12:00:00.000Z",
  updated_at: "2026-07-30T12:00:00.000Z",
  branch: { id: BRANCH_ID, branch_code: "royal-orchard", name: "Royal Orchard" },
  purchase_order: null,
};

describe("atomic GRN stock posting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "branches") {
        return chain({
          data: { id: BRANCH_ID, branch_code: "royal-orchard", name: "Royal Orchard", status: "active" },
          error: null,
        });
      }
      if (table === "goods_receiving") {
        return chain({ data: grnRow, error: null });
      }
      return chain({ data: null, error: null });
    });
  });

  it("creates a GRN with a mapped inventory item and returns increased stock", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: GRN_ID,
        branchId: BRANCH_ID,
        purchaseOrderId: null,
        grnNumber: "GRN-TEST-1",
        status: "posted",
        receivedAt: grnRow.received_at,
        notes: null,
        createdBy: "user-admin",
        createdAt: grnRow.created_at,
        updatedAt: grnRow.updated_at,
        postedLines: [
          {
            lineId: "line-1",
            inventoryItemId: ITEM_ID,
            quantity: 5,
            movementId: "mov-grn-1",
            currentStock: 15,
          },
        ],
        skippedLines: [],
      },
      error: null,
    });

    const service = createPurchasingService(envStatus);
    const result = await service.createReceiving(scope, "user-admin", {
      branchId: BRANCH_ID,
      grnNumber: "GRN-TEST-1",
      lines: [{ inventoryItemId: ITEM_ID, quantity: 5 }],
    });

    expect(rpc).toHaveBeenCalledWith("create_goods_receiving_with_stock_atomic", {
      p_branch_id: BRANCH_ID,
      p_purchase_order_id: null,
      p_grn_number: "GRN-TEST-1",
      p_status: "posted",
      p_notes: null,
      p_received_at: null,
      p_actor_user_id: "user-admin",
      p_lines: [{ inventoryItemId: ITEM_ID, quantity: 5 }],
    });
    expect(result.grnNumber).toBe("GRN-TEST-1");
    expect(result.postedLines).toHaveLength(1);
    expect(result.postedLines?.[0]?.inventoryItemId).toBe(ITEM_ID);
    expect(result.postedLines?.[0]?.quantity).toBe(5);
    expect(result.postedLines?.[0]?.currentStock).toBe(15);
  });

  it("skips missing inventory items without blocking GRN creation", async () => {
    const missingId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    rpc.mockResolvedValueOnce({
      data: {
        id: GRN_ID,
        branchId: BRANCH_ID,
        purchaseOrderId: null,
        grnNumber: "GRN-TEST-2",
        status: "posted",
        receivedAt: grnRow.received_at,
        notes: null,
        createdBy: "user-admin",
        createdAt: grnRow.created_at,
        updatedAt: grnRow.updated_at,
        postedLines: [],
        skippedLines: [
          {
            inventoryItemId: missingId,
            quantity: 3,
            reason: "inventory_item_not_found",
          },
        ],
      },
      error: null,
    });

    const service = createPurchasingService(envStatus);
    const result = await service.createReceiving(scope, "user-admin", {
      branchId: BRANCH_ID,
      grnNumber: "GRN-TEST-2",
      lines: [{ inventoryItemId: missingId, quantity: 3 }],
    });

    expect(result.id).toBe(GRN_ID);
    expect(result.postedLines).toEqual([]);
    expect(result.skippedLines?.[0]?.reason).toBe("inventory_item_not_found");
  });
});

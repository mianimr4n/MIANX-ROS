import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Transactional price-audit behaviour for the menu management service.
 * The Supabase client is stubbed; the atomic RPC contract is asserted.
 */

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
  }),
}));

import { createMenuManagementService } from "../src/services/menu/management.js";
import { ApiError } from "../src/common/http.js";

const SKU_ID = "aaaaaaaa-0000-4000-8000-000000000002";
const ACTOR = { userId: "u-owner", isSuperAdmin: false };

function skuRow(price = 1250) {
  return {
    id: SKU_ID,
    category_id: "aaaaaaaa-0000-4000-8000-00000000000c",
    slug: "tele-special-medium",
    name: 'Tele Special — 10" Medium',
    product_group_slug: "tele-special",
    size_label: '10" Medium',
    size_code: "medium",
    description: null,
    price,
    is_available: true,
    is_featured: false,
    image_url: null,
    badge: null,
    product_type: "pizza",
    sort_order: 2,
  };
}

function chain(result: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const method of ["select", "eq", "order", "limit", "update", "insert"]) {
    api[method] = vi.fn(self);
  }
  api.maybeSingle = vi.fn(async () => result);
  return api;
}

const envStatus = {
  config: {
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceRoleKey: "service-role-key",
  },
} as never;

describe("atomic menu price update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "menu_items") {
        return chain({ data: skuRow(), error: null });
      }
      if (table === "menu_categories") {
        return chain({
          data: { id: "aaaaaaaa-0000-4000-8000-00000000000c", slug: "signature-pizzas" },
          error: null,
        });
      }
      if (table === "menu_audit_events") {
        return chain({ data: null, error: null });
      }
      return chain({ data: null, error: null });
    });
  });

  it("routes a price change through update_menu_item_price_atomic", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        menuItemId: SKU_ID,
        price: 1390,
        oldPrice: 1250,
        auditId: "audit-1",
        changed: true,
        idempotentReplay: false,
      },
      error: null,
    });
    // after loadSku
    from.mockImplementation(() => chain({ data: skuRow(1390), error: null }));

    const service = createMenuManagementService(envStatus);
    const result = await service.updateSku(ACTOR, SKU_ID, {
      price: 1390,
      correlationId: "corr-raise-1",
      expectedOldPrice: 1250,
    });

    expect(rpc).toHaveBeenCalledWith("update_menu_item_price_atomic", {
      p_menu_item_id: SKU_ID,
      p_new_price: 1390,
      p_actor_user_id: "u-owner",
      p_correlation_id: "corr-raise-1",
      p_expected_old_price: 1250,
    });
    expect(result.price).toBe(1390);
  });

  it("rejects a negative price before calling the RPC", async () => {
    const service = createMenuManagementService(envStatus);
    await expect(service.updateSku(ACTOR, SKU_ID, { price: -1 })).rejects.toBeInstanceOf(ApiError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces PRICE_CONFLICT from the atomic RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "PRICE_CONFLICT" },
    });
    const service = createMenuManagementService(envStatus);
    await expect(
      service.updateSku(ACTOR, SKU_ID, { price: 1400, expectedOldPrice: 1250 }),
    ).rejects.toMatchObject({ code: "PRICE_CONFLICT", statusCode: 409 });
  });

  it("treats an unchanged price as a successful no-op from the RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        menuItemId: SKU_ID,
        price: 1250,
        oldPrice: 1250,
        auditId: null,
        changed: false,
        idempotentReplay: false,
      },
      error: null,
    });
    from.mockImplementation(() => chain({ data: skuRow(1250), error: null }));
    const service = createMenuManagementService(envStatus);
    const result = await service.updateSku(ACTOR, SKU_ID, { price: 1250 });
    expect(result.price).toBe(1250);
  });
});

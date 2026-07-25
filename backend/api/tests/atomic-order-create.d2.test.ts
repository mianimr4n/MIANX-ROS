import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * D2 — Atomic create service wiring.
 * Asserts createOrder calls create_order_atomic RPC (no compensating deletes).
 * Live rollback coverage: scripts/d2/atomic-order-live-tests.mjs
 */

const rpc = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from, rpc }),
}));

import { createOrdersDataSource } from "../src/services/orders/supabase.js";

const envStatus = {
  isReady: true,
  issues: [],
  config: {
    port: 4000,
    corsOrigin: "http://localhost:3000",
    jwtSecret: "x".repeat(20),
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon",
    supabaseServiceRoleKey: "service",
  },
} as never;

const ds = createOrdersDataSource(envStatus);
const B1 = "11111111-1111-4111-8111-111111111111";

function mockHappyCatalog() {
  from.mockImplementation(((table: string) => {
    if (table === "orders") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    }
    if (table === "branches") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: B1, branch_code: "royal-orchard", status: "operating" },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "menu_items") {
      return {
        select: () => ({
          in: async () => ({
            data: [
              {
                id: "mi-1",
                slug: "margherita-pizza",
                name: "Margherita",
                base_price: 1000,
                product_type: "pizza",
                is_available: true,
                variants: [
                  { id: "v1", label: "Regular", price: 1000, is_available: true, size_code: "R" },
                ],
              },
            ],
            error: null,
          }),
        }),
      };
    }
    if (table === "modifier_options") {
      return {
        select: () => ({
          in: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    };
  }) as typeof from);
}

beforeEach(() => {
  rpc.mockReset();
  from.mockClear();
  maybeSingle.mockReset();
});

describe("D2 — createOrder uses atomic RPC", () => {
  it("maps BRANCH_NOT_OPERATIONAL from RPC without compensating delete", async () => {
    mockHappyCatalog();
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "BRANCH_NOT_OPERATIONAL", code: "P0001" },
    });

    await expect(
      ds.createOrder({
        branchCode: "royal-orchard",
        orderType: "pickup",
        orderSource: "pos",
        contactName: "Walk-in",
        contactPhone: "03001234567",
        items: [{ menuItemSlug: "margherita-pizza", quantity: 1, variantLabel: "Regular" }],
        idempotencyKey: "idem-atomic-1",
      }),
    ).rejects.toMatchObject({ code: "BRANCH_NOT_OPERATIONAL" });

    expect(rpc).toHaveBeenCalledWith(
      "create_order_atomic",
      expect.objectContaining({
        p_create_kitchen_ticket: true,
        p_create_payment_pending: true,
      }),
    );
  });

  it("returns idempotentReplay from atomic RPC payload", async () => {
    mockHappyCatalog();
    rpc.mockResolvedValueOnce({
      data: {
        id: "ord-1",
        orderNumber: "TP-250725-000001",
        status: "confirmed",
        subtotal: 1000,
        discountAmount: 0,
        taxAmount: 0,
        deliveryFee: 0,
        totalAmount: 1000,
        createdAt: new Date().toISOString(),
        idempotentReplay: true,
      },
      error: null,
    });

    const res = await ds.createOrder({
      branchCode: "royal-orchard",
      orderType: "pickup",
      orderSource: "pos",
      contactName: "Walk-in",
      contactPhone: "03001234567",
      items: [{ menuItemSlug: "margherita-pizza", quantity: 1, variantLabel: "Regular" }],
      idempotencyKey: "idem-atomic-2",
    });
    expect(res.idempotentReplay).toBe(true);
    expect(res.orderNumber).toBe("TP-250725-000001");
    expect(res.taxAmount).toBe(0);
  });

  it("source file no longer uses compensating order deletes on create path", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "../src/services/orders/supabase.ts"), "utf8");
    expect(src).toMatch(/create_order_atomic/);
    expect(src).not.toMatch(/ORDER_ITEMS_CREATE_FAILED[\s\S]*\.delete\(\)\.eq\("id", order\.id\)/);
  });
});

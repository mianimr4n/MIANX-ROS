import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  sessions: Array<Record<string, unknown>>;
  bills: Array<Record<string, unknown>>;
  billOrders: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
}

const state: FakeState = {
  sessions: [],
  bills: [],
  billOrders: [],
  orders: [],
};

function matchFilters(row: Record<string, unknown>, filters: Array<[string, string, unknown]>): boolean {
  return filters.every(([kind, col, val]) => {
    if (kind === "eq") return row[col] === val;
    if (kind === "in") return Array.isArray(val) && (val as unknown[]).includes(row[col]);
    return true;
  });
}

class FakeQuery {
  private op: "select" | "insert" | "update" = "select";
  private asSingle = false;
  private filters: Array<[string, string, unknown]> = [];
  private payload: unknown = null;
  private selectCols: string | null = null;
  constructor(private table: string) {}
  select(cols?: string) {
    if (this.op !== "insert" && this.op !== "update") this.op = "select";
    this.selectCols = cols ?? null;
    return this;
  }
  insert(row: unknown) {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  update(patch: Record<string, unknown>) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push(["eq", c, v]);
    return this;
  }
  in(c: string, v: unknown) {
    this.filters.push(["in", c, v]);
    return this;
  }
  order() {
    return this;
  }
  maybeSingle() {
    this.asSingle = true;
    return this.resolve();
  }
  single() {
    this.asSingle = true;
    return this.resolve();
  }
  then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
    return this.resolve().then(res, rej);
  }
  private resolve(): Promise<{ data: unknown; error: unknown }> {
    if (this.table === "dine_in_sessions") {
      const matched = state.sessions.filter((o) => matchFilters(o, this.filters));
      if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
      return Promise.resolve({ data: matched, error: null });
    }
    if (this.table === "orders") {
      const matched = state.orders.filter((o) => matchFilters(o, this.filters));
      if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
      return Promise.resolve({ data: matched, error: null });
    }
    if (this.table === "bill_orders") {
      if (this.op === "select") {
        let matched = state.billOrders.filter((o) => matchFilters(o, this.filters));
        if (this.selectCols?.includes("orders:orders")) {
          matched = matched.map((bo) => ({
            ...bo,
            orders: state.orders.find((o) => o.id === bo.order_id) ?? null,
          }));
        }
        if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null });
      }
      if (this.op === "insert") {
        const payload = this.payload as Record<string, unknown>;
        const row: Record<string, unknown> = {
          id: `bo-${state.billOrders.length + 1}`,
          added_at: "2026-07-18T10:00:00Z",
          ...payload,
        };
        if (state.billOrders.some((b) => b.order_id === row.order_id)) {
          return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate" } });
        }
        state.billOrders.push(row);
        return Promise.resolve({ data: row, error: null });
      }
    }
    if (this.table === "restaurant_bills") {
      if (this.op === "select") {
        let matched = state.bills.filter((o) => matchFilters(o, this.filters));
        if (this.selectCols?.includes("orders:bill_orders")) {
          matched = matched.map((b) => ({
            ...b,
            orders: state.billOrders.filter((bo) => bo.restaurant_bill_id === b.id),
          }));
        }
        if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null });
      }
      if (this.op === "insert") {
        const row: Record<string, unknown> = {
          id: `rb-${state.bills.length + 1}`,
          opened_at: "2026-07-18T10:00:00Z",
          created_at: "2026-07-18T10:00:00Z",
          updated_at: "2026-07-18T10:00:00Z",
          closed_at: null,
          opened_by_user_id: null,
          closed_by_user_id: null,
          ...(this.payload as Record<string, unknown>),
        };
        state.bills.push(row);
        if (this.asSingle) return Promise.resolve({ data: { id: row.id }, error: null });
        return Promise.resolve({ data: row, error: null });
      }
      if (this.op === "update") {
        const matched = state.bills.filter((o) => matchFilters(o, this.filters));
        for (const target of matched) Object.assign(target, this.payload as Record<string, unknown>);
        if (this.asSingle) {
          return Promise.resolve({
            data: matched[0]
              ? {
                  id: matched[0].id,
                  status: matched[0].status,
                  closed_at: matched[0].closed_at,
                  closed_by_user_id: matched[0].closed_by_user_id,
                }
              : null,
            error: null,
          });
        }
        return Promise.resolve({ data: matched[0] ?? null, error: null });
      }
    }
    return Promise.resolve({ data: null, error: null });
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => new FakeQuery(table),
    rpc: async (fn: string) => {
      if (fn === "next_restaurant_bill_number") {
        return { data: `RO-20260718-${String(state.bills.length + 1).padStart(4, "0")}`, error: null };
      }
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    },
  }),
}));

import { ApiError } from "../src/common/http.js";
import {
  attachConfirmedDineInOrderToBill,
  createRestaurantBillsService,
} from "../src/services/bills/restaurant-bills.js";
import { createClient } from "@supabase/supabase-js";

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

const B1 = "11111111-1111-1111-1111-111111111111";
const B2 = "22222222-2222-2222-2222-222222222222";
const S1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const service = createRestaurantBillsService(envStatus);
const supabase = createClient("https://example.supabase.co", "service");

const cashier = {
  userId: "u-cashier",
  isSuperAdmin: false,
  roles: ["cashier"],
  branchIds: [B1],
};
const kitchen = {
  userId: "u-kitchen",
  isSuperAdmin: false,
  roles: ["kitchen"],
  branchIds: [B1],
};
const bm = {
  userId: "u-bm",
  isSuperAdmin: false,
  roles: ["branch-manager"],
  branchIds: [B1],
};
const superAdmin = {
  userId: "u-sa",
  isSuperAdmin: true,
  roles: ["super-admin"],
  branchIds: [] as string[],
};

beforeEach(() => {
  state.sessions = [{ id: S1, branch_id: B1 }];
  state.bills = [];
  state.billOrders = [];
  state.orders = [];
});

describe("attachConfirmedDineInOrderToBill", () => {
  it("skips delivery and pickup", async () => {
    state.orders = [
      {
        id: "o1",
        status: "confirmed",
        order_type: "delivery",
        branch_id: B1,
        dine_in_session_id: null,
        total_amount: 100,
      },
    ];
    const res = await attachConfirmedDineInOrderToBill(supabase, "o1");
    expect(res.linked).toBe(false);
    expect(state.bills).toHaveLength(0);
  });

  it("creates open bill and links confirmed dine-in order (idempotent)", async () => {
    state.orders = [
      {
        id: "o1",
        status: "confirmed",
        order_type: "dine-in",
        branch_id: B1,
        dine_in_session_id: S1,
        total_amount: 500,
      },
    ];
    const first = await attachConfirmedDineInOrderToBill(supabase, "o1");
    expect(first.linked).toBe(true);
    expect(first.createdBill).toBe(true);
    expect(state.bills).toHaveLength(1);
    expect(state.billOrders).toHaveLength(1);

    const second = await attachConfirmedDineInOrderToBill(supabase, "o1");
    expect(second.linked).toBe(true);
    expect(second.createdBill).toBe(false);
    expect(state.bills).toHaveLength(1);
    expect(state.billOrders).toHaveLength(1);
  });
});

describe("restaurant bills close", () => {
  it("rejects close when linked orders are not final", async () => {
    state.bills = [
      {
        id: "rb1",
        dine_in_session_id: S1,
        branch_id: B1,
        bill_number: "RO-20260718-0001",
        status: "open",
        subtotal: 100,
        tax_amount: 0,
        discount_amount: 0,
        grand_total: 100,
        opened_at: "2026-07-18T10:00:00Z",
        closed_at: null,
        closed_by_user_id: null,
        created_at: "2026-07-18T10:00:00Z",
        updated_at: "2026-07-18T10:00:00Z",
      },
    ];
    state.orders = [{ id: "o1", status: "preparing", branch_id: B1 }];
    state.billOrders = [{ id: "bo1", restaurant_bill_id: "rb1", order_id: "o1", added_at: "t" }];

    await expect(service.closeBill({ scope: cashier, billId: "rb1", status: "paid" })).rejects.toMatchObject({
      code: "BILL_ORDERS_NOT_FINAL",
    });
    expect(state.bills[0].status).toBe("open");
  });

  it("closes to paid when all linked orders are final", async () => {
    state.bills = [
      {
        id: "rb1",
        dine_in_session_id: S1,
        branch_id: B1,
        bill_number: "RO-20260718-0001",
        status: "open",
        subtotal: 100,
        tax_amount: 0,
        discount_amount: 0,
        grand_total: 100,
        opened_at: "2026-07-18T10:00:00Z",
        closed_at: null,
        closed_by_user_id: null,
        created_at: "2026-07-18T10:00:00Z",
        updated_at: "2026-07-18T10:00:00Z",
      },
    ];
    state.orders = [{ id: "o1", status: "completed", branch_id: B1 }];
    state.billOrders = [{ id: "bo1", restaurant_bill_id: "rb1", order_id: "o1", added_at: "t" }];

    const res = await service.closeBill({ scope: bm, billId: "rb1", status: "paid" });
    expect(res.status).toBe("paid");
    expect(res.idempotentReplay).toBe(false);
    expect(state.bills[0].status).toBe("paid");
    expect(state.bills[0].closed_by_user_id).toBe("u-bm");
  });

  it("rejects mutate of paid bill (immutability)", async () => {
    state.bills = [
      {
        id: "rb1",
        dine_in_session_id: S1,
        branch_id: B1,
        bill_number: "RO-20260718-0001",
        status: "paid",
        subtotal: 100,
        tax_amount: 0,
        discount_amount: 0,
        grand_total: 100,
        opened_at: "2026-07-18T10:00:00Z",
        closed_at: "2026-07-18T11:00:00Z",
        closed_by_user_id: "u-bm",
        created_at: "2026-07-18T10:00:00Z",
        updated_at: "2026-07-18T11:00:00Z",
      },
    ];
    await expect(service.closeBill({ scope: cashier, billId: "rb1", status: "voided" })).rejects.toMatchObject({
      code: "BILL_IMMUTABLE",
    });
  });

  it("denies kitchen role and cross-branch cashier", async () => {
    state.bills = [
      {
        id: "rb1",
        dine_in_session_id: S1,
        branch_id: B1,
        bill_number: "RO-20260718-0001",
        status: "open",
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        grand_total: 0,
        opened_at: "2026-07-18T10:00:00Z",
        closed_at: null,
        closed_by_user_id: null,
        created_at: "2026-07-18T10:00:00Z",
        updated_at: "2026-07-18T10:00:00Z",
      },
    ];
    await expect(service.closeBill({ scope: kitchen, billId: "rb1", status: "voided" })).rejects.toMatchObject({
      code: "BILL_ACCESS_DENIED",
    });
    await expect(
      service.closeBill({
        scope: { ...cashier, branchIds: [B2] },
        billId: "rb1",
        status: "voided",
      }),
    ).rejects.toMatchObject({ code: "BILL_ACCESS_DENIED" });
  });

  it("super-admin can list and close", async () => {
    state.bills = [
      {
        id: "rb1",
        dine_in_session_id: S1,
        branch_id: B1,
        bill_number: "RO-20260718-0001",
        status: "open",
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        grand_total: 0,
        opened_at: "2026-07-18T10:00:00Z",
        closed_at: null,
        closed_by_user_id: null,
        created_at: "2026-07-18T10:00:00Z",
        updated_at: "2026-07-18T10:00:00Z",
        opened_by_user_id: null,
      },
    ];
    const listed = await service.listBillsBySession(superAdmin, S1);
    expect(listed).toHaveLength(1);
    const closed = await service.closeBill({ scope: superAdmin, billId: "rb1", status: "voided" });
    expect(closed.status).toBe("voided");
  });
});

describe("assertBillActor via list", () => {
  it("ApiError for unauthorized roles", async () => {
    await expect(service.listBillsBySession(kitchen, S1)).rejects.toBeInstanceOf(ApiError);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  deliveries: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  riders: Array<Record<string, unknown>>;
  logs: Array<Record<string, unknown>>;
  orderUpdateError?: string | null;
  deliveryRollbackError?: string | null;
}

const state: FakeState = {
  deliveries: [],
  orders: [],
  riders: [],
  logs: [],
  orderUpdateError: null,
  deliveryRollbackError: null,
};

function matchFilters(row: Record<string, unknown>, filters: Array<[string, string, unknown]>): boolean {
  return filters.every(([kind, col, val]) => {
    if (kind === "eq") return row[col] === val;
    if (kind === "in") return Array.isArray(val) && (val as unknown[]).includes(row[col]);
    if (kind === "neq") return row[col] !== val;
    return true;
  });
}

class FakeQuery {
  private op: "select" | "insert" | "update" = "select";
  private asSingle = false;
  private filters: Array<[string, string, unknown]> = [];
  private payload: Record<string, unknown> | null = null;
  private selectCols = "";
  constructor(private table: string) {}
  select(cols?: string) {
    if (this.op !== "insert" && this.op !== "update") this.op = "select";
    this.selectCols = cols ?? "";
    return this;
  }
  insert(row: Record<string, unknown>) {
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
  neq(c: string, v: unknown) {
    this.filters.push(["neq", c, v]);
    return this;
  }
  order() {
    return this;
  }
  range() {
    return this;
  }
  maybeSingle() {
    this.asSingle = true;
    return this.resolve();
  }
  then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
    return this.resolve().then(res, rej);
  }
  private resolve(): Promise<{ data: unknown; error: unknown; count?: number }> {
    if (this.table === "branches") {
      const idEq = this.filters.find((f) => f[0] === "eq" && f[1] === "id");
      const id = typeof idEq?.[2] === "string" ? idEq[2] : "00000000-0000-4000-8000-000000000000";
      return Promise.resolve({
        data: { id, branch_code: "test-branch", status: "operating", name: "Test Branch" },
        error: null,
      });
    }
    if (this.table === "order_status_logs" && this.op === "insert") {
      state.logs.push(this.payload as Record<string, unknown>);
      return Promise.resolve({ data: null, error: null });
    }
    if (this.table === "riders") {
      const matched = state.riders.filter((o) => matchFilters(o, this.filters));
      if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
      return Promise.resolve({ data: matched, error: null });
    }
    if (this.table === "orders") {
      if (this.op === "select") {
        const matched = state.orders.filter((o) => matchFilters(o, this.filters));
        if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null });
      }
      if (this.op === "update") {
        if (state.orderUpdateError) {
          return Promise.resolve({ data: null, error: { message: state.orderUpdateError } });
        }
        const matched = state.orders.filter((o) => matchFilters(o, this.filters));
        for (const target of matched) Object.assign(target, this.payload!);
        return Promise.resolve({
          data: matched[0] ? { status: matched[0].status } : null,
          error: null,
        });
      }
    }
    if (this.table === "deliveries") {
      if (this.op === "select") {
        const matched = state.deliveries.filter((o) => matchFilters(o, this.filters));
        if (this.selectCols.includes("order:orders")) {
          const enriched = matched.map((d) => ({
            ...d,
            order: state.orders.find((o) => o.id === d.order_id) ?? null,
            rider: state.riders.find((r) => r.id === d.rider_id) ?? null,
          }));
          if (this.asSingle) return Promise.resolve({ data: enriched[0] ?? null, error: null });
          return Promise.resolve({ data: enriched, error: null, count: enriched.length });
        }
        if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null, count: matched.length });
      }
      if (this.op === "update") {
        const isRollback =
          this.payload &&
          (this.payload.status === "assigned" || this.payload.status === "pending" || this.payload.status === "picked-up") &&
          (this.payload.picked_up_at === null || this.payload.delivered_at === null);
        if (isRollback && state.deliveryRollbackError) {
          return Promise.resolve({ data: null, error: { message: state.deliveryRollbackError } });
        }
        const matched = state.deliveries.filter((o) => matchFilters(o, this.filters));
        for (const target of matched) Object.assign(target, this.payload!);
        return Promise.resolve({
          data: matched[0] ? { status: matched[0].status } : null,
          error: null,
        });
      }
    }
    return Promise.resolve({ data: null, error: null });
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => new FakeQuery(table),
  }),
}));

import { ApiError } from "../src/common/http.js";
import { createSupabaseDeliveryOperationsDataSource } from "../src/services/deliveries/operations.js";

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

const ds = createSupabaseDeliveryOperationsDataSource(envStatus);
const B1 = "b1";
const B2 = "b2";
const D1 = "d1";
const R1 = "r1";
const O1 = "o1";

const riderScope = {
  userId: "u-rider",
  isSuperAdmin: false,
  roles: ["rider"],
  branchIds: [B1],
  permissions: ["delivery.read", "delivery.update", "order.read"],
};
const bmScope = {
  userId: "u-bm",
  isSuperAdmin: false,
  roles: ["branch-manager"],
  branchIds: [B1],
  permissions: ["order.manage", "delivery.read", "delivery.assign"],
};
const kitchenScope = {
  userId: "u-kitchen",
  isSuperAdmin: false,
  roles: ["kitchen"],
  branchIds: [B1],
  permissions: ["order.manage", "order.read"],
};
const bmOther = {
  userId: "u-bm2",
  isSuperAdmin: false,
  roles: ["branch-manager"],
  branchIds: [B2],
  permissions: ["order.manage", "delivery.read", "delivery.assign"],
};

beforeEach(() => {
  state.deliveries = [];
  state.orders = [];
  state.riders = [];
  state.logs = [];
  state.orderUpdateError = null;
  state.deliveryRollbackError = null;
});

async function expectApiError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
  await promise.catch((e) => expect(e).toBeInstanceOf(ApiError));
}

describe("delivery operations — authz aligned to seed", () => {
  it("kitchen with order.manage cannot update delivery status", async () => {
    state.deliveries = [
      {
        id: D1,
        order_id: O1,
        branch_id: B1,
        rider_id: R1,
        status: "assigned",
        delivery_address: "A",
        assigned_at: "t",
        picked_up_at: null,
        delivered_at: null,
        created_at: "t",
        updated_at: "t",
      },
    ];
    await expectApiError(
      ds.transitionDelivery({ scope: kitchenScope, deliveryId: D1, toStatus: "picked-up" }),
      "AUTHZ_FORBIDDEN",
    );
  });

  it("branch-manager with order.manage cannot update status (uses admin dispatch instead)", async () => {
    state.deliveries = [
      {
        id: D1,
        order_id: O1,
        branch_id: B1,
        rider_id: R1,
        status: "assigned",
        delivery_address: "A",
        assigned_at: "t",
        picked_up_at: null,
        delivered_at: null,
        created_at: "t",
        updated_at: "t",
      },
    ];
    await expectApiError(
      ds.transitionDelivery({ scope: bmScope, deliveryId: D1, toStatus: "picked-up" }),
      "AUTHZ_FORBIDDEN",
    );
  });

  it("rider with delivery.update can pick up and mirrors order to dispatched", async () => {
    state.riders = [{ id: R1, user_id: "u-rider", branch_id: B1, status: "available", full_name: "R", phone: "1", vehicle_type: "bike" }];
    state.deliveries = [
      {
        id: D1,
        order_id: O1,
        branch_id: B1,
        rider_id: R1,
        status: "assigned",
        delivery_address: "A",
        assigned_at: "t",
        picked_up_at: null,
        delivered_at: null,
        created_at: "t",
        updated_at: "t",
      },
    ];
    state.orders = [{ id: O1, order_number: "TP-1", status: "ready", branch_id: B1 }];
    const res = await ds.transitionDelivery({ scope: riderScope, deliveryId: D1, toStatus: "picked-up" });
    expect(res).toMatchObject({ status: "picked-up", orderStatus: "dispatched", idempotentReplay: false });
    expect(state.deliveries[0].status).toBe("picked-up");
    expect(state.orders[0].status).toBe("dispatched");
    expect(state.logs).toHaveLength(1);
  });

  it("other-branch BM is denied on assign", async () => {
    state.deliveries = [
      {
        id: D1,
        order_id: O1,
        branch_id: B1,
        rider_id: null,
        status: "pending",
        delivery_address: "A",
        assigned_at: null,
        picked_up_at: null,
        delivered_at: null,
        created_at: "t",
        updated_at: "t",
      },
    ];
    state.riders = [{ id: R1, user_id: null, branch_id: B1, status: "available" }];
    await expectApiError(ds.assignRider({ scope: bmOther, deliveryId: D1, riderId: R1 }), "DELIVERY_ACCESS_DENIED");
  });
});

describe("delivery operations — mirror consistency", () => {
  it("rolls back delivery when order mirror fails", async () => {
    state.riders = [{ id: R1, user_id: "u-rider", branch_id: B1, status: "available" }];
    state.deliveries = [
      {
        id: D1,
        order_id: O1,
        branch_id: B1,
        rider_id: R1,
        status: "assigned",
        delivery_address: "A",
        assigned_at: "t",
        picked_up_at: null,
        delivered_at: null,
        created_at: "t",
        updated_at: "t",
      },
    ];
    state.orders = [{ id: O1, order_number: "TP-1", status: "ready", branch_id: B1 }];
    state.orderUpdateError = "simulated order write failure";
    await expectApiError(
      ds.transitionDelivery({ scope: riderScope, deliveryId: D1, toStatus: "picked-up" }),
      "ORDER_TRANSITION_FAILED",
    );
    expect(state.deliveries[0].status).toBe("assigned");
    expect(state.deliveries[0].picked_up_at).toBeNull();
    expect(state.orders[0].status).toBe("ready");
  });

  it("idempotent picked-up replay heals order mirror", async () => {
    state.riders = [{ id: R1, user_id: "u-rider", branch_id: B1, status: "available" }];
    state.deliveries = [
      {
        id: D1,
        order_id: O1,
        branch_id: B1,
        rider_id: R1,
        status: "picked-up",
        delivery_address: "A",
        assigned_at: "t",
        picked_up_at: "t",
        delivered_at: null,
        created_at: "t",
        updated_at: "t",
      },
    ];
    state.orders = [{ id: O1, order_number: "TP-1", status: "ready", branch_id: B1 }];
    const res = await ds.transitionDelivery({ scope: riderScope, deliveryId: D1, toStatus: "picked-up" });
    expect(res.idempotentReplay).toBe(true);
    expect(res.orderStatus).toBe("dispatched");
    expect(state.orders[0].status).toBe("dispatched");
  });
});

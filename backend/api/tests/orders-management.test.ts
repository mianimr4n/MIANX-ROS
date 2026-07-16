import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock the Supabase client so the data source runs against an in-memory fake. ---
interface FakeState {
  orders: Array<Record<string, unknown>>;
  logs: Array<Record<string, unknown>>;
  deliveriesUpdated: number;
  /** When set, applied to the target order right before an UPDATE to simulate a concurrent write. */
  concurrentStatusById?: Record<string, string>;
}

const state: FakeState = { orders: [], logs: [], deliveriesUpdated: 0 };

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
  private single = false;
  private filters: Array<[string, string, unknown]> = [];
  private payload: Record<string, unknown> | null = null;
  constructor(private table: string) {}
  select() {
    if (this.op !== "insert" && this.op !== "update") this.op = "select";
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
    this.single = true;
    return this.resolve();
  }
  then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
    return this.resolve().then(res, rej);
  }
  private resolve(): Promise<{ data: unknown; error: unknown; count?: number }> {
    if (this.table === "order_status_logs" && this.op === "insert") {
      state.logs.push(this.payload as Record<string, unknown>);
      return Promise.resolve({ data: null, error: null });
    }
    if (this.table === "deliveries" && this.op === "update") {
      state.deliveriesUpdated += 1;
      return Promise.resolve({ data: null, error: null });
    }
    if (this.table === "orders") {
      if (this.op === "select") {
        const matched = state.orders.filter((o) => matchFilters(o, this.filters));
        if (this.single) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null, count: matched.length });
      }
      if (this.op === "update") {
        const idFilter = this.filters.find((f) => f[1] === "id");
        const target = state.orders.find((o) => o.id === idFilter?.[2]);
        if (target && state.concurrentStatusById?.[target.id as string]) {
          target.status = state.concurrentStatusById[target.id as string];
        }
        if (target && matchFilters(target, this.filters)) {
          Object.assign(target, this.payload);
          return Promise.resolve({ data: { order_number: target.order_number, status: target.status }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }
    }
    return Promise.resolve({ data: null, error: null });
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => new FakeQuery(table) }),
}));

import { ApiError } from "../src/common/http.js";
import { createSupabaseBranchOrderManagementDataSource } from "../src/services/orders/management.js";

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

const ds = createSupabaseBranchOrderManagementDataSource(envStatus);
const B1 = "b1";
const B2 = "b2";

function seedOrder(over: Record<string, unknown> = {}) {
  return {
    id: "o1",
    order_number: "TP-1",
    status: "pending",
    order_type: "delivery",
    order_source: "website",
    branch_id: B1,
    contact_name: "Cust",
    contact_phone: "03001234567",
    payment_status: "pending",
    total_amount: 1200,
    created_at: "2026-07-16T10:00:00Z",
    updated_at: "2026-07-16T10:00:00Z",
    ...over,
  };
}

const bmB1 = { userId: "u-bm", isSuperAdmin: false, roles: ["branch-manager"], branchIds: [B1] };
const cashierB1 = { userId: "u-cashier", isSuperAdmin: false, roles: ["cashier"], branchIds: [B1] };
const superAdmin = { userId: "u-sa", isSuperAdmin: true, roles: ["super-admin"], branchIds: [] };

beforeEach(() => {
  state.orders = [];
  state.logs = [];
  state.deliveriesUpdated = 0;
  state.concurrentStatusById = {};
});

async function expectApiError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
  await promise.catch((e) => expect(e).toBeInstanceOf(ApiError));
}

describe("branch order management — branch isolation", () => {
  it("list returns only in-scope branches (no cross-branch leakage)", async () => {
    state.orders = [seedOrder({ id: "o1", branch_id: B1 }), seedOrder({ id: "o2", order_number: "TP-2", branch_id: B2 })];
    const res = await ds.listBranchOrders(bmB1, { limit: 20, offset: 0 });
    expect(res.orders.map((o) => o.id)).toEqual(["o1"]);
  });

  it("super-admin list sees all branches", async () => {
    state.orders = [seedOrder({ id: "o1", branch_id: B1 }), seedOrder({ id: "o2", order_number: "TP-2", branch_id: B2 })];
    const res = await ds.listBranchOrders(superAdmin, { limit: 20, offset: 0 });
    expect(res.orders.length).toBe(2);
  });

  it("detail on another branch is ORDER_ACCESS_DENIED", async () => {
    state.orders = [seedOrder({ id: "o1", branch_id: B2 })];
    await expectApiError(ds.getBranchOrderDetail(bmB1, "o1"), "ORDER_ACCESS_DENIED");
  });

  it("missing order is ORDER_NOT_FOUND", async () => {
    await expectApiError(ds.getBranchOrderDetail(bmB1, "nope"), "ORDER_NOT_FOUND");
  });

  it("transition on another branch is ORDER_ACCESS_DENIED", async () => {
    state.orders = [seedOrder({ id: "o1", branch_id: B2 })];
    await expectApiError(
      ds.transitionOrder({ scope: bmB1, orderId: "o1", action: "confirm" }),
      "ORDER_ACCESS_DENIED",
    );
  });
});

describe("branch order management — transitions + audit + concurrency", () => {
  it("confirm pending->confirmed writes exactly one audit log", async () => {
    state.orders = [seedOrder({ status: "pending" })];
    const res = await ds.transitionOrder({ scope: cashierB1, orderId: "o1", action: "confirm" });
    expect(res.status).toBe("confirmed");
    expect(res.idempotentReplay).toBe(false);
    expect(state.orders[0].status).toBe("confirmed");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({
      order_id: "o1",
      from_status: "pending",
      to_status: "confirmed",
      actor_type: "staff",
      actor_user_id: "u-cashier",
    });
  });

  it("idempotent repeat (confirm an already-confirmed order) adds NO new log", async () => {
    state.orders = [seedOrder({ status: "confirmed" })];
    const res = await ds.transitionOrder({ scope: cashierB1, orderId: "o1", action: "confirm" });
    expect(res.idempotentReplay).toBe(true);
    expect(state.logs).toHaveLength(0);
  });

  it("reject writes cancelled + rejected_by_branch", async () => {
    state.orders = [seedOrder({ status: "pending" })];
    const res = await ds.transitionOrder({ scope: bmB1, orderId: "o1", action: "reject" });
    expect(res.status).toBe("cancelled");
    expect(state.orders[0].cancel_reason_code).toBe("rejected_by_branch");
    expect(state.logs[0]).toMatchObject({ to_status: "cancelled", reason_code: "rejected_by_branch" });
    expect(state.deliveriesUpdated).toBe(1);
  });

  it("cancel requires reason (VALIDATION_ERROR) and writes none on failure", async () => {
    state.orders = [seedOrder({ status: "pending" })];
    await expectApiError(ds.transitionOrder({ scope: bmB1, orderId: "o1", action: "cancel" }), "VALIDATION_ERROR");
    expect(state.logs).toHaveLength(0);
    expect(state.orders[0].status).toBe("pending");
  });

  it("cashier cannot cancel a preparing order (BM/SA only)", async () => {
    state.orders = [seedOrder({ status: "preparing" })];
    await expectApiError(
      ds.transitionOrder({ scope: cashierB1, orderId: "o1", action: "cancel", reasonCode: "staff_cancelled" }),
      "ORDER_ACCESS_DENIED",
    );
    expect(state.logs).toHaveLength(0);
  });

  it("invalid transition rejected, no log", async () => {
    state.orders = [seedOrder({ status: "ready" })];
    await expectApiError(ds.transitionOrder({ scope: bmB1, orderId: "o1", action: "confirm" }), "INVALID_ORDER_TRANSITION");
    expect(state.logs).toHaveLength(0);
  });

  it("concurrent divergent change yields ORDER_STATE_CONFLICT (no log)", async () => {
    state.orders = [seedOrder({ status: "pending" })];
    // Between read and write, another actor cancels the order.
    state.concurrentStatusById = { o1: "cancelled" };
    await expectApiError(ds.transitionOrder({ scope: bmB1, orderId: "o1", action: "confirm" }), "ORDER_STATE_CONFLICT");
    expect(state.logs).toHaveLength(0);
  });
});

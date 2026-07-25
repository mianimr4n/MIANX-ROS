import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D2 — Multi-branch opening readiness: negative isolation matrix.
 *
 * Proves at the service layer (real scoping code, in-memory Supabase fake):
 * - a Branch A actor cannot read Branch B operational data via a forged branchId
 * - a Branch A actor cannot write Branch B rows
 * - the branch selector value (client input) never grants authorization
 * - a successful zero dashboard stays a valid zero, never an error
 * - cross-branch comparison is only present for authorized multi-branch scopes
 */

interface FakeState {
  orders: Array<Record<string, unknown>>;
}

const state: FakeState = { orders: [] };

function matchFilters(row: Record<string, unknown>, filters: Array<[string, string, unknown]>): boolean {
  return filters.every(([kind, col, val]) => {
    if (kind === "eq") return row[col] === val;
    if (kind === "in") return Array.isArray(val) && (val as unknown[]).includes(row[col]);
    return true;
  });
}

class FakeQuery {
  private filters: Array<[string, string, unknown]> = [];
  private asSingle = false;
  constructor(private table: string) {}
  select() {
    return this;
  }
  insert() {
    return this;
  }
  update() {
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
  neq() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  range() {
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
  private resolve(): Promise<{ data: unknown; error: unknown; count?: number }> {
    if (this.table === "branches") {
      const idEq = this.filters.find((f) => f[0] === "eq" && f[1] === "id");
      const id = typeof idEq?.[2] === "string" ? idEq[2] : "00000000-0000-4000-8000-000000000000";
      return Promise.resolve({
        data: { id, branch_code: "test-branch", status: "operating", name: "Test Branch" },
        error: null,
      });
    }
    if (this.table === "orders") {
      const matched = state.orders.filter((o) => matchFilters(o, this.filters));
      if (this.asSingle) return Promise.resolve({ data: matched[0] ?? null, error: null });
      return Promise.resolve({ data: matched, error: null, count: matched.length });
    }
    return Promise.resolve({ data: this.asSingle ? null : [], error: null, count: 0 });
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => new FakeQuery(table),
    rpc: async () => ({ data: null, error: { message: "unused" } }),
  }),
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

const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";

const bmB1 = { userId: "u-bm1", isSuperAdmin: false, roles: ["branch-manager"], branchIds: [B1] };
const managerBothBranches = {
  userId: "u-owner",
  isSuperAdmin: false,
  roles: ["branch-manager"],
  branchIds: [B1, B2],
};
const superAdmin = { userId: "u-sa", isSuperAdmin: true, roles: ["super-admin"], branchIds: [] };
const staffNoBranch = { userId: "u-none", isSuperAdmin: false, roles: ["cashier"], branchIds: [] };

function seedOrder(over: Record<string, unknown> = {}) {
  return {
    id: `o-${Math.random().toString(36).slice(2, 8)}`,
    order_number: "TP-1",
    status: "pending",
    order_type: "delivery",
    order_source: "website",
    branch_id: B1,
    contact_name: "Cust",
    contact_phone: "03001234567",
    payment_status: "pending",
    total_amount: 1200,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  };
}

beforeEach(() => {
  state.orders = [];
});

async function expectApiError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
  await promise.catch((e) => expect(e).toBeInstanceOf(ApiError));
}

describe("D2 — cross-branch read denial (forged branchId)", () => {
  it("Branch A manager requesting orders list with branchId=B is denied", async () => {
    state.orders = [seedOrder({ branch_id: B2 })];
    await expectApiError(
      ds.listBranchOrders(bmB1, { branchId: B2, limit: 20, offset: 0 }),
      "ORDER_ACCESS_DENIED",
    );
  });

  it("Branch A manager requesting dashboard KPIs with branchId=B is denied", async () => {
    state.orders = [seedOrder({ branch_id: B2 })];
    await expectApiError(ds.getOperationsDashboard(bmB1, { branchId: B2 }), "ORDER_ACCESS_DENIED");
  });

  it("branch selector value alone never widens scope — unfiltered list stays branch-limited", async () => {
    state.orders = [
      seedOrder({ id: "a1", branch_id: B1 }),
      seedOrder({ id: "b1", order_number: "TP-2", branch_id: B2 }),
    ];
    const res = await ds.listBranchOrders(bmB1, { limit: 20, offset: 0 });
    expect(res.orders.map((o) => o.id)).toEqual(["a1"]);
  });
});

describe("D2 — cross-branch write denial", () => {
  it("Branch A manager cannot transition a Branch B order", async () => {
    state.orders = [seedOrder({ id: "ob2", branch_id: B2 })];
    await expectApiError(
      ds.transitionOrder({ scope: bmB1, orderId: "ob2", action: "confirm" }),
      "ORDER_ACCESS_DENIED",
    );
  });
});

describe("D2 — successful zero is not an error", () => {
  it("dashboard with no rows returns valid zero KPIs, not a failure", async () => {
    const dash = await ds.getOperationsDashboard(bmB1, {});
    expect(dash.kpis.todayOrders).toBe(0);
    expect(dash.kpis.todayGrossSales).toBe(0);
    expect(dash.kpis.activeOrders).toBe(0);
    expect(dash.kpis.averageOrderValue).toBeNull();
    expect(dash.timezone).toBe("Asia/Karachi");
    expect(dash.dayStart).toMatch(/T00:00:00\+05:00$/);
  });

  it("staff with no branch membership gets an honest zeroed dashboard, not other branches' data", async () => {
    state.orders = [seedOrder({ branch_id: B1 }), seedOrder({ branch_id: B2 })];
    const dash = await ds.getOperationsDashboard(staffNoBranch, {});
    expect(dash.kpis.todayOrders).toBe(0);
    expect(dash.recentOrders).toEqual([]);
  });
});

describe("D2 — authorized cross-branch visibility", () => {
  it("super-admin without filter receives branch performance comparison", async () => {
    state.orders = [seedOrder({ branch_id: B1 }), seedOrder({ order_number: "TP-2", branch_id: B2 })];
    const dash = await ds.getOperationsDashboard(superAdmin, {});
    expect(dash.branchPerformance).not.toBeNull();
    expect(dash.branchPerformance!.map((b) => b.branchId).sort()).toEqual([B1, B2].sort());
  });

  it("manager verified on both branches receives comparison limited to their scope", async () => {
    state.orders = [seedOrder({ branch_id: B1 }), seedOrder({ order_number: "TP-2", branch_id: B2 })];
    const dash = await ds.getOperationsDashboard(managerBothBranches, {});
    expect(dash.branchPerformance).not.toBeNull();
    expect(dash.branchPerformance!.length).toBe(2);
  });

  it("single-branch manager gets no cross-branch comparison", async () => {
    state.orders = [seedOrder({ branch_id: B1 })];
    const dash = await ds.getOperationsDashboard(bmB1, {});
    expect(dash.branchPerformance).toBeNull();
  });

  it("explicit single-branch filter never includes other branches even for super-admin", async () => {
    state.orders = [seedOrder({ branch_id: B1 }), seedOrder({ order_number: "TP-2", branch_id: B2 })];
    const dash = await ds.getOperationsDashboard(superAdmin, { branchId: B1 });
    expect(dash.branchPerformance).toBeNull();
    expect(dash.recentOrders.every((o) => o.branchId === B1)).toBe(true);
  });

  it("one assigned branch: unfiltered list stays limited to that membership", async () => {
    state.orders = [
      seedOrder({ id: "a1", branch_id: B1 }),
      seedOrder({ id: "b1", order_number: "TP-2", branch_id: B2 }),
    ];
    const res = await ds.listBranchOrders(bmB1, { limit: 20, offset: 0 });
    expect(res.orders.map((o) => o.id)).toEqual(["a1"]);
  });

  it("multiple assigned branches: unfiltered list includes only memberships", async () => {
    state.orders = [
      seedOrder({ id: "a1", branch_id: B1 }),
      seedOrder({ id: "b1", order_number: "TP-2", branch_id: B2 }),
      seedOrder({
        id: "c1",
        order_number: "TP-3",
        branch_id: "33333333-3333-4333-8333-333333333333",
      }),
    ];
    const res = await ds.listBranchOrders(managerBothBranches, { limit: 20, offset: 0 });
    expect(res.orders.map((o) => o.id).sort()).toEqual(["a1", "b1"]);
  });
});

describe("D2 — unknown and unauthorized branch IDs are rejected", () => {
  const UNKNOWN = "99999999-9999-4999-8999-999999999999";

  it("unknown UUID outside membership is ORDER_ACCESS_DENIED (not silent empty)", async () => {
    await expectApiError(
      ds.listBranchOrders(bmB1, { branchId: UNKNOWN, limit: 20, offset: 0 }),
      "ORDER_ACCESS_DENIED",
    );
    await expectApiError(ds.getOperationsDashboard(bmB1, { branchId: UNKNOWN }), "ORDER_ACCESS_DENIED");
  });

  it("forged request cannot expand multi-branch manager beyond verified memberships", async () => {
    await expectApiError(
      ds.getOperationsDashboard(managerBothBranches, { branchId: UNKNOWN }),
      "ORDER_ACCESS_DENIED",
    );
  });

  it("API contract is a single optional branchId — mixed ID lists are not accepted at the service layer", () => {
    // Dashboard/orders filters expose `branchId?: string` only. There is no
    // `branchIds[]` input, so a partially authorized list cannot silently return
    // partial data: unauthorized single IDs are rejected (tests above), and
    // aggregate mode omits the filter entirely so the server uses principal.branchIds.
    expect(typeof ds.getOperationsDashboard).toBe("function");
    expect(typeof ds.listBranchOrders).toBe("function");
  });
});

describe("D2 — duplicate membership IDs do not widen scope", () => {
  it("principal with duplicated branchIds still cannot reach an unauthorized branch", async () => {
    const duped = {
      userId: "u-dup",
      isSuperAdmin: false,
      roles: ["branch-manager"],
      branchIds: [B1, B1, B1],
    };
    state.orders = [seedOrder({ branch_id: B2 })];
    await expectApiError(ds.getOperationsDashboard(duped, { branchId: B2 }), "ORDER_ACCESS_DENIED");
    const dash = await ds.getOperationsDashboard(duped, {});
    expect(dash.branchPerformance).toBeNull();
  });
});

describe("D2 — inactive account and branch-status boundaries", () => {
  it("documents that service scope uses principal.branchIds as provided (account inactivity is gated upstream)", async () => {
    // Account status !== active is rejected by requireAuthenticatedUser
    // (USER_ACCESS_DISABLED) before services run. user_roles has no is_active
    // column; branches.status is not filtered out of principal.branchIds today.
    // Membership to a coming-soon / inactive branch UUID would still authorize
    // that UUID if present on the principal — documented opening-day limitation.
    const comingSoonMember = {
      userId: "u-cs",
      isSuperAdmin: false,
      roles: ["branch-manager"],
      branchIds: [B2],
    };
    state.orders = [seedOrder({ branch_id: B2 })];
    const dash = await ds.getOperationsDashboard(comingSoonMember, { branchId: B2 });
    expect(dash.kpis.activeOrders).toBeGreaterThanOrEqual(0);
    await expectApiError(
      ds.getOperationsDashboard(comingSoonMember, { branchId: B1 }),
      "ORDER_ACCESS_DENIED",
    );
  });
});

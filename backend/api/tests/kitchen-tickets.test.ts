import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  orders: Array<Record<string, unknown>>;
  orderItems: Array<Record<string, unknown>>;
  kitchenTickets: Array<Record<string, unknown>>;
  kitchenTicketItems: Array<Record<string, unknown>>;
  logs: Array<Record<string, unknown>>;
}

const state: FakeState = {
  orders: [],
  orderItems: [],
  kitchenTickets: [],
  kitchenTicketItems: [],
  logs: [],
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
  private single = false;
  private filters: Array<[string, string, unknown]> = [];
  private payload: unknown = null;
  private ascending = true;
  constructor(private table: string) {}
  select() {
    if (this.op !== "insert" && this.op !== "update") this.op = "select";
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
  neq(c: string, v: unknown) {
    this.filters.push(["neq", c, v]);
    return this;
  }
  order(_c: string, opts?: { ascending?: boolean }) {
    this.ascending = opts?.ascending !== false;
    return this;
  }
  range(from: number, to: number) {
    return this.resolve().then((r) => {
      const rows = Array.isArray(r.data) ? r.data : [];
      const sliced = rows.slice(from, to + 1);
      return { ...r, data: sliced, count: rows.length };
    });
  }
  maybeSingle() {
    this.single = true;
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
    if (this.table === "order_items") {
      const matched = state.orderItems.filter((o) => matchFilters(o, this.filters));
      return Promise.resolve({ data: matched, error: null });
    }
    if (this.table === "orders") {
      if (this.op === "select") {
        const matched = state.orders.filter((o) => matchFilters(o, this.filters));
        if (this.single) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null });
      }
      if (this.op === "update") {
        const matched = state.orders.filter((o) => matchFilters(o, this.filters));
        for (const target of matched) Object.assign(target, this.payload as Record<string, unknown>);
        if (this.single) {
          return Promise.resolve({
            data: matched[0] ? { status: matched[0].status } : null,
            error: null,
          });
        }
        return Promise.resolve({ data: matched[0] ?? null, error: null });
      }
    }
    if (this.table === "kitchen_ticket_items") {
      if (this.op === "insert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const row of rows as Array<Record<string, unknown>>) {
          state.kitchenTicketItems.push({ id: `kti-${state.kitchenTicketItems.length + 1}`, ...row });
        }
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }
    if (this.table === "kitchen_tickets") {
      if (this.op === "select") {
        let matched = state.kitchenTickets.filter((o) => matchFilters(o, this.filters));
        matched = matched.map((t) => ({
          ...t,
          items: state.kitchenTicketItems.filter((i) => i.kitchen_ticket_id === t.id),
        }));
        if (this.ascending) {
          matched = [...matched].sort((a, b) =>
            String(a.created_at).localeCompare(String(b.created_at)),
          );
        }
        if (this.single) return Promise.resolve({ data: matched[0] ?? null, error: null });
        return Promise.resolve({ data: matched, error: null, count: matched.length });
      }
      if (this.op === "insert") {
        const row: Record<string, unknown> = {
          id: `kt-${state.kitchenTickets.length + 1}`,
          created_at: "2026-07-18T00:00:00Z",
          updated_at: "2026-07-18T00:00:00Z",
          ...(this.payload as Record<string, unknown>),
        };
        if (state.kitchenTickets.some((t) => t.order_id === row.order_id)) {
          return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate" } });
        }
        state.kitchenTickets.push(row);
        if (this.single) return Promise.resolve({ data: { id: row.id }, error: null });
        return Promise.resolve({ data: row, error: null });
      }
      if (this.op === "update") {
        const matched = state.kitchenTickets.filter((o) => matchFilters(o, this.filters));
        for (const target of matched) Object.assign(target, this.payload as Record<string, unknown>);
        if (this.single) {
          return Promise.resolve({
            data: matched[0] ? { id: matched[0].id, status: matched[0].status } : null,
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
  createClient: () => ({ from: (table: string) => new FakeQuery(table) }),
}));

import { ApiError } from "../src/common/http.js";
import {
  assertKitchenActor,
  createKitchenTicketForConfirmedOrder,
  createSupabaseKitchenTicketsService,
} from "../src/services/kitchen/tickets.js";

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

const svc = createSupabaseKitchenTicketsService(envStatus);
const B1 = "b1";
const B2 = "b2";
const kitchenB1 = {
  userId: "u-kitchen",
  isSuperAdmin: false,
  roles: ["kitchen"],
  branchIds: [B1],
};
const riderB1 = {
  userId: "u-rider",
  isSuperAdmin: false,
  roles: ["rider"],
  branchIds: [B1],
};
const cashierB1 = {
  userId: "u-cashier",
  isSuperAdmin: false,
  roles: ["cashier"],
  branchIds: [B1],
};

beforeEach(() => {
  state.orders = [];
  state.orderItems = [];
  state.kitchenTickets = [];
  state.kitchenTicketItems = [];
  state.logs = [];
});

describe("assertKitchenActor", () => {
  it("allows kitchen, branch-manager, super-admin; blocks rider/cashier", () => {
    expect(() => assertKitchenActor(kitchenB1)).not.toThrow();
    expect(() =>
      assertKitchenActor({
        userId: "u-bm",
        isSuperAdmin: false,
        roles: ["branch-manager"],
        branchIds: [B1],
      }),
    ).not.toThrow();
    expect(() =>
      assertKitchenActor({ userId: "u-sa", isSuperAdmin: true, roles: ["super-admin"], branchIds: [] }),
    ).not.toThrow();
    expect(() => assertKitchenActor(riderB1)).toThrow(ApiError);
    expect(() => assertKitchenActor(cashierB1)).toThrow(ApiError);
  });
});

describe("createKitchenTicketForConfirmedOrder", () => {
  it("creates ticket + items once (idempotent on repeat)", async () => {
    const supabase = { from: (t: string) => new FakeQuery(t) } as never;
    state.orders = [{ id: "o1", branch_id: B1, status: "confirmed" }];
    state.orderItems = [
      {
        id: "oi1",
        order_id: "o1",
        product_name: "Pizza",
        variant_name: null,
        quantity: 2,
        extras_snapshot: [{ label: "extra cheese" }],
        modifiers: [],
      },
    ];

    const first = await createKitchenTicketForConfirmedOrder(supabase, "o1");
    expect(first.created).toBe(true);
    expect(state.kitchenTickets).toHaveLength(1);
    expect(state.kitchenTicketItems).toHaveLength(1);

    const second = await createKitchenTicketForConfirmedOrder(supabase, "o1");
    expect(second.created).toBe(false);
    expect(second.ticketId).toBe(first.ticketId);
    expect(state.kitchenTickets).toHaveLength(1);
  });

  it("does not create for non-confirmed orders", async () => {
    const supabase = { from: (t: string) => new FakeQuery(t) } as never;
    state.orders = [{ id: "o1", branch_id: B1, status: "pending" }];
    const res = await createKitchenTicketForConfirmedOrder(supabase, "o1");
    expect(res.created).toBe(false);
    expect(state.kitchenTickets).toHaveLength(0);
  });
});

describe("kitchen tickets service transitions", () => {
  it("list is branch-scoped; preparing mirrors order status + audit log", async () => {
    state.kitchenTickets = [
      {
        id: "kt1",
        order_id: "o1",
        branch_id: B1,
        status: "accepted",
        priority: 0,
        sequence_number: null,
        accepted_by_user_id: null,
        accepted_at: null,
        started_at: null,
        ready_at: null,
        completed_at: null,
        created_at: "2026-07-18T01:00:00Z",
        updated_at: "2026-07-18T01:00:00Z",
      },
      {
        id: "kt2",
        order_id: "o2",
        branch_id: B2,
        status: "queued",
        priority: 0,
        sequence_number: null,
        accepted_by_user_id: null,
        accepted_at: null,
        started_at: null,
        ready_at: null,
        completed_at: null,
        created_at: "2026-07-18T02:00:00Z",
        updated_at: "2026-07-18T02:00:00Z",
      },
    ];
    state.orders = [{ id: "o1", status: "confirmed", branch_id: B1 }];

    const listed = await svc.listTickets(kitchenB1, { limit: 50, offset: 0 });
    expect(listed.tickets.map((t) => t.id)).toEqual(["kt1"]);

    const moved = await svc.transitionTicket({
      scope: kitchenB1,
      ticketId: "kt1",
      toStatus: "preparing",
    });
    expect(moved.status).toBe("preparing");
    expect(moved.orderStatus).toBe("preparing");
    expect(state.orders[0].status).toBe("preparing");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({
      order_id: "o1",
      from_status: "confirmed",
      to_status: "preparing",
      actor_user_id: "u-kitchen",
    });
  });

  it("cross-branch transition is denied", async () => {
    state.kitchenTickets = [
      {
        id: "kt2",
        order_id: "o2",
        branch_id: B2,
        status: "queued",
        priority: 0,
        created_at: "2026-07-18T02:00:00Z",
        updated_at: "2026-07-18T02:00:00Z",
      },
    ];
    await expect(
      svc.transitionTicket({ scope: kitchenB1, ticketId: "kt2", toStatus: "accepted" }),
    ).rejects.toMatchObject({ code: "KITCHEN_ACCESS_DENIED" });
  });
});

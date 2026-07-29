import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D4 — branch readiness truth: phone placeholders, payment/notification honesty, probe errors.
 */

const B1 = "11111111-1111-4111-8111-111111111111";

type TableResult = { data?: unknown; error?: { message: string } | null; count?: number | null };

const tables: Record<string, (filters: Array<[string, string, unknown]>) => TableResult> = {};

class FakeQuery {
  private filters: Array<[string, string, unknown]> = [];
  private wantCount = false;
  constructor(private table: string) {}
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push(["eq", c, v]);
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push(["neq", c, v]);
    return this;
  }
  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }
  limit(_count: number) {
    return this;
  }
  maybeSingle() {
    return Promise.resolve(this.resolve(true));
  }
  then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
    return Promise.resolve(this.resolve(false)).then(res, rej);
  }
  private resolve(asSingle: boolean): TableResult {
    const handler = tables[this.table];
    if (!handler) {
      return asSingle
        ? { data: null, error: null, count: 0 }
        : { data: [], error: null, count: this.wantCount ? 0 : undefined };
    }
    const result = handler(this.filters);
    if (asSingle) return { data: result.data ?? null, error: result.error ?? null };
    return {
      data: result.data ?? [],
      error: result.error ?? null,
      count: result.count ?? 0,
    };
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => new FakeQuery(table),
  }),
}));

vi.mock("../src/services/branches/lookup.js", () => ({
  loadBranchRow: async () => ({
    id: B1,
    branch_code: "northern-bypass",
    name: "Northern Bypass",
    status: "coming-soon",
  }),
}));

import { createBranchReadinessService } from "../src/services/branches/readiness.js";

function roleIdFor(code: string): string {
  return `role-${code}`;
}

function seedHappyPath(overrides?: {
  phone?: string | null;
  notification?: Record<string, unknown> | null;
  menuError?: string;
  floorError?: string;
}) {
  Object.keys(tables).forEach((k) => delete tables[k]);

  tables.branches = () => ({
    data: {
      phone: overrides?.phone === undefined ? "03041110495" : overrides.phone,
      opening_hours: { mon: "10-22" },
    },
    error: null,
  });

  tables.roles = (filters) => {
    const code = filters.find((f) => f[0] === "eq" && f[1] === "code")?.[2];
    return { data: { id: roleIdFor(String(code)) }, error: null };
  };

  tables.user_roles = () => ({ data: null, error: null, count: 1 });

  tables.restaurant_floors = () =>
    overrides?.floorError
      ? { data: null, error: { message: overrides.floorError }, count: null }
      : { data: null, error: null, count: 2 };

  tables.restaurant_tables = () => ({ data: null, error: null, count: 8 });

  tables.branch_booking_policies = () => ({
    data: { id: "pol-1", booking_enabled: true },
    error: null,
  });

  tables.branch_notification_settings = () => ({
    data:
      overrides?.notification === undefined
        ? null
        : overrides.notification,
    error: null,
  });

  tables.menu_items = () =>
    overrides?.menuError
      ? { data: null, error: { message: overrides.menuError }, count: null }
      : { data: null, error: null, count: 12 };
}

describe("D4 branch readiness truth", () => {
  const envStatus = {
    isReady: true,
    config: {
      supabaseUrl: "http://127.0.0.1:54321",
      supabaseServiceRoleKey: "service-role-key-for-tests",
    },
  };

  beforeEach(() => {
    seedHappyPath();
  });

  it("treats placeholder phones as not configured", async () => {
    for (const phone of ["Coming Soon", "n/a", "TBD", "todo", "PLACEHOLDER", "  ", null]) {
      seedHappyPath({ phone });
      const report = await createBranchReadinessService(envStatus as never).getBranchReadiness(
        { isSuperAdmin: true, branchIds: [] },
        B1,
      );
      expect(report.checks.phone).toBe(false);
      expect(report.blockers.some((b) => b.code === "PHONE_MISSING")).toBe(true);
    }
  });

  it("does not treat cashier staffing as paymentConfigured", async () => {
    seedHappyPath({ phone: "03041110495" });
    const report = await createBranchReadinessService(envStatus as never).getBranchReadiness(
      { isSuperAdmin: true, branchIds: [] },
      B1,
    );
    expect(report.checks.cashierAssigned).toBe(true);
    expect(report.checks.paymentConfigured).toBe(false);
    expect(
      report.blockers.some(
        (b) => b.code === "PAYMENT_METHODS_MISSING" || b.code === "PAYMENT_PROVIDER_NOT_VERIFIED",
      ),
    ).toBe(true);
    expect(
      report.nextActions.some(
        (a) =>
          a.includes("payment method") ||
          a.includes("payment provider") ||
          a.includes("Configure payment"),
      ),
    ).toBe(true);
  });

  it("does not treat phone as notificationConfigured; requires provider settings", async () => {
    seedHappyPath({
      phone: "03041110495",
      notification: null,
    });
    const denied = await createBranchReadinessService(envStatus as never).getBranchReadiness(
      { isSuperAdmin: true, branchIds: [] },
      B1,
    );
    expect(denied.checks.notificationConfigured).toBe(false);
    expect(denied.nextActions).toContain("Configure notification provider");

    seedHappyPath({
      phone: "03041110495",
      notification: {
        email_enabled: true,
        whatsapp_enabled: false,
        provider_mode: "sandbox",
      },
    });
    const ok = await createBranchReadinessService(envStatus as never).getBranchReadiness(
      { isSuperAdmin: true, branchIds: [] },
      B1,
    );
    expect(ok.checks.notificationConfigured).toBe(true);
  });

  it("returns ERROR grade when a configuration probe fails", async () => {
    seedHappyPath({ floorError: "relation does not exist" });
    const report = await createBranchReadinessService(envStatus as never).getBranchReadiness(
      { isSuperAdmin: true, branchIds: [] },
      B1,
    );
    expect(report.readinessGrade).toBe("ERROR");
    expect(report.blockers[0]?.code).toBe("PROBE_FAILED");
  });

  it("returns ERROR grade when menu probe fails (not silent missing)", async () => {
    seedHappyPath({ menuError: "permission denied" });
    const report = await createBranchReadinessService(envStatus as never).getBranchReadiness(
      { isSuperAdmin: true, branchIds: [] },
      B1,
    );
    expect(report.readinessGrade).toBe("ERROR");
  });

  it("keeps deviceVerified false with on-site validation nextAction", async () => {
    seedHappyPath({
      phone: "03041110495",
      notification: {
        email_enabled: true,
        whatsapp_enabled: true,
        provider_mode: "live",
      },
    });
    const report = await createBranchReadinessService(envStatus as never).getBranchReadiness(
      { isSuperAdmin: true, branchIds: [] },
      B1,
    );
    expect(report.checks.deviceVerified).toBe(false);
    expect(report.nextActions).toContain("Complete on-site device/POS/KDS validation");
  });
});

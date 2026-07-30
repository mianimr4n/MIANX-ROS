import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { startOfTodayKarachiIso } from "../orders/management.js";

/**
 * POS Z-Report — cash drawer expectation for the Asia/Karachi business day.
 * Source: payments with method cash + status paid, for orders created today.
 * Expected cash = sum of those payment amounts (no invented starting float).
 */

export type PosZReport = {
  timezone: "Asia/Karachi";
  businessDate: string;
  dayStart: string;
  branchId: string;
  totalOrders: number;
  totalCashSales: number;
  expectedCashInDrawer: number;
  generatedAt: string;
};

export type PosZReportCloseResult = PosZReport & {
  confirmed: true;
  confirmedAt: string;
  eventId: string;
};

export interface PosZReportService {
  getReport(actor: AuthPrincipal, branchId: string): Promise<PosZReport>;
  confirmClose(actor: AuthPrincipal, branchId: string): Promise<PosZReportCloseResult>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function karachiBusinessDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function asScope(actor: AuthPrincipal) {
  return {
    userId: actor.userId,
    isSuperAdmin: actor.isSuperAdmin,
    roles: actor.roles,
    branchIds: actor.branchIds,
  };
}

function parseAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function createPosZReportService(envStatus: EnvironmentStatus): PosZReportService {
  const supabase = () => createServiceClient(envStatus);

  async function compute(actor: AuthPrincipal, branchId: string): Promise<PosZReport> {
    assertBranchMembership(asScope(actor), branchId);
    const now = new Date();
    const businessDate = karachiBusinessDate(now);
    const dayStart = startOfTodayKarachiIso(now);
    const client = supabase();

    const { data, error } = await client
      .from("payments")
      .select(
        "id, amount, status, payment_method, order_id, orders!inner(id, branch_id, created_at, payment_status, status)",
      )
      .eq("orders.branch_id", branchId)
      .gte("orders.created_at", dayStart);

    if (error) {
      throw new ApiError(500, "Z_REPORT_LOAD_FAILED", error.message);
    }

    const rows = (data ?? []) as Array<{
      amount: number | string;
      status: string;
      payment_method: string;
      order_id: string;
      orders:
        | { id: string; branch_id: string; created_at: string; payment_status: string; status: string }
        | Array<{ id: string; branch_id: string; created_at: string; payment_status: string; status: string }>;
    }>;

    const orderIds = new Set<string>();
    let totalCashSales = 0;

    for (const row of rows) {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      if (!order) continue;
      if (String(order.status).toLowerCase() === "cancelled") continue;

      const method = String(row.payment_method ?? "").trim().toLowerCase();
      const paymentStatus = String(row.status ?? "").trim().toLowerCase();
      // Match Owner contract CASH / PAID against stored lowercase cash / paid.
      if (method !== "cash") continue;
      if (paymentStatus !== "paid") continue;

      totalCashSales += parseAmount(row.amount);
      orderIds.add(String(row.order_id));
    }

    totalCashSales = Math.round(totalCashSales * 100) / 100;

    return {
      timezone: "Asia/Karachi",
      businessDate,
      dayStart,
      branchId,
      totalOrders: orderIds.size,
      totalCashSales,
      expectedCashInDrawer: totalCashSales,
      generatedAt: now.toISOString(),
    };
  }

  return {
    async getReport(actor, branchId) {
      return compute(actor, branchId);
    },

    async confirmClose(actor, branchId) {
      const report = await compute(actor, branchId);
      const client = supabase();
      const { data, error } = await client
        .from("pos_z_report_events")
        .insert({
          branch_id: branchId,
          actor_user_id: actor.userId,
          business_date: report.businessDate,
          timezone: report.timezone,
          total_orders: report.totalOrders,
          total_cash_sales: report.totalCashSales,
          expected_cash: report.expectedCashInDrawer,
          payload: {
            dayStart: report.dayStart,
            generatedAt: report.generatedAt,
          },
        })
        .select("id, created_at")
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "Z_REPORT_CLOSE_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(500, "Z_REPORT_CLOSE_FAILED", "Shift close event was not recorded.");
      }

      return {
        ...report,
        confirmed: true,
        confirmedAt: data.created_at as string,
        eventId: data.id as string,
      };
    },
  };
}

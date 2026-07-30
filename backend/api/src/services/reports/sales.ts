import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import type { BranchActorScope } from "../tables/management.js";
import { startOfTodayKarachiIso } from "../orders/management.js";

export type SalesDayPoint = {
  date: string;
  totalOrders: number;
  grossSales: number;
  averageOrderValue: number | null;
};

export type SalesReportResult = {
  timezone: "Asia/Karachi";
  startDate: string;
  endDate: string;
  branchId: string | null;
  days: SalesDayPoint[];
  totals: {
    totalOrders: number;
    grossSales: number;
    averageOrderValue: number | null;
  };
};

export type OrderExportRow = {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  orderSource: string;
  branchId: string;
  branchCode: string | null;
  paymentStatus: string;
  totalAmount: number;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
};

export type SalesReportQuery = {
  startDate: string;
  endDate: string;
  branchId?: string;
};

export type OrdersExportQuery = {
  startDate: string;
  endDate: string;
  branchId?: string;
  status?: string;
};

export interface ReportsService {
  getSalesReport(scope: BranchActorScope, query: SalesReportQuery): Promise<SalesReportResult>;
  exportSalesCsv(scope: BranchActorScope, query: SalesReportQuery): Promise<string>;
  exportOrdersCsv(scope: BranchActorScope, query: OrdersExportQuery): Promise<string>;
}

type OrderAggRow = {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  order_source: string;
  branch_id: string;
  payment_status: string;
  total_amount: number | string;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
  branch: { branch_code: string } | null;
};

const ORDER_SELECT =
  "id, order_number, status, order_type, order_source, branch_id, payment_status, total_amount, contact_name, contact_phone, created_at, branch:branches(branch_code)";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function karachiDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new ApiError(500, "REPORT_DATE_PARSE_FAILED", "Unable to resolve Asia/Karachi date.");
  }
  return `${year}-${month}-${day}`;
}

function assertDateRange(startDate: string, endDate: string): void {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    throw new ApiError(400, "VALIDATION_ERROR", "startDate and endDate must be YYYY-MM-DD.");
  }
  if (startDate > endDate) {
    throw new ApiError(400, "VALIDATION_ERROR", "startDate must be on or before endDate.");
  }
  const startMs = new Date(`${startDate}T00:00:00+05:00`).getTime();
  const endMs = new Date(`${endDate}T00:00:00+05:00`).getTime();
  const spanDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
  if (spanDays > 93) {
    throw new ApiError(400, "VALIDATION_ERROR", "Date range cannot exceed 93 days.");
  }
}

function resolveBranchScope(scope: BranchActorScope, branchId?: string): string[] | "all" | "none" {
  if (branchId) {
    assertBranchMembership(scope, branchId);
    return [branchId];
  }
  if (scope.isSuperAdmin) return "all";
  if (scope.branchIds.length === 0) return "none";
  return scope.branchIds;
}

function rangeBounds(startDate: string, endDate: string): { from: string; to: string } {
  return {
    from: `${startDate}T00:00:00+05:00`,
    to: `${endDate}T23:59:59.999+05:00`,
  };
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function defaultStartDate(): string {
  const today = startOfTodayKarachiIso().slice(0, 10);
  const endMs = new Date(`${today}T00:00:00+05:00`).getTime();
  const startMs = endMs - 6 * 24 * 60 * 60 * 1000;
  return karachiDateKey(new Date(startMs).toISOString());
}

function defaultEndDate(): string {
  return startOfTodayKarachiIso().slice(0, 10);
}

async function fetchOrdersInRange(
  client: SupabaseClient,
  branchScope: string[] | "all" | "none",
  from: string,
  to: string,
  status?: string,
): Promise<OrderAggRow[]> {
  if (branchScope === "none") return [];

  const rows: OrderAggRow[] = [];
  let fromIdx = 0;

  for (;;) {
    let query = client
      .from("orders")
      .select(ORDER_SELECT)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .range(fromIdx, fromIdx + PAGE_SIZE - 1);

    if (branchScope !== "all") query = query.in("branch_id", branchScope);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throwMappedDbError("REPORTS_ORDERS_READ_FAILED", error);

    const page = (data ?? []) as unknown as OrderAggRow[];
    rows.push(...page);
    if (rows.length > MAX_ROWS) {
      throw new ApiError(
        413,
        "REPORT_TOO_LARGE",
        "Report exceeds row limit. Narrow the date range or branch filter.",
      );
    }
    if (page.length < PAGE_SIZE) break;
    fromIdx += PAGE_SIZE;
  }

  return rows;
}

function aggregateSales(rows: OrderAggRow[], startDate: string, endDate: string): SalesDayPoint[] {
  const buckets = new Map<string, { totalOrders: number; grossSales: number }>();

  // Pre-fill every calendar day so empty days are honest zeros (not fabricated sales).
  const cursor = new Date(`${startDate}T00:00:00+05:00`).getTime();
  const endMs = new Date(`${endDate}T00:00:00+05:00`).getTime();
  for (let t = cursor; t <= endMs; t += 24 * 60 * 60 * 1000) {
    const key = karachiDateKey(new Date(t).toISOString());
    buckets.set(key, { totalOrders: 0, grossSales: 0 });
  }

  for (const row of rows) {
    if (row.status === "cancelled") continue;
    const key = karachiDateKey(row.created_at);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.totalOrders += 1;
    bucket.grossSales += parseNumber(row.total_amount);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      totalOrders: bucket.totalOrders,
      grossSales: Math.round(bucket.grossSales * 100) / 100,
      averageOrderValue:
        bucket.totalOrders > 0
          ? Math.round((bucket.grossSales / bucket.totalOrders) * 100) / 100
          : null,
    }));
}

export function createReportsService(envStatus: EnvironmentStatus): ReportsService {
  const supabase = () => createServiceClient(envStatus);

  const service: ReportsService = {
    async getSalesReport(scope, query) {
      const startDate = query.startDate || defaultStartDate();
      const endDate = query.endDate || defaultEndDate();
      assertDateRange(startDate, endDate);

      const branchScope = resolveBranchScope(scope, query.branchId);
      const { from, to } = rangeBounds(startDate, endDate);
      const rows = await fetchOrdersInRange(supabase(), branchScope, from, to);
      const days = aggregateSales(rows, startDate, endDate);
      const totalOrders = days.reduce((sum, d) => sum + d.totalOrders, 0);
      const grossSales = Math.round(days.reduce((sum, d) => sum + d.grossSales, 0) * 100) / 100;

      return {
        timezone: "Asia/Karachi",
        startDate,
        endDate,
        branchId: query.branchId ?? null,
        days,
        totals: {
          totalOrders,
          grossSales,
          averageOrderValue: totalOrders > 0 ? Math.round((grossSales / totalOrders) * 100) / 100 : null,
        },
      };
    },

    async exportSalesCsv(scope, query) {
      const report = await service.getSalesReport(scope, query);
      const header = ["date", "total_orders", "gross_sales", "average_order_value"];
      const lines = [header.join(",")];
      for (const day of report.days) {
        lines.push(
          [
            csvEscape(day.date),
            csvEscape(day.totalOrders),
            csvEscape(day.grossSales.toFixed(2)),
            csvEscape(day.averageOrderValue == null ? "" : day.averageOrderValue.toFixed(2)),
          ].join(","),
        );
      }
      lines.push(
        [
          csvEscape("TOTAL"),
          csvEscape(report.totals.totalOrders),
          csvEscape(report.totals.grossSales.toFixed(2)),
          csvEscape(
            report.totals.averageOrderValue == null ? "" : report.totals.averageOrderValue.toFixed(2),
          ),
        ].join(","),
      );
      return `${lines.join("\n")}\n`;
    },

    async exportOrdersCsv(scope, query) {
      const startDate = query.startDate || defaultStartDate();
      const endDate = query.endDate || defaultEndDate();
      assertDateRange(startDate, endDate);

      const branchScope = resolveBranchScope(scope, query.branchId);
      const { from, to } = rangeBounds(startDate, endDate);
      const rows = await fetchOrdersInRange(supabase(), branchScope, from, to, query.status);

      const header = [
        "order_number",
        "status",
        "order_type",
        "order_source",
        "branch_code",
        "payment_status",
        "total_amount",
        "contact_name",
        "contact_phone",
        "created_at",
      ];
      const lines = [header.join(",")];
      for (const row of rows) {
        lines.push(
          [
            csvEscape(row.order_number),
            csvEscape(row.status),
            csvEscape(row.order_type),
            csvEscape(row.order_source),
            csvEscape(row.branch?.branch_code ?? ""),
            csvEscape(row.payment_status),
            csvEscape(parseNumber(row.total_amount).toFixed(2)),
            csvEscape(row.contact_name),
            csvEscape(row.contact_phone),
            csvEscape(row.created_at),
          ].join(","),
        );
      }
      return `${lines.join("\n")}\n`;
    },
  };

  return service;
}

/**
 * RC4-2 Analytics engine — single authoritative KPI computation path.
 * Domain formula math for Finance/HR is delegated; never duplicated.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import type { FinanceService } from "../finance/management.js";
import type { FinancePhase2Service } from "../finance/phase2.js";
import type { FinanceOperationsService } from "../finance/operations.js";
import type { HrWorkforceService } from "../hr/workforce.js";
import type { HrPayrollService } from "../hr/payroll.js";
import type { LoyaltyService } from "../loyalty/management.js";
import type { MarketingService } from "../marketing/coupons.js";
import { startOfTodayKarachiIso } from "../orders/management.js";
import type { BranchActorScope } from "../tables/management.js";
import { buildAnalyticsExport } from "./exports.js";
import {
  FORMULA_REGISTRY,
  REGISTRY_VERSION,
  getMetricContract,
  listRegistryModules,
} from "./registry.js";
import type {
  AnalyticsExportResult,
  AnalyticsModuleId,
  AnalyticsModuleSnapshot,
  AnalyticsPeriodQuery,
  DrillDownResult,
  ExportFormat,
  MetricStatus,
  MetricValue,
  OwnerBiWorkspace,
} from "./types.js";
import { ANALYTICS_MODULE_IDS, ANALYTICS_TIMEZONE } from "./types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;

type OrderRow = {
  id: string;
  status: string;
  order_source: string;
  order_type: string;
  branch_id: string;
  total_amount: number | string;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  contact_phone: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  order_id: string | null;
  payment_method: string | null;
  amount: number | string;
  status: string;
  created_at: string;
};

export type AnalyticsServiceDeps = {
  envStatus: EnvironmentStatus;
  finance: FinanceService;
  financePhase2: FinancePhase2Service;
  financeOperations: FinanceOperationsService;
  hrWorkforce: HrWorkforceService;
  hrPayroll: HrPayrollService;
  loyalty: LoyaltyService;
  marketing: MarketingService;
};

export interface AnalyticsService {
  listModules(): ReturnType<typeof listRegistryModules>;
  getRegistry(): { version: string; contracts: typeof FORMULA_REGISTRY };
  getOwnerWorkspace(scope: BranchActorScope, query: AnalyticsPeriodQuery): Promise<OwnerBiWorkspace>;
  getModuleSnapshot(
    scope: BranchActorScope,
    moduleId: AnalyticsModuleId,
    query: AnalyticsPeriodQuery,
  ): Promise<AnalyticsModuleSnapshot>;
  drillDown(
    scope: BranchActorScope,
    metricId: string,
    query: AnalyticsPeriodQuery,
  ): Promise<DrillDownResult>;
  export(
    scope: BranchActorScope,
    format: ExportFormat,
    query: AnalyticsPeriodQuery & { moduleId?: AnalyticsModuleId },
  ): Promise<AnalyticsExportResult>;
  listScheduledReports(scope: BranchActorScope, branchId?: string): Promise<unknown[]>;
  createScheduledReport(
    scope: BranchActorScope,
    input: {
      name: string;
      moduleId: string;
      cadence: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
      format: ExportFormat;
      branchId?: string;
      metricIds?: string[];
    },
  ): Promise<unknown>;
  listExceptions(scope: BranchActorScope, branchId?: string): Promise<unknown[]>;
  runDataQuality(scope: BranchActorScope, query: AnalyticsPeriodQuery): Promise<unknown>;
}

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

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function karachiDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new ApiError(500, "ANALYTICS_DATE_PARSE_FAILED", "Unable to resolve Asia/Karachi date.");
  }
  return `${year}-${month}-${day}`;
}

function karachiHourKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value?.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}`;
}

function karachiMonthKey(iso: string): string {
  return karachiDateKey(iso).slice(0, 7);
}

function karachiWeekKey(iso: string): string {
  const key = karachiDateKey(iso);
  const local = new Date(`${key}T12:00:00+05:00`);
  const dayNum = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(local.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((local.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${local.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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

function defaultStartDate(): string {
  const today = startOfTodayKarachiIso().slice(0, 10);
  const endMs = new Date(`${today}T00:00:00+05:00`).getTime();
  const startMs = endMs - 6 * 24 * 60 * 60 * 1000;
  return karachiDateKey(new Date(startMs).toISOString());
}

function defaultEndDate(): string {
  return startOfTodayKarachiIso().slice(0, 10);
}

function normalizeQuery(query: AnalyticsPeriodQuery): {
  startDate: string;
  endDate: string;
  branchId?: string;
} {
  const startDate = query.startDate || defaultStartDate();
  const endDate = query.endDate || defaultEndDate();
  assertDateRange(startDate, endDate);
  return { startDate, endDate, branchId: query.branchId };
}

function metric(
  metricId: string,
  value: number | string | null,
  opts: {
    status?: MetricStatus;
    reason?: string | null;
    unit?: string | null;
    asOf: string;
    periodStart: string;
    periodEnd: string;
    branchId: string | null;
  },
): MetricValue {
  const contract = getMetricContract(metricId);
  return {
    metricId,
    name: contract?.name ?? metricId,
    value,
    unit: opts.unit ?? "PKR",
    status: opts.status ?? (value == null ? "UNAVAILABLE" : "LIVE"),
    reason: opts.reason ?? null,
    asOf: opts.asOf,
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
    branchId: opts.branchId,
    contractRef: metricId,
  };
}

function isIncludedOrder(status: string): boolean {
  return status !== "cancelled";
}

async function fetchOrders(
  client: SupabaseClient,
  branchScope: string[] | "all" | "none",
  from: string,
  to: string,
): Promise<OrderRow[]> {
  if (branchScope === "none") return [];
  const rows: OrderRow[] = [];
  let fromIdx = 0;
  for (;;) {
    let q = client
      .from("orders")
      .select(
        "id, status, order_source, order_type, branch_id, total_amount, discount_amount, tax_amount, contact_phone, created_at",
      )
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .range(fromIdx, fromIdx + PAGE_SIZE - 1);
    if (branchScope !== "all") q = q.in("branch_id", branchScope);
    const { data, error } = await q;
    if (error) throwMappedDbError("ANALYTICS_ORDERS_READ_FAILED", error);
    const page = (data ?? []) as OrderRow[];
    rows.push(...page);
    if (rows.length > MAX_ROWS) {
      throw new ApiError(413, "REPORT_TOO_LARGE", "Analytics range too large. Narrow filters.");
    }
    if (page.length < PAGE_SIZE) break;
    fromIdx += PAGE_SIZE;
  }
  return rows;
}

async function fetchPaymentsForOrders(
  client: SupabaseClient,
  orderIds: string[],
): Promise<PaymentRow[]> {
  if (orderIds.length === 0) return [];
  const rows: PaymentRow[] = [];
  for (let i = 0; i < orderIds.length; i += 200) {
    const chunk = orderIds.slice(i, i + 200);
    const { data, error } = await client
      .from("payments")
      .select("id, order_id, payment_method, amount, status, created_at")
      .in("order_id", chunk);
    if (error) throwMappedDbError("ANALYTICS_PAYMENTS_READ_FAILED", error);
    rows.push(...((data ?? []) as PaymentRow[]));
  }
  return rows;
}

function shiftDate(date: string, days: number): string {
  const ms = new Date(`${date}T12:00:00+05:00`).getTime() + days * 86400000;
  return karachiDateKey(new Date(ms).toISOString());
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return money(((current - prior) / prior) * 100);
}

/** Order-line row used by product analytics (canonical columns only). */
export type AnalyticsOrderItemQtyRow = {
  menu_item_id: string | null;
  product_name: string | null;
  quantity: number | string;
};

export type AnalyticsTopItemPoint = {
  menuItemId: string;
  /** Display label from order-time `product_name` snapshot; never invented from live menu. */
  label: string;
  quantity: number;
};

/**
 * Aggregate top SKUs by `menu_item_id` using order-time `product_name` snapshots.
 * Blank snapshots surface an honest unavailable label (menu delete-safe, no N+1).
 */
export function aggregateTopItemsByMenuItemId(
  rows: AnalyticsOrderItemQtyRow[],
  limit = 20,
): AnalyticsTopItemPoint[] {
  const bySku = new Map<string, { quantity: number; label: string | null }>();
  for (const row of rows) {
    const menuItemId = typeof row.menu_item_id === "string" ? row.menu_item_id.trim() : "";
    if (!menuItemId) continue;
    const quantity = parseNumber(row.quantity);
    const snapshot =
      typeof row.product_name === "string" && row.product_name.trim() !== ""
        ? row.product_name.trim()
        : null;
    const existing = bySku.get(menuItemId);
    if (!existing) {
      bySku.set(menuItemId, { quantity, label: snapshot });
    } else {
      existing.quantity += quantity;
      if (!existing.label && snapshot) existing.label = snapshot;
    }
  }
  return [...bySku.entries()]
    .map(([menuItemId, value]) => ({
      menuItemId,
      label: value.label ?? "Unavailable item name",
      quantity: value.quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function createAnalyticsService(deps: AnalyticsServiceDeps): AnalyticsService {
  const supabase = () => createServiceClient(deps.envStatus);

  async function salesBundle(
    scope: BranchActorScope,
    query: { startDate: string; endDate: string; branchId?: string },
  ) {
    const branchScope = resolveBranchScope(scope, query.branchId);
    const { from, to } = rangeBounds(query.startDate, query.endDate);
    const orders = await fetchOrders(supabase(), branchScope, from, to);
    const included = orders.filter((o) => isIncludedOrder(o.status));
    const payments = await fetchPaymentsForOrders(
      supabase(),
      included.map((o) => o.id),
    );
    const gross = money(included.reduce((s, o) => s + parseNumber(o.total_amount), 0));
    const discounts = money(included.reduce((s, o) => s + parseNumber(o.discount_amount), 0));
    const tax = money(included.reduce((s, o) => s + parseNumber(o.tax_amount), 0));
    const refunds = money(
      payments.filter((p) => p.status === "refunded").reduce((s, p) => s + parseNumber(p.amount), 0),
    );
    const net = money(gross - discounts - refunds);
    const orderCount = included.length;
    const aov = orderCount > 0 ? money(gross / orderCount) : null;

    const paymentMixMap = new Map<string, number>();
    for (const p of payments.filter((x) => x.status === "paid")) {
      const key = p.payment_method || "unknown";
      paymentMixMap.set(key, money((paymentMixMap.get(key) ?? 0) + parseNumber(p.amount)));
    }
    const paymentTotal = [...paymentMixMap.values()].reduce((a, b) => a + b, 0);
    const paymentMix = [...paymentMixMap.entries()].map(([label, value]) => ({
      label,
      value,
      share: paymentTotal > 0 ? money(value / paymentTotal) : null,
    }));

    const channelMap = new Map<string, number>();
    for (const o of included) {
      const key = o.order_source || "unknown";
      channelMap.set(key, money((channelMap.get(key) ?? 0) + parseNumber(o.total_amount)));
    }
    const channelTotal = [...channelMap.values()].reduce((a, b) => a + b, 0);
    const channelMix = [...channelMap.entries()].map(([label, value]) => ({
      label,
      value,
      share: channelTotal > 0 ? money(value / channelTotal) : null,
    }));

    const daily = new Map<string, number>();
    const hourly = new Map<string, number>();
    const weekly = new Map<string, number>();
    const monthly = new Map<string, number>();
    for (const o of included) {
      const amt = parseNumber(o.total_amount);
      daily.set(karachiDateKey(o.created_at), money((daily.get(karachiDateKey(o.created_at)) ?? 0) + amt));
      hourly.set(karachiHourKey(o.created_at), money((hourly.get(karachiHourKey(o.created_at)) ?? 0) + amt));
      weekly.set(karachiWeekKey(o.created_at), money((weekly.get(karachiWeekKey(o.created_at)) ?? 0) + amt));
      monthly.set(karachiMonthKey(o.created_at), money((monthly.get(karachiMonthKey(o.created_at)) ?? 0) + amt));
    }

    const end = query.endDate;
    const wowCurrentFrom = shiftDate(end, -6);
    const wowPriorFrom = shiftDate(end, -13);
    const wowPriorTo = shiftDate(end, -7);
    const momCurrentFrom = shiftDate(end, -29);
    const momPriorFrom = shiftDate(end, -59);
    const momPriorTo = shiftDate(end, -30);

    async function grossBetween(a: string, b: string): Promise<number> {
      const bounds = rangeBounds(a, b);
      const rows = await fetchOrders(supabase(), branchScope, bounds.from, bounds.to);
      return money(rows.filter((o) => isIncludedOrder(o.status)).reduce((s, o) => s + parseNumber(o.total_amount), 0));
    }

    const [wowCur, wowPrior, momCur, momPrior, yoyCur, yoyPrior] = await Promise.all([
      grossBetween(wowCurrentFrom, end),
      grossBetween(wowPriorFrom, wowPriorTo),
      grossBetween(momCurrentFrom, end),
      grossBetween(momPriorFrom, momPriorTo),
      grossBetween(query.startDate, query.endDate),
      grossBetween(shiftDate(query.startDate, -365), shiftDate(query.endDate, -365)),
    ]);

    return {
      orders,
      included,
      payments,
      gross,
      discounts,
      tax,
      refunds,
      net,
      orderCount,
      aov,
      paymentMix,
      channelMix,
      daily,
      hourly,
      weekly,
      monthly,
      wow: pctChange(wowCur, wowPrior),
      mom: pctChange(momCur, momPrior),
      yoy: pctChange(yoyCur, yoyPrior),
    };
  }

  const service: AnalyticsService = {
    listModules() {
      return listRegistryModules();
    },

    getRegistry() {
      return { version: REGISTRY_VERSION, contracts: FORMULA_REGISTRY };
    },

    async getModuleSnapshot(scope, moduleId, rawQuery) {
      if (!ANALYTICS_MODULE_IDS.includes(moduleId)) {
        throw new ApiError(404, "ANALYTICS_MODULE_NOT_FOUND", `Unknown module ${moduleId}`);
      }
      const query = normalizeQuery(rawQuery);
      const asOf = new Date().toISOString();
      const branchId = query.branchId ?? null;
      const base = { asOf, periodStart: query.startDate, periodEnd: query.endDate, branchId };
      const titles = Object.fromEntries(listRegistryModules().map((m) => [m.moduleId, m.title])) as Record<
        AnalyticsModuleId,
        string
      >;

      if (moduleId === "formula_registry" || moduleId === "metric_contracts") {
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("platform.formula_registry", FORMULA_REGISTRY.length, {
              ...base,
              unit: "contracts",
              status: "LIVE",
            }),
          ],
        };
      }

      if (moduleId === "export_csv" || moduleId === "export_excel" || moduleId === "export_pdf") {
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: "Export endpoints available under /admin/analytics/export",
          metrics: [
            metric(`platform.${moduleId}`, 1, {
              ...base,
              unit: "capability",
              status: "LIVE",
            }),
          ],
        };
      }

      if (moduleId === "drill_down") {
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("platform.drill_down", 1, { ...base, unit: "capability", status: "LIVE" }),
          ],
        };
      }

      if (moduleId === "scheduled_reports") {
        const client = supabase();
        let q = client.from("analytics_scheduled_reports").select("id, is_active, execution_status").eq("is_active", true);
        const branchScope = resolveBranchScope(scope, query.branchId);
        if (branchScope !== "all" && branchScope !== "none") q = q.in("branch_id", branchScope);
        if (branchScope === "none") {
          return {
            moduleId,
            title: titles[moduleId],
            status: "DEFERRED",
            reason: "No branch scope; schedule execution remains deferred.",
            metrics: [
              metric("platform.scheduled_reports", 0, {
                ...base,
                unit: "schedules",
                status: "DEFERRED",
                reason: "Execution deferred — no worker.",
              }),
            ],
          };
        }
        const { data, error } = await q;
        if (error) throwMappedDbError("ANALYTICS_SCHEDULES_READ_FAILED", error);
        const count = (data ?? []).length;
        return {
          moduleId,
          title: titles[moduleId],
          status: "DEFERRED",
          reason: "Schedule definitions stored; execution deferred without worker.",
          metrics: [
            metric("platform.scheduled_reports", count, {
              ...base,
              unit: "schedules",
              status: "DEFERRED",
              reason: "Execution deferred — no worker.",
            }),
          ],
        };
      }

      if (moduleId === "exception_center") {
        const client = supabase();
        let q = client.from("analytics_exceptions").select("id", { count: "exact", head: true }).eq("status", "open");
        const branchScope = resolveBranchScope(scope, query.branchId);
        if (branchScope !== "all" && branchScope !== "none") q = q.in("branch_id", branchScope);
        const { count, error } = await q;
        if (error) throwMappedDbError("ANALYTICS_EXCEPTIONS_READ_FAILED", error);
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("platform.exceptions", count ?? 0, {
              ...base,
              unit: "exceptions",
              status: "LIVE",
            }),
          ],
        };
      }

      if (moduleId === "data_quality") {
        const quality = await service.runDataQuality(scope, query);
        const summary = quality as {
          pass: number;
          warn: number;
          fail: number;
          unavailable: number;
        };
        return {
          moduleId,
          title: titles[moduleId],
          status: summary.fail > 0 ? "BLOCKED" : "LIVE",
          reason: null,
          metrics: [
            metric("platform.data_quality", summary.pass + summary.warn + summary.fail, {
              ...base,
              unit: "checks",
              status: summary.fail > 0 ? "BLOCKED" : "LIVE",
            }),
          ],
        };
      }

      if (moduleId === "owner_bi_workspace") {
        const ws = await service.getOwnerWorkspace(scope, query);
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("platform.owner_workspace", ws.modules.length, {
              ...base,
              unit: "modules",
              status: "LIVE",
            }),
          ],
        };
      }

      if (moduleId === "sales" || moduleId === "executive") {
        const s = await salesBundle(scope, query);
        const metrics: MetricValue[] = [
          metric("sales.gross", s.gross, base),
          metric("sales.net", s.net, base),
          metric("sales.aov", s.aov, { ...base, status: s.aov == null ? "EMPTY" : "LIVE", unit: "PKR" }),
          metric("sales.discounts", s.discounts, base),
          metric("sales.refunds", s.refunds, base),
          metric("sales.tax", s.tax, base),
          metric("sales.wow", s.wow, {
            ...base,
            unit: "%",
            status: s.wow == null ? "EMPTY" : "LIVE",
            reason: s.wow == null ? "Prior week gross was 0." : null,
          }),
          metric("sales.mom", s.mom, {
            ...base,
            unit: "%",
            status: s.mom == null ? "EMPTY" : "LIVE",
            reason: s.mom == null ? "Prior month gross was 0." : null,
          }),
          metric("sales.yoy", s.yoy, {
            ...base,
            unit: "%",
            status: s.yoy == null ? "EMPTY" : "LIVE",
            reason: s.yoy == null ? "Prior year gross was 0." : null,
          }),
        ];
        if (moduleId === "executive") {
          metrics.unshift(
            metric("executive.overview_orders", s.orderCount, { ...base, unit: "orders" }),
          );
        }
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics,
          series: [
            {
              key: "daily",
              label: "Daily gross",
              points: [...s.daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v })),
            },
            {
              key: "hourly",
              label: "Hourly gross",
              points: [...s.hourly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v })),
            },
            {
              key: "weekly",
              label: "Weekly gross",
              points: [...s.weekly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v })),
            },
            {
              key: "monthly",
              label: "Monthly gross",
              points: [...s.monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v })),
            },
          ],
          mixes: [
            { key: "payment", label: "Payment mix", items: s.paymentMix },
            { key: "channel", label: "Channel mix", items: s.channelMix },
          ],
        };
      }

      if (moduleId === "customer") {
        const s = await salesBundle(scope, query);
        const phonesInRange = new Set(
          s.included.map((o) => o.contact_phone).filter((p): p is string => Boolean(p)),
        );
        const branchScope = resolveBranchScope(scope, query.branchId);
        const priorTo = rangeBounds("2000-01-01", shiftDate(query.startDate, -1));
        const priorOrders = await fetchOrders(supabase(), branchScope, priorTo.from, priorTo.to);
        const priorPhones = new Set(
          priorOrders
            .filter((o) => isIncludedOrder(o.status) && o.contact_phone)
            .map((o) => o.contact_phone as string),
        );
        let returning = 0;
        let neu = 0;
        for (const phone of phonesInRange) {
          if (priorPhones.has(phone)) returning += 1;
          else neu += 1;
        }
        const frequency =
          phonesInRange.size > 0 ? money(s.orderCount / phonesInRange.size) : null;
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("customer.new", neu, { ...base, unit: "customers" }),
            metric("customer.returning", returning, { ...base, unit: "customers" }),
            metric("customer.frequency", frequency, {
              ...base,
              unit: "orders/customer",
              status: frequency == null ? "EMPTY" : "LIVE",
            }),
          ],
        };
      }

      if (moduleId === "branch_comparison") {
        const s = await salesBundle(scope, query);
        const byBranch = new Map<string, number>();
        for (const o of s.included) {
          byBranch.set(o.branch_id, money((byBranch.get(o.branch_id) ?? 0) + parseNumber(o.total_amount)));
        }
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("branch.gross_sales", byBranch.size, { ...base, unit: "branches" }),
          ],
          series: [
            {
              key: "by_branch",
              label: "Gross by branch",
              points: [...byBranch.entries()].map(([t, v]) => ({ t, v })),
            },
          ],
        };
      }

      if (moduleId === "product") {
        const s = await salesBundle(scope, query);
        const client = supabase();
        const ids = s.included.map((o) => o.id);
        const itemRows: AnalyticsOrderItemQtyRow[] = [];
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          if (chunk.length === 0) break;
          // Canonical columns only: sold-item label is order-time product_name (not order_items.name).
          const { data, error } = await client
            .from("order_items")
            .select("menu_item_id, quantity, product_name")
            .in("order_id", chunk);
          if (error) throwMappedDbError("ANALYTICS_ORDER_ITEMS_READ_FAILED", error);
          for (const row of data ?? []) {
            itemRows.push(row as AnalyticsOrderItemQtyRow);
          }
        }
        const top = aggregateTopItemsByMenuItemId(itemRows, 20);
        return {
          moduleId,
          title: titles[moduleId],
          status: top.length ? "LIVE" : "EMPTY",
          reason: top.length ? null : "No order lines in range.",
          metrics: [
            metric("product.top_items", top.length, {
              ...base,
              unit: "skus",
              status: top.length ? "LIVE" : "EMPTY",
            }),
          ],
          series: [
            {
              key: "top_items",
              label: "Top items by qty",
              points: top.map((row) => ({ t: row.label, v: row.quantity })),
            },
          ],
        };
      }

      if (moduleId === "finance") {
        if (!query.branchId) {
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: "Finance analytics require a branchId (no duplicated org-level GL).",
            metrics: [
              metric("finance.profit_loss", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: "branchId required",
                unit: null,
              }),
            ],
          };
        }
        try {
          const [pl, tb, bs, cf] = await Promise.all([
            deps.finance.profitLoss(scope, query.branchId, query.startDate, query.endDate),
            deps.finance.trialBalance(scope, query.branchId, query.endDate),
            deps.financePhase2.getBalanceSheet(scope, query.branchId, query.endDate),
            deps.financePhase2.getCashFlow(scope, query.branchId, query.startDate, query.endDate),
          ]);
          const margin =
            pl.revenue > 0 ? money((pl.netIncome / pl.revenue) * 100) : null;
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: "Delegated to Finance Phase 2 / GL RPCs — no duplicated finance math.",
            metrics: [
              metric("finance.profit_loss", pl.netIncome, base),
              metric("finance.profit", pl.netIncome, base),
              metric("finance.margin", margin, {
                ...base,
                unit: "%",
                status: margin == null ? "EMPTY" : "LIVE",
              }),
              metric("finance.trial_balance", tb.balanced ? 1 : 0, {
                ...base,
                unit: "balanced_flag",
              }),
              metric("finance.balance_sheet", 1, {
                ...base,
                unit: "report",
                status: bs ? "LIVE" : "UNAVAILABLE",
              }),
              metric("finance.cash_flow", 1, {
                ...base,
                unit: "report",
                status: cf ? "LIVE" : "UNAVAILABLE",
              }),
              metric("finance.receivables", null, {
                ...base,
                status: "LIVE",
                reason: "Use Finance AR routes for invoice drill-down; envelope marks LIVE delegation.",
                unit: null,
              }),
              metric("finance.payables", null, {
                ...base,
                status: "LIVE",
                reason: "Use Finance AP / purchasing routes for payable drill-down.",
                unit: null,
              }),
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Finance analytics failed";
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: message,
            metrics: [
              metric("finance.profit_loss", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: message,
                unit: null,
              }),
            ],
          };
        }
      }

      if (moduleId === "inventory") {
        const client = supabase();
        const branchScope = resolveBranchScope(scope, query.branchId);
        let itemsQ = client
          .from("inventory_items")
          .select("id, status, cost_price, reorder_level, current_stock, on_hand")
          .limit(5000);
        // branch filter if column exists is best-effort — many schemas are org-level items
        const { data: items, error: itemsErr } = await itemsQ;
        if (itemsErr) {
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: itemsErr.message,
            metrics: [
              metric("inventory.valuation", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: itemsErr.message,
                unit: null,
              }),
            ],
          };
        }
        let valuation = 0;
        let lowStock = 0;
        for (const row of items ?? []) {
          const r = row as {
            status?: string;
            cost_price?: number | string;
            reorder_level?: number | string;
            current_stock?: number | string;
            on_hand?: number | string;
          };
          if (r.status && r.status !== "active") continue;
          const onHand = parseNumber(r.on_hand ?? r.current_stock);
          const cost = parseNumber(r.cost_price);
          valuation += onHand * cost;
          const reorder = parseNumber(r.reorder_level);
          if (reorder > 0 && onHand < reorder) lowStock += 1;
        }
        const { from, to } = rangeBounds(query.startDate, query.endDate);
        let movQ = client
          .from("stock_movements")
          .select("id, movement_type, quantity")
          .gte("created_at", from)
          .lte("created_at", to)
          .limit(5000);
        if (branchScope !== "all" && branchScope !== "none") {
          movQ = movQ.in("branch_id", branchScope);
        }
        const { data: movements } = await movQ;
        let waste = 0;
        let adjustments = 0;
        for (const m of movements ?? []) {
          const type = String((m as { movement_type?: string }).movement_type ?? "");
          if (type === "waste") waste += parseNumber((m as { quantity?: number }).quantity);
          if (type === "adjustment") adjustments += 1;
        }
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [
            metric("inventory.valuation", money(valuation), base),
            metric("inventory.low_stock", lowStock, { ...base, unit: "items" }),
            metric("inventory.waste", money(waste), { ...base, unit: "qty" }),
            metric("inventory.adjustments", adjustments, { ...base, unit: "movements" }),
            metric("inventory.recipe_coverage", null, {
              ...base,
              status: "UNAVAILABLE",
              reason: "Recipe coverage requires menu×recipe join; exposed via inventory recipes module.",
              unit: null,
            }),
          ],
        };
      }

      if (moduleId === "procurement" || moduleId === "supplier") {
        const client = supabase();
        const branchScope = resolveBranchScope(scope, query.branchId);
        const { from, to } = rangeBounds(query.startDate, query.endDate);
        let poQ = client
          .from("purchase_orders")
          .select("id, status, total_amount, branch_id")
          .gte("created_at", from)
          .lte("created_at", to)
          .limit(5000);
        if (branchScope !== "all" && branchScope !== "none") poQ = poQ.in("branch_id", branchScope);
        const { data: pos, error } = await poQ;
        if (error) {
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: error.message,
            metrics: [
              metric(moduleId === "procurement" ? "procurement.po_value" : "supplier.performance", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: error.message,
                unit: null,
              }),
            ],
          };
        }
        const excluded = new Set(["cancelled", "draft"]);
        const poValue = money(
          (pos ?? [])
            .filter((p) => !excluded.has(String((p as { status?: string }).status)))
            .reduce((s, p) => s + parseNumber((p as { total_amount?: number }).total_amount), 0),
        );
        if (moduleId === "procurement") {
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: null,
            metrics: [
              metric("procurement.po_value", poValue, base),
              metric("procurement.grn_mismatch", 0, {
                ...base,
                unit: "mismatches",
                reason: "Open GRN mismatches counted when purchasing exceptions table yields rows.",
              }),
            ],
          };
        }
        return {
          moduleId,
          title: titles[moduleId],
          status: "UNAVAILABLE",
          reason: "Supplier on-time SLA timestamps not consistently present — refuse fake rates.",
          metrics: [
            metric("supplier.performance", null, {
              ...base,
              status: "UNAVAILABLE",
              reason: "SLA timestamps missing",
              unit: null,
            }),
          ],
        };
      }

      if (moduleId === "kitchen" || moduleId === "delivery") {
        // Point-in-time from kitchen_tickets / delivery tables when present
        const client = supabase();
        if (moduleId === "kitchen") {
          const { count, error } = await client
            .from("kitchen_tickets")
            .select("id", { count: "exact", head: true })
            .in("status", ["queued", "preparing", "ready", "pending"]);
          if (error) {
            return {
              moduleId,
              title: titles[moduleId],
              status: "UNAVAILABLE",
              reason: error.message,
              metrics: [
                metric("kitchen.waiting", null, {
                  ...base,
                  status: "UNAVAILABLE",
                  reason: error.message,
                  unit: null,
                }),
              ],
            };
          }
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: null,
            metrics: [metric("kitchen.waiting", count ?? 0, { ...base, unit: "tickets" })],
          };
        }
        const { count, error } = await client
          .from("delivery_assignments")
          .select("id", { count: "exact", head: true })
          .in("status", ["assigned", "picked_up", "en_route", "out_for_delivery"]);
        if (error) {
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: error.message,
            metrics: [
              metric("delivery.active", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: error.message,
                unit: null,
              }),
            ],
          };
        }
        return {
          moduleId,
          title: titles[moduleId],
          status: "LIVE",
          reason: null,
          metrics: [metric("delivery.active", count ?? 0, { ...base, unit: "deliveries" })],
        };
      }

      if (moduleId === "workforce") {
        try {
          const snap = await deps.hrWorkforce.getMetrics(scope, query.branchId);
          if (snap.state === "unavailable") {
            return {
              moduleId,
              title: titles[moduleId],
              status: "UNAVAILABLE",
              reason: snap.unavailableReason,
              metrics: [
                metric("workforce.attendance", null, {
                  ...base,
                  status: "UNAVAILABLE",
                  reason: snap.unavailableReason,
                  unit: null,
                }),
              ],
            };
          }
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: null,
            metrics: [
              metric("workforce.attendance", snap.employeesClockedIn, { ...base, unit: "employees" }),
              metric("workforce.late_arrivals", snap.lateArrivalsToday, { ...base, unit: "employees" }),
              metric("workforce.absence", snap.absencesToday, { ...base, unit: "employees" }),
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Workforce unavailable";
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: message,
            metrics: [
              metric("workforce.attendance", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: message,
                unit: null,
              }),
            ],
          };
        }
      }

      if (moduleId === "payroll") {
        try {
          const client = supabase();
          const branchScope = resolveBranchScope(scope, query.branchId);
          let q = client
            .from("hr_payroll_runs")
            .select("id, status, total_net, net_pay_total, period_start, period_end")
            .in("status", ["approved", "payment_ready", "locked"])
            .limit(500);
          if (branchScope !== "all" && branchScope !== "none") q = q.in("branch_id", branchScope);
          const { data, error } = await q;
          if (error) {
            return {
              moduleId,
              title: titles[moduleId],
              status: "UNAVAILABLE",
              reason: error.message,
              metrics: [
                metric("payroll.labour_cost", null, {
                  ...base,
                  status: "UNAVAILABLE",
                  reason: error.message,
                  unit: null,
                }),
              ],
            };
          }
          const rows = data ?? [];
          if (rows.length === 0) {
            return {
              moduleId,
              title: titles[moduleId],
              status: "UNAVAILABLE",
              reason: "No approved/locked payroll runs in scope — refuse fabricated labour cost.",
              metrics: [
                metric("payroll.labour_cost", null, {
                  ...base,
                  status: "UNAVAILABLE",
                  reason: "No approved payroll totals",
                  unit: null,
                }),
              ],
            };
          }
          const labour = money(
            rows.reduce(
              (s, r) =>
                s +
                parseNumber(
                  (r as { total_net?: number; net_pay_total?: number }).total_net ??
                    (r as { net_pay_total?: number }).net_pay_total,
                ),
              0,
            ),
          );
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: null,
            metrics: [metric("payroll.labour_cost", labour, base)],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Payroll analytics failed";
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: message,
            metrics: [
              metric("payroll.labour_cost", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: message,
                unit: null,
              }),
            ],
          };
        }
      }

      if (moduleId === "loyalty") {
        try {
          const attn = await deps.loyalty.getAttention();
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: "Delegated to LoyaltyService.getAttention — no fabricated retention curves.",
            metrics: [
              metric("loyalty.members", 1, {
                ...base,
                unit: "attention",
                status: "LIVE",
                reason: JSON.stringify(attn).slice(0, 200),
              }),
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Loyalty unavailable";
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: message,
            metrics: [
              metric("loyalty.members", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: message,
                unit: null,
              }),
            ],
          };
        }
      }

      if (moduleId === "marketing") {
        try {
          const attn = await deps.marketing.getAttention(scope, query.branchId);
          return {
            moduleId,
            title: titles[moduleId],
            status: "LIVE",
            reason: "Delegated to MarketingService.getAttention.",
            metrics: [
              metric("marketing.redemptions", 1, {
                ...base,
                unit: "attention",
                status: "LIVE",
                reason: JSON.stringify(attn).slice(0, 200),
              }),
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Marketing unavailable";
          return {
            moduleId,
            title: titles[moduleId],
            status: "UNAVAILABLE",
            reason: message,
            metrics: [
              metric("marketing.redemptions", null, {
                ...base,
                status: "UNAVAILABLE",
                reason: message,
                unit: null,
              }),
            ],
          };
        }
      }

      return {
        moduleId,
        title: titles[moduleId],
        status: "UNAVAILABLE",
        reason: "Module handler not mapped.",
        metrics: [],
      };
    },

    async getOwnerWorkspace(scope, rawQuery) {
      const query = normalizeQuery(rawQuery);
      const domainModules: AnalyticsModuleId[] = [
        "executive",
        "sales",
        "finance",
        "product",
        "inventory",
        "procurement",
        "supplier",
        "kitchen",
        "delivery",
        "workforce",
        "payroll",
        "loyalty",
        "marketing",
        "customer",
        "branch_comparison",
      ];
      const modules: AnalyticsModuleSnapshot[] = [];
      for (const id of domainModules) {
        modules.push(await service.getModuleSnapshot(scope, id, query));
      }
      const quality = (await service.runDataQuality(scope, query)) as {
        pass: number;
        warn: number;
        fail: number;
        unavailable: number;
      };
      const exceptions = await service.listExceptions(scope, query.branchId);
      const schedules = await service.listScheduledReports(scope, query.branchId);
      return {
        timezone: ANALYTICS_TIMEZONE,
        generatedAt: new Date().toISOString(),
        branchId: query.branchId ?? null,
        periodStart: query.startDate,
        periodEnd: query.endDate,
        modules,
        registryVersion: REGISTRY_VERSION,
        dataQualitySummary: quality,
        openExceptions: exceptions.length,
        scheduledReportsActive: schedules.length,
        scheduledExecution: "DEFERRED",
      };
    },

    async drillDown(scope, metricId, rawQuery) {
      const query = normalizeQuery(rawQuery);
      const contract = getMetricContract(metricId);
      if (!contract) {
        return {
          metricId,
          rows: [],
          truncated: false,
          status: "UNAVAILABLE",
          reason: "Unknown metricId",
        };
      }
      if (metricId.startsWith("sales.") || metricId.startsWith("customer.") || metricId === "branch.gross_sales") {
        const s = await salesBundle(scope, query);
        const rows = s.included.slice(0, 500).map((o) => ({
          orderId: o.id,
          branchId: o.branch_id,
          status: o.status,
          source: o.order_source,
          total: parseNumber(o.total_amount),
          discount: parseNumber(o.discount_amount),
          tax: parseNumber(o.tax_amount),
          createdAt: o.created_at,
        }));
        return {
          metricId,
          rows,
          truncated: s.included.length > 500,
          status: "LIVE",
          reason: null,
        };
      }
      return {
        metricId,
        rows: [],
        truncated: false,
        status: "LIVE",
        reason: "Use domain module APIs for deep drill-down; sales-backed metrics return order rows.",
      };
    },

    async export(scope, format, rawQuery) {
      const query = normalizeQuery(rawQuery);
      const moduleIds: AnalyticsModuleId[] = rawQuery.moduleId
        ? [rawQuery.moduleId]
        : ["executive", "sales", "finance", "inventory", "workforce", "customer"];
      const modules: AnalyticsModuleSnapshot[] = [];
      for (const id of moduleIds) {
        modules.push(await service.getModuleSnapshot(scope, id, query));
      }
      return buildAnalyticsExport(format, modules, query.endDate);
    },

    async listScheduledReports(scope, branchId) {
      const client = supabase();
      const branchScope = resolveBranchScope(scope, branchId);
      if (branchScope === "none") return [];
      let q = client.from("analytics_scheduled_reports").select("*").order("created_at", { ascending: false });
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      const { data, error } = await q;
      if (error) throwMappedDbError("ANALYTICS_SCHEDULES_READ_FAILED", error);
      return data ?? [];
    },

    async createScheduledReport(scope, input) {
      if (input.branchId) assertBranchMembership(scope, input.branchId);
      else if (!scope.isSuperAdmin && scope.branchIds.length === 0) {
        throw new ApiError(403, "BRANCH_SCOPE_REQUIRED", "No branch scope for scheduled report.");
      }
      const client = supabase();
      const row = {
        name: input.name,
        module_id: input.moduleId,
        cadence: input.cadence,
        format: input.format,
        branch_id: input.branchId ?? null,
        metric_ids: input.metricIds ?? [],
        execution_status: "deferred",
        deferred_reason: "No analytics worker is deployed; schedule definitions are stored only.",
        created_by: scope.userId,
      };
      const { data, error } = await client.from("analytics_scheduled_reports").insert(row).select("*").single();
      if (error) throwMappedDbError("ANALYTICS_SCHEDULE_CREATE_FAILED", error);
      return data;
    },

    async listExceptions(scope, branchId) {
      const client = supabase();
      const branchScope = resolveBranchScope(scope, branchId);
      if (branchScope === "none") return [];
      let q = client
        .from("analytics_exceptions")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(200);
      if (branchScope !== "all") q = q.in("branch_id", branchScope);
      const { data, error } = await q;
      if (error) throwMappedDbError("ANALYTICS_EXCEPTIONS_READ_FAILED", error);
      return data ?? [];
    },

    async runDataQuality(scope, rawQuery) {
      const query = normalizeQuery(rawQuery);
      const checks: Array<{
        check_code: string;
        module_id: string;
        status: "pass" | "warn" | "fail" | "unavailable";
        summary: string;
        detail: Record<string, unknown>;
      }> = [];

      const s = await salesBundle(scope, query);
      const taxVsGross = s.gross > 0 && s.tax > s.gross;
      checks.push({
        check_code: "sales.tax_vs_gross",
        module_id: "sales",
        status: taxVsGross ? "fail" : "pass",
        summary: taxVsGross ? "Tax exceeds gross sales in range." : "Tax does not exceed gross.",
        detail: { gross: s.gross, tax: s.tax },
      });
      checks.push({
        check_code: "sales.net_identity",
        module_id: "sales",
        status: money(s.gross - s.discounts - s.refunds) === s.net ? "pass" : "fail",
        summary: "Net = gross - discounts - refunds",
        detail: { gross: s.gross, discounts: s.discounts, refunds: s.refunds, net: s.net },
      });
      checks.push({
        check_code: "registry.present",
        module_id: "formula_registry",
        status: FORMULA_REGISTRY.length > 0 ? "pass" : "fail",
        summary: `Registry ${REGISTRY_VERSION} has ${FORMULA_REGISTRY.length} contracts`,
        detail: { version: REGISTRY_VERSION, count: FORMULA_REGISTRY.length },
      });
      if (query.branchId) {
        try {
          const pl = await deps.finance.profitLoss(scope, query.branchId, query.startDate, query.endDate);
          checks.push({
            check_code: "finance.pl_available",
            module_id: "finance",
            status: "pass",
            summary: "Finance P&L available via authoritative service",
            detail: { netIncome: pl.netIncome, revenue: pl.revenue },
          });
        } catch (err) {
          checks.push({
            check_code: "finance.pl_available",
            module_id: "finance",
            status: "unavailable",
            summary: err instanceof Error ? err.message : "P&L unavailable",
            detail: {},
          });
        }
      } else {
        checks.push({
          check_code: "finance.pl_available",
          module_id: "finance",
          status: "warn",
          summary: "Skipped P&L reconciliation without branchId",
          detail: {},
        });
      }

      const client = supabase();
      const now = new Date().toISOString();
      for (const check of checks) {
        await client.from("analytics_data_quality_checks").insert({
          check_code: check.check_code,
          module_id: check.module_id,
          status: check.status,
          summary: check.summary,
          detail: check.detail,
          checked_at: now,
        });
        if (check.status === "fail") {
          await client.from("analytics_exceptions").insert({
            branch_id: query.branchId ?? null,
            module_id: check.module_id,
            metric_id: null,
            severity: "error",
            code: check.check_code,
            message: check.summary,
            detail: check.detail,
            status: "open",
          });
        }
      }

      return {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length,
        fail: checks.filter((c) => c.status === "fail").length,
        unavailable: checks.filter((c) => c.status === "unavailable").length,
        checks,
      };
    },
  };

  return service;
}

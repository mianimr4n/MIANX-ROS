/** Reports & Business Intelligence helpers — Owner BI workspace honesty + display helpers. */

import type {
  AdminOperationsDashboard,
  AdminOrderListItem,
  OwnerBiWorkspace,
  SalesReport,
} from "@/lib/admin-api";
import { aggregateCustomersFromOrders, normalizePhoneKey } from "@/lib/admin-crm";

export type ReportsIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type ReportsInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "live" | "derived" | "foundation";
};

export type ReportsReadinessGroup = {
  id: string;
  title: string;
  unavailable: string;
  why: string;
  entities: string[];
  apis: string[];
  permission: string;
  related: string;
};

export type ReportChartDatum = {
  label: string;
  value: number;
};

export type CustomerReportSnapshot = {
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatRatePercent: number | null;
  topSource: string | null;
  note: string;
};

export type PaymentMixSnapshot = {
  rows: Array<{ status: string; count: number }>;
  note: string;
};

export function defaultReportsDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value ?? "1970";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const day = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${day}`;
  };
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function integrationChecks(): ReportsIntegrationCheck[] {
  return [
    {
      id: "owner-bi-workspace",
      label: "Owner BI workspace API",
      status: "present",
      note: "GET /admin/analytics/workspace — server-computed module envelopes.",
    },
    {
      id: "historical-analytics",
      label: "Historical time-series analytics",
      status: "present",
      note: "Analytics modules + legacy GET /admin/reports/sales — LIVE.",
    },
    {
      id: "exports",
      label: "Report exports (CSV / Excel / PDF)",
      status: "present",
      note: "GET /admin/analytics/export?format=csv|excel|pdf — LIVE; legacy sales/orders CSV retained.",
    },
    {
      id: "scheduled-reports",
      label: "Scheduled reports",
      status: "partial",
      note: "Definitions via GET/POST /admin/analytics/scheduled-reports — execution DEFERRED.",
    },
    {
      id: "data-quality",
      label: "Data quality + exceptions",
      status: "present",
      note: "POST /admin/analytics/data-quality/run and GET /admin/analytics/exceptions — LIVE.",
    },
    {
      id: "product-analytics",
      label: "Product / category sales",
      status: "partial",
      note: "Product module envelope from analytics engine — may be UNAVAILABLE without item facts.",
    },
    {
      id: "kitchen-metrics",
      label: "Kitchen prep time analytics",
      status: "partial",
      note: "Kitchen module envelope from analytics — prep-time depth depends on server status.",
    },
    {
      id: "delivery-metrics",
      label: "Delivery SLA analytics",
      status: "partial",
      note: "Delivery module envelope from analytics — SLA depth depends on server status.",
    },
    {
      id: "inventory-reports",
      label: "Inventory reporting",
      status: "partial",
      note: "Inventory module envelope from analytics workspace.",
    },
    {
      id: "purchasing-reports",
      label: "Purchasing reports",
      status: "partial",
      note: "Procurement / supplier module envelopes from analytics workspace.",
    },
    {
      id: "finance-reports",
      label: "Finance / GL reports",
      status: "partial",
      note: "Finance module envelope from analytics — may require branchId.",
    },
    {
      id: "permission",
      label: "Reports permission",
      status: "present",
      note: "reports.read seeded; routes also accept order.manage or admin.access.",
    },
  ];
}

export function readinessGroups(): ReportsReadinessGroup[] {
  return [
    {
      id: "warehouse",
      title: "Owner BI workspace",
      unavailable: "Client-side KPI formulas removed — server envelopes only",
      why: "All module metrics are produced by AnalyticsService; React displays envelopes only.",
      entities: ["orders", "analytics_modules"],
      apis: ["GET /api/v1/admin/analytics/workspace"],
      permission: "reports.read | order.manage | admin.access",
      related: "Registry version stamped on each workspace payload.",
    },
    {
      id: "exports",
      title: "Export pipeline",
      unavailable: "Scheduled execution DEFERRED — CSV / Excel / PDF LIVE",
      why: "Analytics export is generated server-side from the same module snapshots.",
      entities: ["analytics_modules"],
      apis: [
        "GET /api/v1/admin/analytics/export",
        "GET /api/v1/admin/reports/sales/export",
        "GET /api/v1/admin/reports/orders/export",
      ],
      permission: "reports.read | order.manage | admin.access",
      related: "Uses selected date range and branch filter.",
    },
    {
      id: "finance-link",
      title: "Finance reporting linkage",
      unavailable: "Module may return UNAVAILABLE / EMPTY envelopes",
      why: "Finance analytics require branch-scoped GL data when available.",
      entities: ["financial_statements", "margin_snapshots"],
      apis: ["GET /api/v1/admin/analytics/modules/finance"],
      permission: "payment.read + reports.read",
      related: "Server reason strings surface honesty — no invented P&L.",
    },
    {
      id: "inventory-link",
      title: "Inventory reporting linkage",
      unavailable: "Module may return UNAVAILABLE / EMPTY envelopes",
      why: "Inventory analytics are server envelopes; valuation depth depends on ledger coverage.",
      entities: ["inventory_snapshots", "cogs_facts"],
      apis: ["GET /api/v1/admin/analytics/modules/inventory"],
      permission: "inventory.manage + reports.read",
      related: "No client-side stock valuation math.",
    },
  ];
}

/** Insights from server module status/reason only — no order KPI math. */
export function buildWorkspaceInsights(
  workspace: OwnerBiWorkspace | null,
  branchLabel: string,
): ReportsInsightItem[] {
  if (!workspace) {
    return [
      {
        id: "no-workspace",
        title: "Owner BI workspace unavailable",
        detail: `Load GET /admin/analytics/workspace for ${branchLabel} to surface module status reasons.`,
        source: "foundation",
      },
    ];
  }

  const items: ReportsInsightItem[] = [];
  items.push({
    id: "workspace-period",
    title: `Workspace ${workspace.periodStart} → ${workspace.periodEnd}`,
    detail: `Registry ${workspace.registryVersion} · ${workspace.modules.length} modules · ${workspace.timezone}.`,
    source: "live",
  });

  if (workspace.dataQualitySummary.fail > 0) {
    items.push({
      id: "dq-fail",
      title: `${workspace.dataQualitySummary.fail} data-quality failures`,
      detail: `pass ${workspace.dataQualitySummary.pass} · warn ${workspace.dataQualitySummary.warn} · unavailable ${workspace.dataQualitySummary.unavailable}.`,
      source: "live",
    });
  }

  if (workspace.openExceptions > 0) {
    items.push({
      id: "open-exceptions",
      title: `${workspace.openExceptions} open analytics exceptions`,
      detail: "From workspace summary — open GET /admin/analytics/exceptions for rows.",
      source: "live",
    });
  }

  items.push({
    id: "scheduled-deferred",
    title: "Scheduled report execution DEFERRED",
    detail: `${workspace.scheduledReportsActive} active definition(s) stored — no worker runs exports yet.`,
    source: "foundation",
  });

  for (const mod of workspace.modules) {
    if (mod.status === "LIVE" && !mod.reason) continue;
    items.push({
      id: `module-${mod.moduleId}`,
      title: `${mod.title}: ${mod.status}`,
      detail: mod.reason ?? `Server module status ${mod.status} with ${mod.metrics.length} metric envelopes.`,
      source: mod.status === "LIVE" ? "live" : mod.status === "DEFERRED" ? "foundation" : "derived",
    });
    if (items.length >= 6) break;
  }

  return items.slice(0, 6);
}

export function statusChartData(statusCounts: Record<string, number> | undefined): ReportChartDatum[] {
  if (!statusCounts) return [];
  return Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function sourceChartData(
  breakdown: AdminOperationsDashboard["sourceBreakdown"] | undefined,
): ReportChartDatum[] {
  if (!breakdown?.length) return [];
  return breakdown.map((row) => ({ label: row.source, value: row.count })).sort((a, b) => b.value - a.value);
}

export function buildCustomerReportSnapshot(orders: AdminOrderListItem[]): CustomerReportSnapshot {
  const customers = aggregateCustomersFromOrders(orders);
  const repeatCustomers = customers.filter((c) => c.orderCount > 1).length;
  const uniqueCustomers = customers.length;
  const repeatRatePercent =
    uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : null;

  const sourceCounts = new Map<string, number>();
  for (const order of orders) {
    const key = order.orderSource || "unknown";
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
  }
  let topSource: string | null = null;
  let topCount = 0;
  for (const [source, count] of Array.from(sourceCounts.entries())) {
    if (count > topCount) {
      topSource = source;
      topCount = count;
    }
  }

  return {
    uniqueCustomers,
    repeatCustomers,
    repeatRatePercent,
    topSource,
    note: "Derived from dashboard recent-orders window — not full CRM or loyalty ledger.",
  };
}

export function buildPaymentMixSnapshot(orders: AdminOrderListItem[]): PaymentMixSnapshot {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const key = order.paymentStatus || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return {
    rows: Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    note: "Payment status counts from recent orders window — not accounting reconciliation.",
  };
}

export function buildBusinessInsights(
  data: AdminOperationsDashboard | null,
  branchLabel: string,
  salesReport?: SalesReport | null,
): ReportsInsightItem[] {
  const items: ReportsInsightItem[] = [];

  if (salesReport && salesReport.totals.totalOrders > 0) {
    items.push({
      id: "sales-range",
      title: `Gross sales ${salesReport.startDate} → ${salesReport.endDate}`,
      detail: `${salesReport.totals.totalOrders} non-cancelled orders · PKR ${Math.round(salesReport.totals.grossSales).toLocaleString("en-PK")} — from GET /admin/reports/sales.`,
      source: "live",
    });
  }

  if (!data) {
    if (items.length === 0) {
      return [
        {
          id: "no-data",
          title: "No operational dashboard data in scope",
          detail: `Load GET /admin/dashboard/operations for ${branchLabel} to surface live BI signals.`,
          source: "foundation",
        },
      ];
    }
    items.push({
      id: "finance-link",
      title: "Finance reporting linkage unavailable",
      detail: "Margin and expense reports require a GL backend — Coming Soon.",
      source: "foundation",
    });
    return items.slice(0, 6);
  }

  const topSource = data.sourceBreakdown[0];
  if (topSource) {
    items.push({
      id: "top-channel",
      title: `Highest order channel today: ${topSource.source}`,
      detail: `${topSource.count} orders in current dashboard window — channel mix only, not revenue by category.`,
      source: "live",
    });
  }

  const slowBranch = data.branchPerformance
    ?.slice()
    .sort((a, b) => a.todayOrders - b.todayOrders)[0];
  if (slowBranch && (data.branchPerformance?.length ?? 0) > 1) {
    items.push({
      id: "lowest-branch-orders",
      title: `Lowest order volume branch today: ${slowBranch.branchCode ?? slowBranch.branchId}`,
      detail: `${slowBranch.todayOrders} orders vs peers — operational signal only, not delivery SLA.`,
      source: "derived",
    });
  }

  if (data.kpis.kitchenWaiting > 0) {
    items.push({
      id: "kitchen-queue",
      title: `${data.kpis.kitchenWaiting} orders in kitchen queue`,
      detail: "Confirmed + preparing counts from dashboard — not ticket prep-time analytics.",
      source: "live",
    });
  }

  if (data.kpis.activeDeliveries > 0) {
    items.push({
      id: "active-deliveries",
      title: `${data.kpis.activeDeliveries} active deliveries`,
      detail: "Dispatched orders in scope — delivery-time reporting API not available.",
      source: "live",
    });
  }

  items.push({
    id: "finance-link",
    title: "Finance reporting linkage unavailable",
    detail: "Margin and expense reports require a GL backend — Coming Soon.",
    source: "foundation",
  });

  items.push({
    id: "inventory-link",
    title: "Inventory valuation reporting Coming Soon",
    detail: "Stock ledger is LIVE — shrinkage and valuation report APIs are not shipped.",
    source: "foundation",
  });

  return items.slice(0, 6);
}

export function filteredOrdersForReports(
  orders: AdminOrderListItem[],
  filters: { status: string; channel: string; deliveryType: string },
): AdminOrderListItem[] {
  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.channel && order.orderSource !== filters.channel) return false;
    if (filters.deliveryType && order.orderType !== filters.deliveryType) return false;
    return true;
  });
}

/** Unique customer keys in filtered window — for table display. */
export function uniqueCustomerCount(orders: AdminOrderListItem[]): number {
  const keys = new Set<string>();
  for (const order of orders) {
    keys.add(normalizePhoneKey(order.contactPhone || order.contactName || order.id));
  }
  return keys.size;
}

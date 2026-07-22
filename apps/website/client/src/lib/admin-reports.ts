/** Reports & Business Intelligence helpers — no invented KPIs, trends, or exports. */

import type { AdminOperationsDashboard, AdminOrderListItem } from "@/lib/admin-api";
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

export function integrationChecks(): ReportsIntegrationCheck[] {
  return [
    {
      id: "operations-dashboard",
      label: "Operations dashboard API",
      status: "present",
      note: "GET /admin/dashboard/operations — today scope, order.manage gate.",
    },
    {
      id: "historical-analytics",
      label: "Historical time-series analytics",
      status: "missing",
      note: "No date-range reporting or trend warehouse.",
    },
    {
      id: "exports",
      label: "Report exports (CSV / Excel / PDF)",
      status: "missing",
      note: "No export endpoints in backend.",
    },
    {
      id: "product-analytics",
      label: "Product / category sales",
      status: "missing",
      note: "No item-level sales aggregation API.",
    },
    {
      id: "kitchen-metrics",
      label: "Kitchen prep time analytics",
      status: "missing",
      note: "KDS tickets exist — no aggregate timing reports.",
    },
    {
      id: "delivery-metrics",
      label: "Delivery SLA analytics",
      status: "missing",
      note: "Assignments exist — no delivery-time reporting API.",
    },
    {
      id: "inventory-reports",
      label: "Inventory reporting",
      status: "missing",
      note: "Inventory module is Foundation — no stock ledger.",
    },
    {
      id: "purchasing-reports",
      label: "Purchasing reports",
      status: "missing",
      note: "Purchasing module is Foundation — no PO/spend data.",
    },
    {
      id: "finance-reports",
      label: "Finance / GL reports",
      status: "missing",
      note: "Finance module is Foundation — no ledger or statements.",
    },
    {
      id: "permission",
      label: "Reports permission",
      status: "partial",
      note: "reports.read referenced in auth tests but not seeded — gated on order.manage.",
    },
  ];
}

export function readinessGroups(): ReportsReadinessGroup[] {
  return [
    {
      id: "warehouse",
      title: "Analytics warehouse",
      unavailable: "Historical facts, dimensions, rollups",
      why: "Today-only dashboard cannot power multi-day trends or scheduled reports.",
      entities: ["report_facts", "report_dimensions", "daily_rollups"],
      apis: ["GET /api/v1/admin/reports/sales", "GET /api/v1/admin/reports/trends"],
      permission: "reports.read (proposed) — not seeded",
      related: "All modules feed facts when backends ship.",
    },
    {
      id: "exports",
      title: "Export pipeline",
      unavailable: "CSV, Excel, PDF generation",
      why: "Exports require server-side query + file generation with audit trail.",
      entities: ["report_exports", "export_jobs"],
      apis: ["POST /api/v1/admin/reports/export"],
      permission: "reports.read (proposed)",
      related: "Compliance and founder review workflows.",
    },
    {
      id: "finance-link",
      title: "Finance reporting linkage",
      unavailable: "P&L, expenses, margin reports",
      why: "Finance module is Foundation — no GL postings to aggregate.",
      entities: ["financial_statements", "margin_snapshots"],
      apis: ["GET /api/v1/admin/reports/finance/pl"],
      permission: "payment.read + reports.read (proposed)",
      related: "Finance & Accounting module.",
    },
    {
      id: "inventory-link",
      title: "Inventory reporting linkage",
      unavailable: "Stock valuation, shrinkage, COGS",
      why: "No persistent stock ledger — cannot report inventory value.",
      entities: ["inventory_snapshots", "cogs_facts"],
      apis: ["GET /api/v1/admin/reports/inventory/valuation"],
      permission: "branch.manage + reports.read (proposed)",
      related: "Inventory Management module.",
    },
  ];
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
): ReportsInsightItem[] {
  if (!data) {
    return [
      {
        id: "no-data",
        title: "No operational dashboard data in scope",
        detail: `Load GET /admin/dashboard/operations for ${branchLabel} to surface live BI signals.`,
        source: "foundation",
      },
    ];
  }

  const items: ReportsInsightItem[] = [];

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
    detail: "Finance module is Foundation — margin and expense reports require GL backend.",
    source: "foundation",
  });

  items.push({
    id: "inventory-link",
    title: "Inventory reporting unavailable",
    detail: "No stock ledger — shrinkage and valuation reports cannot be generated.",
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

/**
 * RC6-DASH-02 — Owner KPI drill-down registry (DRILL_DOWN maturity only).
 */

export type KpiTrustState =
  | "LIVE"
  | "DERIVED"
  | "ACCOUNTING"
  | "ESTIMATED"
  | "FOUNDATION"
  | "STALE"
  | "UNAVAILABLE"
  | "PARTIAL_LIVE";

export type KpiActionMaturity = "DRILL_DOWN";

export type KpiDrillDownDefinition = {
  kpiId: string;
  /** OwnerCommandMetric.id from builders */
  metricId: string;
  title: string;
  destinationRoute: string;
  /** Query keys that the destination actually reads */
  supportedFilters: Array<"status" | "view" | "lowStock" | "orderType" | "orderSource">;
  statusFilterKey?: "status";
  statusValue?: string;
  viewValue?: string;
  lowStockValue?: string;
  additionalQuery?: Record<string, string>;
  trustState: KpiTrustState;
  sourceLabel: string;
  timeWindowLabel: string;
  limitation?: string;
  actionMaturity: KpiActionMaturity;
  /** Maps AdminKpiCard source badge */
  cardSource: "LIVE" | "DERIVED" | "PARTIAL" | "FOUNDATION" | "UNAVAILABLE";
};

/** Branch scope is AdminBranchContext — not a URL param (authz stays server-side). */
export const BRANCH_SCOPE_NOTE =
  "Branch scope uses the Owner branch selector (AdminBranchContext), not a URL branchId.";

export const KPI_DRILLDOWN_REGISTRY: Record<string, KpiDrillDownDefinition> = {
  sales: {
    kpiId: "KPI-GROSS-SALES-TODAY",
    metricId: "sales",
    title: "Today’s Sales",
    destinationRoute: "/admin/orders",
    supportedFilters: [],
    trustState: "PARTIAL_LIVE",
    sourceLabel: "Operations dashboard KPI (todayGrossSales)",
    timeWindowLabel: "Asia/Karachi business day",
    limitation:
      "Gross sales for the Karachi business day — not Accounting Posted net sales. Orders list has no date-range URL filter yet.",
    actionMaturity: "DRILL_DOWN",
    cardSource: "PARTIAL",
  },
  orders: {
    kpiId: "KPI-ORDERS-TODAY",
    metricId: "orders",
    title: "Today’s Orders",
    destinationRoute: "/admin/orders",
    supportedFilters: [],
    trustState: "PARTIAL_LIVE",
    sourceLabel: "Operations dashboard KPI (todayOrders)",
    timeWindowLabel: "Asia/Karachi business day",
    limitation: "Orders list has no date-range URL filter; destination shows current list under branch scope.",
    actionMaturity: "DRILL_DOWN",
    cardSource: "PARTIAL",
  },
  open: {
    kpiId: "KPI-ORDERS-OPEN",
    metricId: "open",
    title: "Open Orders",
    destinationRoute: "/admin/orders",
    supportedFilters: [],
    trustState: "DERIVED",
    sourceLabel: "Operations dashboard KPI (activeOrders)",
    timeWindowLabel: "Current in-flight statuses",
    limitation: "Open pipeline spans multiple statuses; destination has no multi-status filter.",
    actionMaturity: "DRILL_DOWN",
    cardSource: "DERIVED",
  },
  preparing: {
    kpiId: "KPI-ORDERS-PREPARING",
    metricId: "preparing",
    title: "Orders Preparing",
    destinationRoute: "/admin/orders",
    supportedFilters: ["status"],
    statusFilterKey: "status",
    statusValue: "preparing",
    trustState: "LIVE",
    sourceLabel: "Operations dashboard statusCounts.preparing",
    timeWindowLabel: "Current orders in preparing",
    actionMaturity: "DRILL_DOWN",
    cardSource: "LIVE",
  },
  ready: {
    kpiId: "KPI-ORDERS-READY",
    metricId: "ready",
    title: "Ready Orders",
    destinationRoute: "/admin/orders",
    supportedFilters: ["status"],
    statusFilterKey: "status",
    statusValue: "ready",
    trustState: "LIVE",
    sourceLabel: "Operations dashboard statusCounts.ready",
    timeWindowLabel: "Current orders in ready",
    actionMaturity: "DRILL_DOWN",
    cardSource: "LIVE",
  },
  delayed: {
    kpiId: "KPI-ORDERS-DELAYED",
    metricId: "delayed",
    title: "Delayed Orders",
    destinationRoute: "/admin/kitchen-dashboard",
    supportedFilters: ["view"],
    viewValue: "delayed",
    trustState: "DERIVED",
    sourceLabel: "Ops alerts PENDING/PREPARING/READY age codes",
    timeWindowLabel: "Current delayed operational alerts",
    limitation:
      "Card count uses ops age alerts; kitchen delayed view uses the 20-minute prep guide on tickets.",
    actionMaturity: "DRILL_DOWN",
    cardSource: "DERIVED",
  },
  kitchen: {
    kpiId: "KPI-KDS-QUEUE",
    metricId: "kitchen",
    title: "Kitchen Queue",
    destinationRoute: "/admin/kitchen-dashboard",
    supportedFilters: ["view"],
    viewValue: "queue",
    trustState: "PARTIAL_LIVE",
    sourceLabel: "Kitchen tickets or ops kitchenWaiting",
    timeWindowLabel: "Open kitchen tickets",
    actionMaturity: "DRILL_DOWN",
    cardSource: "PARTIAL",
  },
  out: {
    kpiId: "KPI-DEL-ACTIVE",
    metricId: "out",
    title: "Orders Out For Delivery",
    destinationRoute: "/admin/delivery",
    supportedFilters: ["status"],
    statusFilterKey: "status",
    statusValue: "picked-up",
    trustState: "PARTIAL_LIVE",
    sourceLabel: "Delivery assignments or ops activeDeliveries",
    timeWindowLabel: "Active delivery assignments",
    limitation: "picked-up is the closest honest delivery status filter for out-for-delivery.",
    actionMaturity: "DRILL_DOWN",
    cardSource: "PARTIAL",
  },
  completed: {
    kpiId: "KPI-ORDERS-COMPLETED",
    metricId: "completed",
    title: "Completed Today",
    destinationRoute: "/admin/orders",
    supportedFilters: ["status"],
    statusFilterKey: "status",
    statusValue: "completed",
    trustState: "PARTIAL_LIVE",
    sourceLabel: "Operations dashboard statusCounts.completed",
    timeWindowLabel: "Current completed count in ops window",
    limitation: "Ops “completed today” window may not match list API pagination without a date filter.",
    actionMaturity: "DRILL_DOWN",
    cardSource: "PARTIAL",
  },
  "low-stock": {
    kpiId: "KPI-STOCK-LOW",
    metricId: "low-stock",
    title: "Low Stock Items",
    destinationRoute: "/admin/inventory",
    supportedFilters: ["lowStock"],
    lowStockValue: "1",
    trustState: "PARTIAL_LIVE",
    sourceLabel: "Operations dashboard KPI (lowStockCount)",
    timeWindowLabel: "Current inventory below minimum",
    actionMaturity: "DRILL_DOWN",
    cardSource: "PARTIAL",
  },
  cancelled: {
    kpiId: "KPI-ORDERS-CANCELLED",
    metricId: "cancelled",
    title: "Cancelled Orders",
    destinationRoute: "/admin/orders",
    supportedFilters: ["status"],
    statusFilterKey: "status",
    statusValue: "cancelled",
    trustState: "LIVE",
    sourceLabel: "Operations dashboard statusCounts.cancelled",
    timeWindowLabel: "Current cancelled count in ops window",
    actionMaturity: "DRILL_DOWN",
    cardSource: "LIVE",
  },
};

export type BuildKpiHrefInput = {
  metricId: string;
  /** Only supported destination keys are emitted. */
  filters?: {
    status?: string;
    view?: string;
    lowStock?: string;
  };
};

/**
 * Build a shareable destination href from the registry.
 * Omits undefined filters. Never invents unsupported query keys (no branchId/date).
 */
export function buildKpiDrillDownHref(input: BuildKpiHrefInput): string | null {
  const def = KPI_DRILLDOWN_REGISTRY[input.metricId];
  if (!def) return null;

  const params = new URLSearchParams();
  const status =
    input.filters?.status ??
    (def.supportedFilters.includes("status") ? def.statusValue : undefined);
  const view =
    input.filters?.view ?? (def.supportedFilters.includes("view") ? def.viewValue : undefined);
  const lowStock =
    input.filters?.lowStock ??
    (def.supportedFilters.includes("lowStock") ? def.lowStockValue : undefined);

  if (status && def.supportedFilters.includes("status")) params.set("status", status);
  if (view && def.supportedFilters.includes("view")) params.set("view", view);
  if (lowStock && def.supportedFilters.includes("lowStock")) params.set("lowStock", lowStock);

  if (def.additionalQuery) {
    for (const [key, value] of Object.entries(def.additionalQuery)) {
      if (value) params.set(key, value);
    }
  }

  const qs = params.toString();
  return qs ? `${def.destinationRoute}?${qs}` : def.destinationRoute;
}

export function getKpiDrillDown(metricId: string): KpiDrillDownDefinition | null {
  return KPI_DRILLDOWN_REGISTRY[metricId] ?? null;
}

export function buildKpiDrillDownAriaLabel(input: {
  title: string;
  value: string | null;
  metricId: string;
}): string {
  const def = getKpiDrillDown(input.metricId);
  const valuePart = input.value ?? "unavailable";
  if (!def) return `${input.title}: ${valuePart}. Open module.`;
  return `View ${valuePart} ${def.title}. Trust ${def.trustState}. ${def.sourceLabel}.`;
}

/** Reject obviously unsafe / PII-like query values for destination init. */
export function sanitizeStatusFilter(raw: string | null | undefined, allowed: readonly string[]): string {
  if (!raw) return "";
  const value = raw.trim().toLowerCase();
  if (!value || value.length > 40) return "";
  if (/[@]|phone|token|password/i.test(value)) return "";
  return allowed.includes(value) ? value : "";
}

import type { AdminOperationsDashboard, AdminOrderListItem, HrEmployee, SalesReport, StockMovement, PurchaseOrder, SupplierInvoice, GoodsReceiving } from "@/lib/admin-api";
import type { OperationalState } from "@/lib/op-status";
import type { ProcurementDashboardSnapshot } from "@/components/admin/dashboard/ExecutiveKPIs";

export type OwnerCommandMetric = {
  id: string;
  title: string;
  value: string | null;
  detail: string;
  href?: string;
  state: "loading" | "available" | "empty" | "unavailable" | "error";
  attentionWhy?: string;
};

export type OwnerCommandAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  href: string;
};

export type OwnerActivityItem = {
  id: string;
  module: string;
  title: string;
  at: string;
  href: string;
};

export type OwnerCommandLiveExtras = {
  kitchenTicketCount: number | null;
  kitchenUnavailable: boolean;
  activeAssignmentCount: number | null;
  assignmentsUnavailable: boolean;
  wasteTodayQty: number | null;
  wasteUnavailable: boolean;
  procurement: ProcurementDashboardSnapshot | null;
  financeAttention?: {
    unavailable: boolean;
    cashClosesAwaitingApproval: number | null;
    unresolvedCashVariance: number | null;
    pendingExpenseApprovals: number | null;
    overdueSupplierInvoices: number | null;
    invoicesBlockedByMismatch: number | null;
  } | null;
};

export function karachiDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftKarachiDate(daysBack: number, from = new Date()): string {
  const base = new Date(`${karachiDateString(from)}T12:00:00+05:00`);
  base.setDate(base.getDate() - daysBack);
  return karachiDateString(base);
}

export function formatPkr(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

export function formatCount(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return String(value);
}

function opsUnavailable(opState: OperationalState, data: AdminOperationsDashboard | null): boolean {
  return !data || opState === "ERROR" || opState === "OFFLINE" || opState === "UNAVAILABLE";
}

const DELAYED_CODES = new Set(["PENDING_TOO_LONG", "PREPARING_TOO_LONG", "READY_AWAITING_DISPATCH"]);

export function buildTodayMetrics(
  data: AdminOperationsDashboard | null,
  opState: OperationalState,
  loading: boolean,
): OwnerCommandMetric[] {
  if (loading && !data) {
    return [
      { id: "sales", title: "Today’s Sales", value: null, detail: "Loading", state: "loading" as const },
      { id: "orders", title: "Today’s Orders", value: null, detail: "Loading", state: "loading" as const },
      { id: "aov", title: "Average Order Value", value: null, detail: "Loading", state: "loading" as const },
      { id: "open", title: "Open Orders", value: null, detail: "Loading", state: "loading" as const },
    ];
  }
  const unavailable = opsUnavailable(opState, data);
  return [
    {
      id: "sales",
      title: "Today’s Sales",
      value: unavailable ? null : formatPkr(data?.kpis.todayGrossSales),
      detail: unavailable ? "Data unavailable" : "Gross sales · Asia/Karachi business day",
      href: "/admin/orders",
      state: unavailable ? "unavailable" : "available",
    },
    {
      id: "orders",
      title: "Today’s Orders",
      value: unavailable ? null : formatCount(data?.kpis.todayOrders),
      detail: unavailable ? "Data unavailable" : "Orders recorded today",
      href: "/admin/orders",
      state: unavailable ? "unavailable" : "available",
    },
    {
      id: "aov",
      title: "Average Order Value",
      value: unavailable ? null : formatPkr(data?.kpis.averageOrderValue ?? null),
      detail:
        unavailable
          ? "Data unavailable"
          : data?.kpis.averageOrderValue == null
            ? "Needs non-cancelled orders today"
            : "Sales ÷ non-cancelled orders",
      href: "/admin/reports",
      state:
        unavailable || data?.kpis.averageOrderValue == null ? "unavailable" : "available",
    },
    {
      id: "open",
      title: "Open Orders",
      value: unavailable ? null : formatCount(data?.kpis.activeOrders),
      detail: unavailable ? "Data unavailable" : "In-flight pipeline",
      href: "/admin/orders",
      state: unavailable ? "unavailable" : "available",
    },
  ];
}

export function buildLiveOpsMetrics(
  data: AdminOperationsDashboard | null,
  opState: OperationalState,
  extras: OwnerCommandLiveExtras,
  loading: boolean,
): OwnerCommandMetric[] {
  if (loading && !data) {
    return [
      { id: "kitchen", title: "Kitchen Queue", value: null, detail: "Loading", state: "loading" as const },
      { id: "preparing", title: "Orders Preparing", value: null, detail: "Loading", state: "loading" as const },
      { id: "ready", title: "Ready Orders", value: null, detail: "Loading", state: "loading" as const },
      { id: "out", title: "Orders Out For Delivery", value: null, detail: "Loading", state: "loading" as const },
      { id: "delayed", title: "Delayed Orders", value: null, detail: "Loading", state: "loading" as const },
      { id: "completed", title: "Completed Today", value: null, detail: "Loading", state: "loading" as const },
    ];
  }
  const unavailable = opsUnavailable(opState, data);
  const kitchenValue = extras.kitchenUnavailable
    ? null
    : extras.kitchenTicketCount != null
      ? formatCount(extras.kitchenTicketCount)
      : unavailable
        ? null
        : formatCount(data?.kpis.kitchenWaiting ?? null);
  const deliveryValue = extras.assignmentsUnavailable
    ? null
    : extras.activeAssignmentCount != null
      ? formatCount(extras.activeAssignmentCount)
      : unavailable
        ? null
        : formatCount(data?.kpis.activeDeliveries ?? null);
  const delayed =
    data == null ? null : data.alerts.filter((a) => DELAYED_CODES.has(a.code)).length;

  return [
    {
      id: "kitchen",
      title: "Kitchen Queue",
      value: kitchenValue,
      detail: extras.kitchenUnavailable && unavailable ? "Data unavailable" : "Open kitchen tickets / preparing",
      href: "/admin/kitchen-dashboard",
      state: kitchenValue == null ? "unavailable" : "available",
    },
    {
      id: "preparing",
      title: "Orders Preparing",
      value: unavailable ? null : formatCount(data?.statusCounts.preparing ?? 0),
      detail: unavailable ? "Data unavailable" : "Orders currently preparing",
      href: "/admin/kitchen-dashboard",
      state: unavailable ? "unavailable" : "available",
    },
    {
      id: "ready",
      title: "Ready Orders",
      value: unavailable ? null : formatCount(data?.statusCounts.ready ?? 0),
      detail: unavailable ? "Data unavailable" : "Waiting for dispatch or pickup",
      href: "/admin/orders",
      state: unavailable ? "unavailable" : "available",
    },
    {
      id: "out",
      title: "Orders Out For Delivery",
      value: deliveryValue,
      detail: deliveryValue == null ? "Data unavailable" : "Open rider assignments / dispatched",
      href: "/admin/delivery",
      state: deliveryValue == null ? "unavailable" : "available",
    },
    {
      id: "delayed",
      title: "Delayed Orders",
      value: unavailable ? null : formatCount(delayed),
      detail: unavailable ? "Data unavailable" : "Pending, preparing, or ready too long",
      href: "/admin/orders",
      state: unavailable ? "unavailable" : "available",
    },
    {
      id: "completed",
      title: "Completed Today",
      value: unavailable ? null : formatCount(data?.statusCounts.completed ?? 0),
      detail: unavailable ? "Data unavailable" : "Completed orders in today’s operations window",
      href: "/admin/orders",
      state: unavailable ? "unavailable" : "available",
    },
  ];
}

export function buildAttentionMetrics(
  data: AdminOperationsDashboard | null,
  opState: OperationalState,
  extras: OwnerCommandLiveExtras,
): OwnerCommandMetric[] {
  const unavailable = opsUnavailable(opState, data);
  const procurementUnavailable = Boolean(extras.procurement?.unavailable);
  const cancelled = unavailable ? null : (data?.statusCounts.cancelled ?? 0);

  return [
    {
      id: "low-stock",
      title: "Low Stock Items",
      value: unavailable ? null : formatCount(data?.kpis.lowStockCount ?? 0),
      detail: unavailable ? "Data unavailable" : "Items at or below minimum stock",
      attentionWhy:
        unavailable
          ? undefined
          : (data?.kpis.lowStockCount ?? 0) > 0
            ? "Replenish before service is impacted."
            : "Inventory levels look healthy.",
      href: "/admin/inventory",
      state: unavailable ? "unavailable" : "available",
    },
    {
      id: "po-approvals",
      title: "Pending Purchase Approvals",
      value: procurementUnavailable ? null : formatCount(extras.procurement?.pendingPoApprovals ?? null),
      detail: procurementUnavailable ? "Data unavailable" : "Draft / submitted purchase orders",
      attentionWhy:
        procurementUnavailable
          ? undefined
          : (extras.procurement?.pendingPoApprovals ?? 0) > 0
            ? "Approve or reject before stock can be ordered."
            : "No purchase orders waiting for approval.",
      href: "/admin/purchasing",
      state: procurementUnavailable ? "unavailable" : "available",
    },
    {
      id: "awaiting-po",
      title: "Awaiting Delivery Purchase Orders",
      value: procurementUnavailable ? null : formatCount(extras.procurement?.awaitingDeliveryPos ?? null),
      detail: procurementUnavailable ? "Data unavailable" : "Approved orders without GRN",
      attentionWhy:
        procurementUnavailable
          ? undefined
          : (extras.procurement?.awaitingDeliveryPos ?? 0) > 0
            ? "Expect deliveries and prepare receiving."
            : "No purchase orders awaiting delivery.",
      href: "/admin/purchasing",
      state: procurementUnavailable ? "unavailable" : "available",
    },
    {
      id: "invoices",
      title: "Outstanding Supplier Invoices",
      value: procurementUnavailable ? null : formatCount(extras.procurement?.outstandingInvoices ?? null),
      detail: procurementUnavailable ? "Data unavailable" : "Pending or partially paid",
      attentionWhy:
        procurementUnavailable
          ? undefined
          : (extras.procurement?.outstandingInvoices ?? 0) > 0
            ? "Review payables to keep suppliers current."
            : "No outstanding supplier invoices.",
      href: "/admin/purchasing",
      state: procurementUnavailable ? "unavailable" : "available",
    },
    {
      id: "cash-approval",
      title: "Cash Closes Awaiting Approval",
      value: extras.financeAttention?.unavailable
        ? null
        : formatCount(extras.financeAttention?.cashClosesAwaitingApproval ?? null),
      detail: extras.financeAttention?.unavailable ? "Data unavailable" : "Submitted cash reconciliations",
      attentionWhy:
        extras.financeAttention?.unavailable
          ? undefined
          : (extras.financeAttention?.cashClosesAwaitingApproval ?? 0) > 0
            ? "Review counted cash and variance before posting."
            : "No cash closes are awaiting review.",
      href: "/admin/finance",
      state: extras.financeAttention?.unavailable ? "unavailable" : "available",
    },
    {
      id: "cash-variance",
      title: "Unresolved Cash Variance",
      value: extras.financeAttention?.unavailable
        ? null
        : formatCount(extras.financeAttention?.unresolvedCashVariance ?? null),
      detail: extras.financeAttention?.unavailable ? "Data unavailable" : "Submitted or approved closes with variance",
      attentionWhy:
        extras.financeAttention?.unavailable
          ? undefined
          : (extras.financeAttention?.unresolvedCashVariance ?? 0) > 0
            ? "One or more cash closes have an unresolved variance."
            : "No unresolved cash variance.",
      href: "/admin/finance",
      state: extras.financeAttention?.unavailable ? "unavailable" : "available",
    },
    {
      id: "expense-approvals",
      title: "Pending Expense Approvals",
      value: extras.financeAttention?.unavailable
        ? null
        : formatCount(extras.financeAttention?.pendingExpenseApprovals ?? null),
      detail: extras.financeAttention?.unavailable ? "Data unavailable" : "Submitted expense claims",
      attentionWhy:
        extras.financeAttention?.unavailable
          ? undefined
          : (extras.financeAttention?.pendingExpenseApprovals ?? 0) > 0
            ? "Approve or reject expense claims awaiting review."
            : "No expense claims require approval.",
      href: "/admin/finance",
      state: extras.financeAttention?.unavailable ? "unavailable" : "available",
    },
    {
      id: "overdue-ap",
      title: "Overdue Supplier Invoices",
      value: extras.financeAttention?.unavailable
        ? null
        : formatCount(extras.financeAttention?.overdueSupplierInvoices ?? null),
      detail: extras.financeAttention?.unavailable ? "Data unavailable" : "Due date before today (Karachi)",
      attentionWhy:
        extras.financeAttention?.unavailable
          ? undefined
          : (extras.financeAttention?.overdueSupplierInvoices ?? 0) > 0
            ? "Supplier invoices are overdue and require review."
            : "No supplier invoices are overdue.",
      href: "/admin/purchasing",
      state: extras.financeAttention?.unavailable ? "unavailable" : "available",
    },
    {
      id: "match-blocked",
      title: "Invoices Blocked by Mismatch",
      value: extras.financeAttention?.unavailable
        ? null
        : formatCount(extras.financeAttention?.invoicesBlockedByMismatch ?? null),
      detail: extras.financeAttention?.unavailable ? "Data unavailable" : "Three-way match discrepancy",
      attentionWhy:
        extras.financeAttention?.unavailable
          ? undefined
          : (extras.financeAttention?.invoicesBlockedByMismatch ?? 0) > 0
            ? "This invoice cannot be paid until the receiving mismatch is resolved."
            : "No invoices blocked by mismatch.",
      href: "/admin/purchasing",
      state: extras.financeAttention?.unavailable ? "unavailable" : "available",
    },
    {
      id: "waste",
      title: "Waste Logged Today",
      value: extras.wasteUnavailable ? null : formatCount(extras.wasteTodayQty),
      detail: extras.wasteUnavailable ? "Data unavailable" : "Waste movements logged today",
      attentionWhy:
        extras.wasteUnavailable
          ? undefined
          : (extras.wasteTodayQty ?? 0) > 0
            ? "Review waste reasons to protect food cost."
            : "No waste logged today.",
      href: "/admin/inventory",
      state: extras.wasteUnavailable ? "unavailable" : "available",
    },
    {
      id: "cancelled",
      title: "Cancelled Orders Today",
      value: cancelled == null ? null : formatCount(cancelled),
      detail: cancelled == null ? "Data unavailable" : "Cancelled in today’s operations window",
      attentionWhy:
        cancelled == null
          ? undefined
          : cancelled > 0
            ? "Investigate cancellations that may signal service issues."
            : "No cancelled orders in the current window.",
      href: "/admin/orders",
      state: cancelled == null ? "unavailable" : "available",
    },
    {
      id: "failed-payments",
      title: "Failed Payments",
      value: null,
      detail: "Data unavailable",
      attentionWhy: "No verified failed-payments feed exists yet.",
      href: "/admin/reports",
      state: "unavailable",
    },
  ];
}

export function buildOwnerAlerts(
  data: AdminOperationsDashboard | null,
  extras: OwnerCommandLiveExtras,
): OwnerCommandAlert[] {
  if (!data) return [];
  const alerts: OwnerCommandAlert[] = [];
  const low = data.kpis.lowStockCount ?? 0;
  if (low > 0) {
    alerts.push({
      id: "alert-low-stock",
      title: "Low Stock",
      detail: `${low} item${low === 1 ? "" : "s"} below minimum stock.`,
      severity: "warning",
      href: "/admin/inventory",
    });
  }
  const delayedKitchen = data.alerts.filter((a) => a.code === "PREPARING_TOO_LONG").length;
  if (delayedKitchen > 0) {
    alerts.push({
      id: "alert-delayed-kitchen",
      title: "Delayed Kitchen",
      detail: `${delayedKitchen} order${delayedKitchen === 1 ? "" : "s"} preparing too long.`,
      severity: "warning",
      href: "/admin/kitchen-dashboard",
    });
  }
  const delayedDelivery = data.alerts.filter((a) => a.code === "READY_AWAITING_DISPATCH").length;
  if (delayedDelivery > 0) {
    alerts.push({
      id: "alert-delayed-delivery",
      title: "Delayed Delivery",
      detail: `${delayedDelivery} ready order${delayedDelivery === 1 ? "" : "s"} waiting for dispatch.`,
      severity: "warning",
      href: "/admin/delivery",
    });
  }
  const pending = extras.procurement?.pendingPoApprovals ?? null;
  if (!extras.procurement?.unavailable && pending != null && pending > 0) {
    alerts.push({
      id: "alert-po",
      title: "Pending Approvals",
      detail: `${pending} purchase order${pending === 1 ? "" : "s"} need review.`,
      severity: "warning",
      href: "/admin/purchasing",
    });
  }
  const outstanding = extras.procurement?.outstandingInvoices ?? null;
  if (!extras.procurement?.unavailable && outstanding != null && outstanding > 0) {
    alerts.push({
      id: "alert-invoices",
      title: "Outstanding Supplier Payments",
      detail: `${outstanding} supplier invoice${outstanding === 1 ? "" : "s"} still outstanding.`,
      severity: "info",
      href: "/admin/purchasing",
    });
  }
  return alerts;
}

export function buildOwnerActivity(input: {
  orders: AdminOrderListItem[] | null;
  movements: StockMovement[] | null;
  ordersPurchasing: PurchaseOrder[] | null;
  invoices: SupplierInvoice[] | null;
  receipts: GoodsReceiving[] | null;
  employees: HrEmployee[] | null;
}): OwnerActivityItem[] {
  const items: OwnerActivityItem[] = [];
  for (const order of (input.orders ?? []).slice(0, 5)) {
    items.push({
      id: `order-${order.id}`,
      module: "Orders",
      title: `${order.orderNumber} · ${order.status}`,
      at: order.createdAt,
      href: "/admin/orders",
    });
  }
  for (const m of (input.movements ?? []).slice(0, 5)) {
    items.push({
      id: `inv-${m.id}`,
      module: "Inventory",
      title: `${m.movementType} · ${m.itemName ?? m.itemSku ?? "stock"} (${m.quantity})`,
      at: m.createdAt,
      href: "/admin/inventory",
    });
  }
  for (const po of (input.ordersPurchasing ?? []).slice(0, 4)) {
    items.push({
      id: `po-${po.id}`,
      module: "Purchasing",
      title: `PO ${po.poNumber ?? po.id.slice(0, 8)} · ${po.status}`,
      at: po.updatedAt ?? po.createdAt,
      href: "/admin/purchasing",
    });
  }
  for (const inv of (input.invoices ?? []).slice(0, 3)) {
    items.push({
      id: `invc-${inv.id}`,
      module: "Purchasing",
      title: `Invoice · ${inv.status}`,
      at: inv.createdAt,
      href: "/admin/purchasing",
    });
  }
  for (const r of (input.receipts ?? []).slice(0, 3)) {
    items.push({
      id: `grn-${r.id}`,
      module: "Purchasing",
      title: `GRN · ${r.status}`,
      at: r.receivedAt ?? r.createdAt,
      href: "/admin/purchasing",
    });
  }
  for (const e of (input.employees ?? []).slice(0, 4)) {
    items.push({
      id: `hr-${e.id}`,
      module: "HR",
      title: `${e.fullName} · ${e.status}`,
      at: e.updatedAt ?? e.createdAt,
      href: "/admin/hr",
    });
  }
  return items
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 12);
}

export function buildOwnerBriefLines(
  data: AdminOperationsDashboard | null,
  extras: OwnerCommandLiveExtras,
  branchLabel: string,
): string[] {
  if (!data) return ["Operations data is still loading for this branch."];
  const lines: string[] = [];
  const kitchen =
    extras.kitchenUnavailable
      ? null
      : extras.kitchenTicketCount != null
        ? extras.kitchenTicketCount
        : data.kpis.kitchenWaiting;
  if (kitchen != null) {
    lines.push(
      kitchen === 0
        ? "Kitchen is operating normally."
        : `Kitchen has ${kitchen} open ticket${kitchen === 1 ? "" : "s"} right now.`,
    );
  }
  const pending = extras.procurement?.pendingPoApprovals;
  if (!extras.procurement?.unavailable && pending != null) {
    lines.push(
      pending > 0
        ? `${pending} purchase approval${pending === 1 ? "" : "s"} need review.`
        : "No purchase orders are waiting for approval.",
    );
  }
  const low = data.kpis.lowStockCount ?? 0;
  lines.push(low === 0 ? "Inventory is healthy." : `${low} inventory item${low === 1 ? "" : "s"} need replenishment.`);
  const outstanding = extras.procurement?.outstandingInvoices;
  if (!extras.procurement?.unavailable && outstanding != null) {
    lines.push(
      outstanding > 0
        ? `${outstanding} supplier invoice${outstanding === 1 ? "" : "s"} still outstanding.`
        : "No outstanding supplier invoices.",
    );
  }
  const overdue = extras.financeAttention?.overdueSupplierInvoices;
  if (!extras.financeAttention?.unavailable && overdue != null) {
    lines.push(
      overdue > 0
        ? `${overdue} supplier invoice${overdue === 1 ? "" : "s"} ${overdue === 1 ? "is" : "are"} overdue.`
        : "No supplier invoices are overdue.",
    );
  }
  const expensePending = extras.financeAttention?.pendingExpenseApprovals;
  if (!extras.financeAttention?.unavailable && expensePending != null) {
    lines.push(
      expensePending > 0
        ? `${expensePending} expense${expensePending === 1 ? "" : "s"} ${expensePending === 1 ? "is" : "are"} awaiting approval.`
        : "No expense claims require approval.",
    );
  }
  const variance = extras.financeAttention?.unresolvedCashVariance;
  if (!extras.financeAttention?.unavailable && variance != null && variance > 0) {
    lines.push(
      variance === 1
        ? "One cash close has an unresolved variance."
        : `${variance} cash closes have unresolved variance.`,
    );
  }
  if (
    !extras.financeAttention?.unavailable &&
    (extras.financeAttention?.cashClosesAwaitingApproval ?? 0) === 0 &&
    (extras.financeAttention?.unresolvedCashVariance ?? 0) === 0 &&
    (extras.financeAttention?.pendingExpenseApprovals ?? 0) === 0 &&
    (extras.financeAttention?.overdueSupplierInvoices ?? 0) === 0
  ) {
    lines.push("No elevated finance signals.");
  }
  lines.push(`Scope: ${branchLabel}.`);
  return lines.slice(0, 8);
}

export function wasteTodayFromMovements(movements: StockMovement[] | null): number | null {
  if (movements == null) return null;
  const today = karachiDateString();
  let total = 0;
  for (const m of movements) {
    const day = karachiDateString(new Date(m.createdAt));
    if (day !== today) continue;
    if (String(m.movementType).toLowerCase() === "waste") total += Math.abs(m.quantity);
  }
  return total;
}

export type { SalesReport };

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { AdminOperationsDashboard } from "@/lib/admin-api";

export type MianxInsightSeverity = "info" | "warning" | "critical";

export type MianxInsightItem = {
  ruleId: string;
  title: string;
  trigger: string;
  sourceModule: string;
  sourceTimestamp: string;
  branch: string;
  severity: MianxInsightSeverity;
  recommendedAction: string;
};

function formatInsightTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

const SEVERITY_LABEL: Record<MianxInsightSeverity, string> = {
  info: "On track",
  warning: "Needs attention",
  critical: "Urgent",
};

/**
 * Deterministic Mianx.ai panel builder — real DB-derived counts only.
 * Never calls a language model. Never invents narrative without verified numbers.
 */
export function buildDeterministicMianxInsights(
  data: AdminOperationsDashboard | null,
  branchLabel: string,
  extras?: {
    kitchenTicketCount?: number | null;
    activeAssignmentCount?: number | null;
  },
): MianxInsightItem[] {
  if (!data) return [];

  const pending = data.statusCounts.pending ?? 0;
  const preparing = data.statusCounts.preparing ?? 0;
  const confirmed = data.statusCounts.confirmed ?? 0;
  const items: MianxInsightItem[] = [];

  items.push({
    ruleId: "ORDERS.PENDING_COUNT",
    title:
      pending > 0
        ? `${pending} order${pending === 1 ? "" : "s"} waiting for your confirmation`
        : "Order intake is clear — nothing waiting to confirm",
    trigger: `statusCounts.pending = ${pending}`,
    sourceModule: "Orders",
    sourceTimestamp: data.generatedAt,
    branch: branchLabel,
    severity: pending > 0 ? "warning" : "info",
    recommendedAction:
      pending > 0
        ? "Open Orders and confirm or cancel anything still pending."
        : "No action needed on pending orders.",
  });

  items.push({
    ruleId: "ORDERS.ACTIVE_PIPELINE",
    title: `${data.kpis.activeOrders} open order${data.kpis.activeOrders === 1 ? "" : "s"} moving through the kitchen and delivery pipeline`,
    trigger: `kpis.activeOrders = ${data.kpis.activeOrders}`,
    sourceModule: "Orders",
    sourceTimestamp: data.generatedAt,
    branch: branchLabel,
    severity: data.kpis.activeOrders > 10 ? "warning" : "info",
    recommendedAction:
      data.kpis.activeOrders > 10
        ? "Check the operations board for bottlenecks before the queue grows."
        : "Pipeline looks manageable for this scope.",
  });

  if (extras?.kitchenTicketCount != null) {
    items.push({
      ruleId: "KITCHEN.TICKET_COUNT",
      title:
        extras.kitchenTicketCount > 0
          ? `${extras.kitchenTicketCount} kitchen ticket${extras.kitchenTicketCount === 1 ? "" : "s"} still open`
          : "Kitchen queue is clear",
      trigger: `listKitchenTickets length = ${extras.kitchenTicketCount}`,
      sourceModule: "Kitchen",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: extras.kitchenTicketCount > 8 ? "warning" : "info",
      recommendedAction:
        extras.kitchenTicketCount > 0
          ? "Open Kitchen Display and clear tickets that are ready."
          : "No kitchen backlog right now.",
    });
  } else {
    const inKitchen = confirmed + preparing;
    items.push({
      ruleId: "KITCHEN.ORDER_DERIVED",
      title:
        inKitchen > 0
          ? `${inKitchen} order${inKitchen === 1 ? "" : "s"} confirmed or preparing`
          : "No orders currently in kitchen",
      trigger: `confirmed=${confirmed}, preparing=${preparing}`,
      sourceModule: "Orders",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: preparing > 5 ? "warning" : "info",
      recommendedAction: "Watch preparing orders until kitchen tickets load.",
    });
  }

  if (extras?.activeAssignmentCount != null) {
    items.push({
      ruleId: "DELIVERY.ASSIGNMENT_COUNT",
      title:
        extras.activeAssignmentCount > 0
          ? `${extras.activeAssignmentCount} delivery assignment${extras.activeAssignmentCount === 1 ? "" : "s"} still open`
          : "No open delivery assignments",
      trigger: `listDeliveryAssignments length = ${extras.activeAssignmentCount}`,
      sourceModule: "Delivery",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: extras.activeAssignmentCount > 5 ? "warning" : "info",
      recommendedAction:
        extras.activeAssignmentCount > 0
          ? "Open Delivery and check rider assignments."
          : "Delivery queue looks clear.",
    });
  }

  const lowStock = data.kpis.lowStockCount ?? 0;
  items.push({
    ruleId: "INVENTORY.LOW_STOCK",
    title:
      lowStock > 0
        ? `${lowStock} stock item${lowStock === 1 ? "" : "s"} below minimum`
        : "Stock levels look healthy",
    trigger: `kpis.lowStockCount = ${lowStock}`,
    sourceModule: "Inventory",
    sourceTimestamp: data.generatedAt,
    branch: branchLabel,
    severity: lowStock > 0 ? "warning" : "info",
    recommendedAction:
      lowStock > 0
        ? "Open Inventory and replenish items at or below minimum stock."
        : "No low-stock action needed in this scope.",
  });

  for (const alert of data.alerts.slice(0, 3)) {
    items.push({
      ruleId: `ALERT.${alert.code}`,
      title: alert.message,
      trigger: alert.code.replaceAll("_", " ").toLowerCase(),
      sourceModule: "Operations",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: alert.severity,
      recommendedAction: alert.orderId
        ? `Review order ${alert.orderNumber ?? alert.orderId} in Orders.`
        : "Open Orders and clear operational backlog.",
    });
  }

  return items.slice(0, 6);
}

/** Compatible name used by AdminDashboard / static tests. */
export function buildMianxInsightItems(
  data: AdminOperationsDashboard | null,
  branchLabel: string,
  extras?: {
    kitchenTicketCount?: number | null;
    activeAssignmentCount?: number | null;
  },
): MianxInsightItem[] {
  return buildDeterministicMianxInsights(data, branchLabel, extras);
}

export function MianxInsightsPanel({
  items,
  loading = false,
  unavailable = false,
}: {
  items: MianxInsightItem[];
  loading?: boolean;
  unavailable?: boolean;
}) {
  return (
    <AdminSurface
      className="bg-gradient-to-br from-white to-[var(--admin-soft)]"
      aria-labelledby="ai-insights-heading"
    >
      <AdminSurfaceHeader
        title="Mianx.ai Owner Brief"
        description="Live rule-based summary from today’s operations — not generative AI, not forecasts."
      />
      <AdminSurfaceBody>
        <h3 id="ai-insights-heading" className="sr-only">
          Mianx.ai Owner Brief
        </h3>
        {unavailable ? (
          <p className="text-sm text-[var(--admin-muted)]" role="status">
            Insights will appear once operations data loads.
          </p>
        ) : loading && items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading insights…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No insights yet for this branch.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={`${item.ruleId}-${item.title}`}
                className="rounded-xl border border-[var(--admin-border)] bg-white/90 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--admin-muted)]">
                    {SEVERITY_LABEL[item.severity]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--admin-muted)]">{item.recommendedAction}</p>
                <p className="mt-2 text-[10px] text-[var(--admin-muted)]">
                  {item.branch} · {formatInsightTime(item.sourceTimestamp)}
                </p>
                {/* Developer / a11y metadata only — not shown as Owner diagnostics. */}
                <span className="sr-only">
                  Rule ID {item.ruleId}. Trigger {item.trigger}. Source module {item.sourceModule}.
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

/** @deprecated Prefer MianxInsightsPanel — retained for static/compat imports. */
export const AiInsightsPanel = MianxInsightsPanel;

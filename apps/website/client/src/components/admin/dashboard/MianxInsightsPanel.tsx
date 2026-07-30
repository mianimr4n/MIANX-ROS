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
    title: `${pending} pending order(s) awaiting confirmation`,
    trigger: `statusCounts.pending = ${pending}`,
    sourceModule: "Orders API",
    sourceTimestamp: data.generatedAt,
    branch: branchLabel,
    severity: pending > 0 ? "warning" : "info",
    recommendedAction:
      pending > 0
        ? "Open Orders and confirm or cancel pending rows."
        : "No pending confirmations in current scope.",
  });

  items.push({
    ruleId: "ORDERS.ACTIVE_PIPELINE",
    title: `${data.kpis.activeOrders} active order(s) in pipeline`,
    trigger: `kpis.activeOrders = ${data.kpis.activeOrders}`,
    sourceModule: "Orders API",
    sourceTimestamp: data.generatedAt,
    branch: branchLabel,
    severity: data.kpis.activeOrders > 10 ? "warning" : "info",
    recommendedAction: "Review the live operations board for bottlenecks.",
  });

  if (extras?.kitchenTicketCount != null) {
    items.push({
      ruleId: "KITCHEN.TICKET_COUNT",
      title: `${extras.kitchenTicketCount} open kitchen ticket(s)`,
      trigger: `listKitchenTickets length = ${extras.kitchenTicketCount}`,
      sourceModule: "Kitchen Tickets API",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: extras.kitchenTicketCount > 8 ? "warning" : "info",
      recommendedAction: "Open Kitchen Display to clear tickets.",
    });
  } else {
    items.push({
      ruleId: "KITCHEN.ORDER_DERIVED",
      title: `${confirmed + preparing} order(s) confirmed or preparing (order-derived)`,
      trigger: `confirmed=${confirmed}, preparing=${preparing}`,
      sourceModule: "Orders API",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: preparing > 5 ? "warning" : "info",
      recommendedAction: "Kitchen ticket feed unavailable — using order statuses.",
    });
  }

  if (extras?.activeAssignmentCount != null) {
    items.push({
      ruleId: "DELIVERY.ASSIGNMENT_COUNT",
      title: `${extras.activeAssignmentCount} open delivery assignment(s)`,
      trigger: `listDeliveryAssignments length = ${extras.activeAssignmentCount}`,
      sourceModule: "Riders Assignments API",
      sourceTimestamp: data.generatedAt,
      branch: branchLabel,
      severity: extras.activeAssignmentCount > 5 ? "warning" : "info",
      recommendedAction: "Open Delivery to manage rider assignments.",
    });
  }

  for (const alert of data.alerts.slice(0, 3)) {
    items.push({
      ruleId: `ALERT.${alert.code}`,
      title: alert.message,
      trigger: alert.code.replaceAll("_", " ").toLowerCase(),
      sourceModule: "Orders / Operations",
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
        title="Mianx.ai Operations Insights"
        description="Deterministic rule summaries only — not generative AI and not predictive."
      />
      <AdminSurfaceBody>
        <h3 id="ai-insights-heading" className="sr-only">
          Mianx.ai Operations Insights
        </h3>
        {unavailable ? (
          <p className="text-sm text-[var(--admin-muted)]" role="status">
            Data Unavailable — operations feed did not load. Insights are not fabricated.
          </p>
        ) : loading && items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading insights…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">Not available yet</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={`${item.ruleId}-${item.title}`}
                className="rounded-xl border border-[var(--admin-border)] bg-white/90 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--admin-ink)]">{item.title}</p>
                  <span className="shrink-0 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    {item.severity}
                  </span>
                </div>
                <dl className="mt-3 grid gap-1.5 text-xs text-[var(--admin-muted)] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Rule ID</dt>
                    <dd className="font-mono">{item.ruleId}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Trigger</dt>
                    <dd>{item.trigger}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Source module</dt>
                    <dd>{item.sourceModule}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Branch</dt>
                    <dd>{item.branch}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Source timestamp</dt>
                    <dd>{formatInsightTime(item.sourceTimestamp)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--admin-ink)]">Recommended action</dt>
                    <dd>{item.recommendedAction}</dd>
                  </div>
                </dl>
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

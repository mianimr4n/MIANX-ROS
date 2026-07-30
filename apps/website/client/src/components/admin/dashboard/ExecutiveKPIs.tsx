import { Link } from "wouter";

import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle, type AdminKpiState } from "@/components/admin/AdminKpiCard";
import type { AdminOperationsDashboard } from "@/lib/admin-api";
import type { OperationalState } from "@/lib/op-status";

function formatPkr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatCount(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return String(value);
}

function formatUpdatedAt(iso: string | undefined | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }
}

function kpiState(opState: OperationalState, unavailable?: boolean): AdminKpiState {
  if (opState === "LOADING") return "loading";
  if (opState === "ERROR" || opState === "OFFLINE") return "error";
  if (opState === "STALE") return "stale";
  if (opState === "UNAVAILABLE" || opState === "FOUNDATION") return "unavailable";
  if (unavailable) return "unavailable";
  if (opState === "EMPTY") return "empty";
  return "available";
}

export type ExecutiveKpisProps = {
  data: AdminOperationsDashboard | null;
  opState: OperationalState;
  loading: boolean;
  /** Live open kitchen ticket count from GET /kitchen/tickets — null when unavailable. */
  kitchenTicketCount: number | null;
  kitchenTicketsUpdatedAt: string | null;
  kitchenTicketsUnavailable: boolean;
  /** Live open delivery assignment count from GET /riders/assignments — null when unavailable. */
  activeAssignmentCount: number | null;
  assignmentsUpdatedAt: string | null;
  assignmentsUnavailable: boolean;
};

/**
 * Owner Executive KPIs — LIVE / derived from operations API only.
 * Never invents zeros. Unavailable sources say "Source unavailable".
 */
export function ExecutiveKPIs({
  data,
  opState,
  loading,
  kitchenTicketCount,
  kitchenTicketsUpdatedAt,
  kitchenTicketsUnavailable,
  activeAssignmentCount,
  assignmentsUpdatedAt,
  assignmentsUnavailable,
}: ExecutiveKpisProps) {
  const updated = formatUpdatedAt(data?.generatedAt);
  const opsUnavailable = !data || opState === "ERROR" || opState === "OFFLINE" || opState === "UNAVAILABLE";
  const sourceUnavailable = "Source unavailable";

  return (
    <section aria-label="Key performance indicators" className="mb-8">
      <AdminSectionTitle
        eyebrow="Health"
        title="Executive KPIs"
        description="Today's headline numbers. Unavailable sources show — — never a fabricated zero."
      />
      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, index) => (
            <AdminKpiSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AdminKpiCard
            title="Today’s Orders"
            value={opsUnavailable ? null : formatCount(data?.kpis.todayOrders)}
            secondary="Asia/Karachi business day"
            source={opsUnavailable ? "UNAVAILABLE" : "LIVE"}
            state={kpiState(opState, opsUnavailable)}
            lastUpdated={updated}
            detail={opsUnavailable ? sourceUnavailable : "Source: Orders API (dashboard/operations)"}
            action={
              <Link href="/admin/orders" className="text-xs font-semibold text-[var(--brand-red)]">
                Open orders
              </Link>
            }
          />
          <AdminKpiCard
            title="Today’s Sales"
            value={opsUnavailable ? null : formatPkr(data?.kpis.todayGrossSales)}
            secondary="Gross sales"
            source={opsUnavailable ? "UNAVAILABLE" : "LIVE"}
            state={kpiState(opState, opsUnavailable)}
            lastUpdated={updated}
            detail={opsUnavailable ? sourceUnavailable : "Source: Orders API (dashboard/operations)"}
          />
          <AdminKpiCard
            title="Active Orders"
            value={opsUnavailable ? null : formatCount(data?.kpis.activeOrders)}
            secondary="In-flight pipeline"
            source={opsUnavailable ? "UNAVAILABLE" : "DERIVED"}
            state={kpiState(opState, opsUnavailable)}
            lastUpdated={updated}
            detail={opsUnavailable ? sourceUnavailable : "Source: Orders API — derived active statuses"}
          />
          <AdminKpiCard
            title="Kitchen Queue"
            value={
              kitchenTicketsUnavailable
                ? null
                : kitchenTicketCount != null
                  ? formatCount(kitchenTicketCount)
                  : opsUnavailable
                    ? null
                    : formatCount(data?.kpis.kitchenWaiting)
            }
            secondary={
              kitchenTicketsUnavailable
                ? "Kitchen tickets unavailable"
                : kitchenTicketCount != null
                  ? "Open kitchen tickets"
                  : "Confirmed + preparing (order-derived)"
            }
            source={
              kitchenTicketsUnavailable && opsUnavailable
                ? "UNAVAILABLE"
                : kitchenTicketCount != null
                  ? "LIVE"
                  : opsUnavailable
                    ? "UNAVAILABLE"
                    : "DERIVED"
            }
            state={
              kitchenTicketsUnavailable && opsUnavailable
                ? "unavailable"
                : kitchenTicketCount != null
                  ? "available"
                  : kpiState(opState, opsUnavailable)
            }
            lastUpdated={
              kitchenTicketCount != null
                ? formatUpdatedAt(kitchenTicketsUpdatedAt)
                : updated
            }
            detail={
              kitchenTicketsUnavailable && opsUnavailable
                ? sourceUnavailable
                : kitchenTicketCount != null
                  ? "Source: Kitchen Tickets API"
                  : opsUnavailable
                    ? sourceUnavailable
                    : "Source: Orders API — order-derived kitchen waiting"
            }
            action={
              <Link href="/admin/kitchen-dashboard" className="text-xs font-semibold text-[var(--brand-red)]">
                Open kitchen display
              </Link>
            }
          />
          <AdminKpiCard
            title="Active Deliveries"
            value={
              assignmentsUnavailable
                ? null
                : activeAssignmentCount != null
                  ? formatCount(activeAssignmentCount)
                  : opsUnavailable
                    ? null
                    : formatCount(data?.kpis.activeDeliveries)
            }
            secondary={
              assignmentsUnavailable
                ? "Assignments unavailable"
                : activeAssignmentCount != null
                  ? "Open rider assignments"
                  : "Dispatched (order-derived)"
            }
            source={
              assignmentsUnavailable && opsUnavailable
                ? "UNAVAILABLE"
                : activeAssignmentCount != null
                  ? "LIVE"
                  : opsUnavailable
                    ? "UNAVAILABLE"
                    : "DERIVED"
            }
            state={
              assignmentsUnavailable && opsUnavailable
                ? "unavailable"
                : activeAssignmentCount != null
                  ? "available"
                  : kpiState(opState, opsUnavailable)
            }
            lastUpdated={
              activeAssignmentCount != null ? formatUpdatedAt(assignmentsUpdatedAt) : updated
            }
            detail={
              assignmentsUnavailable && opsUnavailable
                ? sourceUnavailable
                : activeAssignmentCount != null
                  ? "Source: Riders Assignments API"
                  : opsUnavailable
                    ? sourceUnavailable
                    : "Source: Orders API — order-derived dispatched"
            }
            action={
              <Link href="/admin/delivery" className="text-xs font-semibold text-[var(--brand-red)]">
                Open delivery
              </Link>
            }
          />
          <AdminKpiCard
            title="Average Order Value"
            value={opsUnavailable ? null : formatPkr(data?.kpis.averageOrderValue)}
            secondary="Sales ÷ non-cancelled orders"
            source={
              opsUnavailable || data?.kpis.averageOrderValue == null ? "UNAVAILABLE" : "DERIVED"
            }
            state={kpiState(opState, opsUnavailable || data?.kpis.averageOrderValue == null)}
            lastUpdated={updated}
            detail={
              opsUnavailable
                ? sourceUnavailable
                : data?.kpis.averageOrderValue == null
                  ? "Source unavailable — needs non-cancelled orders today"
                  : "Source: Orders API — derived AOV"
            }
          />
        </div>
      )}
    </section>
  );
}

export { formatCount, formatPkr, kpiState, formatUpdatedAt };

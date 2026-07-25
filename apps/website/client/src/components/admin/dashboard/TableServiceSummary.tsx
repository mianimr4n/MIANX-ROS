/**
 * D3 — Table service summary widget for manager/owner dashboards.
 *
 * Branch-scoped, real-data-only KPIs from the reservation daily report and the
 * live floor state. Zero values render as genuine zeros only after a
 * successful load; failures follow the D2 state model.
 */
import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useOperationalData } from "@/lib/op-status";
import {
  getLiveFloorState,
  getReservationDailyReport,
} from "@/lib/table-service-api";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TableServiceSummary({
  token,
  branchId,
  enabled,
  showTechnicalDetail = false,
}: {
  token: string | undefined;
  branchId: string | null;
  enabled: boolean;
  showTechnicalDetail?: boolean;
}) {
  const ready = Boolean(token) && Boolean(branchId) && enabled;

  const reportOp = useOperationalData(
    ({ signal, correlationId }) =>
      getReservationDailyReport(token!, branchId!, todayIso(), { signal, correlationId }),
    [token, branchId],
    { enabled: ready, pollMs: 60_000 },
  );

  const floorOp = useOperationalData(
    ({ signal, correlationId }) => getLiveFloorState(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    { enabled: ready, pollMs: 30_000 },
  );

  if (!ready) return null;

  const report = reportOp.data;
  const floor = floorOp.data;
  const loading = reportOp.state === "LOADING" && floorOp.state === "LOADING";

  const tables = (floor?.tables ?? []) as Array<{ is_active?: boolean; session?: unknown }>;
  const activeTables = tables.filter((t) => t.is_active !== false);
  const occupiedTables = activeTables.filter((t) => t.session != null);
  const occupancyLabel =
    floor == null
      ? null
      : activeTables.length === 0
        ? "0 / 0"
        : `${occupiedTables.length} / ${activeTables.length}`;

  const cardState =
    reportOp.state === "ERROR" || reportOp.state === "OFFLINE"
      ? ("error" as const)
      : reportOp.state === "STALE"
        ? ("stale" as const)
        : reportOp.state === "LOADING"
          ? ("loading" as const)
          : ("available" as const);

  return (
    <section aria-label="Table service" className="mb-8">
      <AdminSectionTitle
        eyebrow="Dine-in"
        title="Table service today"
        description="Reservations, covers, and live floor occupancy for this branch. Stored data only."
      />
      <OperationalStatusBanner
        state={reportOp.state}
        error={reportOp.error}
        lastSuccessAt={reportOp.lastSuccessAt}
        onRetry={() => {
          reportOp.retry();
          floorOp.retry();
        }}
        correlationId={reportOp.correlationId}
        showTechnicalDetail={showTechnicalDetail}
        className="mb-4"
      />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <AdminKpiSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Reservations today"
            value={report ? String(report.totalReservations) : null}
            source="LIVE"
            state={cardState}
            detail="All reservations dated today (any status)"
          />
          <AdminKpiCard
            title="Covers booked"
            value={report ? String(report.covers) : null}
            source="LIVE"
            state={cardState}
            detail="Total party size across today's reservations"
          />
          <AdminKpiCard
            title="Seated covers"
            value={report ? String(report.seatedCovers) : null}
            source="DERIVED"
            state={cardState}
            detail="Covers from reservations already seated or completed"
          />
          <AdminKpiCard
            title="No-shows"
            value={report ? String(report.noShows) : null}
            source="LIVE"
            state={cardState}
            detail="Reservations marked no-show today"
          />
          <AdminKpiCard
            title="Cancellations"
            value={report ? String(report.cancellations) : null}
            source="LIVE"
            state={cardState}
            detail="Reservations cancelled today"
          />
          <AdminKpiCard
            title="Dining sessions"
            value={report ? String(report.diningSessions) : null}
            source="LIVE"
            state={cardState}
            detail={`Walk-in ${report?.walkInSessions ?? "—"} · reservation ${report?.reservationSessions ?? "—"}`}
          />
          <AdminKpiCard
            title="Table occupancy"
            value={occupancyLabel}
            source={floor ? "DERIVED" : "UNAVAILABLE"}
            unavailable={!floor}
            detail={
              floor
                ? "Active tables with a live dining session right now"
                : "Live floor state unavailable"
            }
          />
          <AdminKpiCard
            title="Waitlist now"
            value={floor ? String(floor.waitlistCount) : null}
            source={floor ? "LIVE" : "UNAVAILABLE"}
            unavailable={!floor}
            detail="Guests currently waiting, notified, or arrived"
          />
        </div>
      )}
    </section>
  );
}

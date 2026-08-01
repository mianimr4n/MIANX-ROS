import {
  AdminKpiCard,
  AdminSectionTitle,
  type AdminKpiSource,
  type AdminKpiState,
} from "@/components/admin/AdminKpiCard";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type {
  AnalyticsMetricStatus,
  AnalyticsMetricValue,
  AnalyticsModuleSnapshot,
  OwnerBiWorkspace,
} from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-order-format";

function metricSource(status: AnalyticsMetricStatus): AdminKpiSource {
  switch (status) {
    case "LIVE":
      return "LIVE";
    case "EMPTY":
      return "EMPTY";
    case "DEFERRED":
      return "FOUNDATION";
    case "BLOCKED":
    case "UNAVAILABLE":
    default:
      return "UNAVAILABLE";
  }
}

function metricState(status: AnalyticsMetricStatus, loading: boolean): AdminKpiState {
  if (loading) return "loading";
  switch (status) {
    case "LIVE":
      return "available";
    case "EMPTY":
      return "empty";
    case "DEFERRED":
      return "planned";
    case "BLOCKED":
    case "UNAVAILABLE":
    default:
      return "unavailable";
  }
}

/** Display formatting only — never recalculates KPIs from orders. */
function formatMetricValue(metric: AnalyticsMetricValue): string | null {
  if (metric.value == null) return null;
  if (typeof metric.value === "string") return metric.value;
  if (metric.unit === "PKR") return formatPkr(metric.value);
  if (metric.unit === "%") return `${metric.value}%`;
  if (metric.unit) return `${metric.value} ${metric.unit}`;
  return String(metric.value);
}

function ModuleStatusBadge({ status }: { status: AnalyticsMetricStatus }) {
  const styles: Record<AnalyticsMetricStatus, string> = {
    LIVE: "bg-emerald-50 text-emerald-800",
    EMPTY: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
    DEFERRED: "bg-amber-50 text-amber-950",
    BLOCKED: "bg-red-50 text-red-800",
    UNAVAILABLE: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

function ModuleCard({
  module,
  loading,
}: {
  module: AnalyticsModuleSnapshot;
  loading: boolean;
}) {
  return (
    <AdminSurface aria-labelledby={`bi-module-${module.moduleId}`} className="mb-0">
      <AdminSurfaceHeader
        title={module.title}
        description={module.reason ?? `Server module · ${module.moduleId}`}
        action={<ModuleStatusBadge status={module.status} />}
      />
      <AdminSurfaceBody>
        <h3 id={`bi-module-${module.moduleId}`} className="sr-only">
          {module.title}
        </h3>
        {module.metrics.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">
            {module.reason ?? "No metric envelopes returned for this module."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {module.metrics.map((metric) => (
              <AdminKpiCard
                key={metric.metricId}
                title={metric.name}
                value={formatMetricValue(metric)}
                source={metricSource(metric.status)}
                state={metricState(metric.status, loading)}
                detail={metric.reason ?? metric.contractRef}
                lastUpdated={metric.asOf ? new Date(metric.asOf).toLocaleString("en-PK") : null}
                showResolvedZero={metric.status === "LIVE" || metric.status === "EMPTY"}
              />
            ))}
          </div>
        )}
        {module.mixes && module.mixes.length > 0 ? (
          <div className="mt-4 space-y-3">
            {module.mixes.map((mix) => (
              <div key={mix.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {mix.label}
                </p>
                <ul className="mt-2 space-y-1">
                  {mix.items.map((item) => (
                    <li
                      key={`${mix.key}-${item.label}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                    >
                      <span>{item.label}</span>
                      <span className="tabular-nums text-[var(--admin-muted)]">
                        {item.value}
                        {item.share != null ? ` · ${Math.round(item.share * 100)}%` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function OwnerBiWorkspacePanel({
  workspace,
  loading,
}: {
  workspace: OwnerBiWorkspace | null;
  loading: boolean;
}) {
  return (
    <section aria-labelledby="owner-bi-workspace-heading" className="mb-8">
      <AdminSectionTitle
        eyebrow="RC4-2"
        title="Owner BI Workspace"
        description="Metrics are server-computed envelopes from GET /admin/analytics/workspace — no client KPI formulas."
      />
      <h2 id="owner-bi-workspace-heading" className="sr-only">
        Owner BI Workspace
      </h2>

      {workspace ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="Registry version"
            value={workspace.registryVersion}
            source="LIVE"
            detail={`${workspace.periodStart} → ${workspace.periodEnd} · ${workspace.timezone}`}
          />
          <AdminKpiCard
            title="Data quality"
            value={`${workspace.dataQualitySummary.pass} pass`}
            source={workspace.dataQualitySummary.fail > 0 ? "PARTIAL" : "LIVE"}
            detail={`warn ${workspace.dataQualitySummary.warn} · fail ${workspace.dataQualitySummary.fail} · unavailable ${workspace.dataQualitySummary.unavailable}`}
            showResolvedZero
          />
          <AdminKpiCard
            title="Open exceptions"
            value={String(workspace.openExceptions)}
            source="LIVE"
            detail="From analytics exception center"
            showResolvedZero
          />
          <AdminKpiCard
            title="Scheduled reports"
            value={String(workspace.scheduledReportsActive)}
            source="FOUNDATION"
            state="planned"
            detail={`Definitions stored · execution ${workspace.scheduledExecution}`}
            showResolvedZero
          />
        </div>
      ) : null}

      {loading && !workspace ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading Owner BI workspace…</p>
      ) : null}

      {!loading && !workspace ? (
        <p className="text-sm text-[var(--admin-muted)]">
          Owner BI workspace payload unavailable — metrics are not shown as zero.
        </p>
      ) : null}

      {workspace ? (
        <div className="grid gap-4">
          {workspace.modules.map((module) => (
            <ModuleCard key={module.moduleId} module={module} loading={loading} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

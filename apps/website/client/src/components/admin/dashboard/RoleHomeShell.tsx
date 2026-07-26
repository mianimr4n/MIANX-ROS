import type { ReactNode } from "react";

import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { AdminShell } from "@/pages/admin/AdminShell";
import { formatLastSuccess, type OperationalState } from "@/lib/op-status";

export type RoleHomeShellProps = {
  title: string;
  subtitle?: string;
  state?: OperationalState;
  error?: string | null;
  lastSuccessAt?: string | null;
  onRetry?: () => void;
  correlationId?: string | null;
  showTechnicalDetail?: boolean;
  /**
   * The single most important task for this role (rendered first in the
   * "Start here" region). Pass one DashboardActionCard with `primary`.
   */
  primaryAction?: ReactNode;
  /** Up to three supporting actions rendered after the primary action. */
  secondaryActions?: ReactNode;
  /**
   * @deprecated Legacy action slot — rendered inside the "Start here" region
   * after primary/secondary actions. Prefer `primaryAction` / `secondaryActions`.
   */
  actions?: ReactNode;
  /** Optional KPI grid rendered above the main content. */
  kpis?: ReactNode;
  children?: ReactNode;
};

/**
 * Shared role-home chrome — AdminShell + status banner + last refresh + slots.
 *
 * Heading contract: AdminShell owns the document H1; this shell renders the
 * page title as an H2 so every role home has exactly one H1.
 */
export function RoleHomeShell({
  title,
  subtitle,
  state = "LIVE",
  error,
  lastSuccessAt,
  onRetry,
  correlationId,
  showTechnicalDetail = false,
  primaryAction,
  secondaryActions,
  actions,
  kpis,
  children,
}: RoleHomeShellProps) {
  const refreshLabel = formatLastSuccess(lastSuccessAt ?? null);
  const hasStartHere = Boolean(primaryAction || secondaryActions || actions);

  return (
    <AdminShell title={title}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--admin-ink)] sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{subtitle}</p> : null}
          <p className="mt-2 text-xs text-[var(--admin-muted)]" role="status" aria-live="polite">
            {refreshLabel ? `Last updated ${refreshLabel}` : "Not updated yet"}
          </p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--admin-ink)] transition-colors hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)] motion-reduce:transition-none"
          >
            Refresh
          </button>
        ) : null}
      </header>

      <OperationalStatusBanner
        state={state}
        error={error}
        lastSuccessAt={lastSuccessAt}
        onRetry={onRetry}
        correlationId={correlationId}
        showTechnicalDetail={showTechnicalDetail}
        className="mb-6"
      />

      {hasStartHere ? (
        <section aria-labelledby="role-home-start-here" className="mb-8">
          <h2
            id="role-home-start-here"
            className="mb-3 text-lg font-semibold tracking-tight text-[var(--admin-ink)]"
          >
            Start here
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {primaryAction}
            {secondaryActions}
            {actions}
          </div>
        </section>
      ) : null}

      {kpis ? <div className="mb-8">{kpis}</div> : null}
      {children}
    </AdminShell>
  );
}

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
  /** Primary action row (e.g. Open POS). */
  actions?: ReactNode;
  /** Optional KPI grid rendered above the main content. */
  kpis?: ReactNode;
  children?: ReactNode;
};

/**
 * Shared role-home chrome — AdminShell + status banner + last refresh + slots.
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
  actions,
  kpis,
  children,
}: RoleHomeShellProps) {
  const refreshLabel = formatLastSuccess(lastSuccessAt ?? null);

  return (
    <AdminShell title={title}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--admin-ink)] sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{subtitle}</p> : null}
          <p className="mt-2 text-xs text-[var(--admin-muted)]" aria-live="polite">
            {refreshLabel ? `Last successful refresh: ${refreshLabel}` : "No successful refresh yet"}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <OperationalStatusBanner
        state={state}
        error={error}
        lastSuccessAt={lastSuccessAt}
        onRetry={onRetry}
        correlationId={correlationId}
        showTechnicalDetail={showTechnicalDetail}
        className="mb-6"
      />

      {kpis ? <div className="mb-8">{kpis}</div> : null}
      {children}
    </AdminShell>
  );
}

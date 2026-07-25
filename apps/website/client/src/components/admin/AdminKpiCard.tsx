import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AdminKpiSource = "LIVE" | "DERIVED" | "PARTIAL" | "FOUNDATION" | "UNAVAILABLE";

export type AdminKpiState =
  | "available"
  | "loading"
  | "empty"
  | "unavailable"
  | "error"
  /** Last successful value kept visible while the current refresh fails. */
  | "stale"
  | "planned";

export type AdminKpiCardProps = {
  title: string;
  /** Primary metric. Prefer null over inventing zero when data is missing. */
  value?: string | null;
  secondary?: string;
  source: AdminKpiSource;
  lastUpdated?: string | null;
  state?: AdminKpiState;
  detail?: string;
  action?: ReactNode;
  /** @deprecated Prefer `state="unavailable"`. Kept for existing Admin modules. */
  unavailable?: boolean;
  className?: string;
};

const SOURCE_STYLES: Record<AdminKpiSource, string> = {
  LIVE: "bg-emerald-50 text-emerald-800",
  DERIVED: "bg-sky-50 text-sky-800",
  PARTIAL: "bg-amber-50 text-amber-950",
  FOUNDATION: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  UNAVAILABLE: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
};

const STATE_LABEL: Record<AdminKpiState, string> = {
  available: "Available",
  loading: "Loading",
  empty: "Empty",
  unavailable: "Unavailable",
  error: "Error",
  stale: "Stale",
  planned: "Planned",
};

function resolveDisplayValue(value: string | null | undefined, state: AdminKpiState): string {
  if (state === "loading") return "…";
  if (state === "unavailable" || state === "planned" || state === "error" || state === "empty") {
    return "—";
  }
  // "stale" keeps the last successful value visible, muted and badged.
  if (value == null || value === "") return "—";
  return value;
}

export function AdminKpiCard({
  title,
  value = null,
  secondary,
  source,
  lastUpdated = null,
  state,
  detail,
  action,
  unavailable = false,
  className,
}: AdminKpiCardProps) {
  const resolvedState: AdminKpiState = state ?? (unavailable ? "unavailable" : "available");
  const display = resolveDisplayValue(value, resolvedState);
  const showAsMuted = resolvedState !== "available";

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 shadow-[0_1px_2px_rgba(31,31,31,0.04)]",
        className,
      )}
      aria-busy={resolvedState === "loading" || undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--admin-muted)]">{title}</p>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              SOURCE_STYLES[source],
            )}
          >
            {source === "UNAVAILABLE" ? "Unavailable" : source.toLowerCase()}
          </span>
          {resolvedState !== "available" ? (
            <span className="rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              {STATE_LABEL[resolvedState]}
            </span>
          ) : null}
        </div>
      </div>

      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          showAsMuted ? "text-[var(--admin-muted)]" : "text-[var(--admin-ink)]",
        )}
      >
        {display}
      </p>

      {secondary ? <p className="mt-1 text-xs text-[var(--admin-muted)]">{secondary}</p> : null}

      <div className="mt-auto space-y-2 pt-3">
        {detail ? (
          <p className="text-xs text-[var(--admin-muted)]">
            {resolvedState === "unavailable" || resolvedState === "planned"
              ? (detail ?? "Not available yet")
              : detail}
          </p>
        ) : null}
        {lastUpdated ? (
          <p className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
            Updated {lastUpdated}
          </p>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </article>
  );
}

export function AdminKpiSkeleton() {
  return <div className="h-[8.5rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" aria-hidden />;
}

export function AdminSectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">{eyebrow}</p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight text-[var(--admin-ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

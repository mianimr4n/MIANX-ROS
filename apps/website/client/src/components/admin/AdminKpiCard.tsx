import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AdminKpiSource = "LIVE" | "DERIVED" | "PARTIAL" | "FOUNDATION" | "UNAVAILABLE" | "EMPTY";

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
  /**
   * When the collection is EMPTY after a successful payload, show the resolved
   * numeric value (including `"0"`) instead of an em dash. Never invents zeros
   * for error / unavailable / missing payloads.
   */
  showResolvedZero?: boolean;
  /** @deprecated Prefer `state="unavailable"`. Kept for existing Admin modules. */
  unavailable?: boolean;
  className?: string;
};

const SOURCE_STYLES: Record<AdminKpiSource, string> = {
  LIVE: "bg-emerald-50 text-emerald-800",
  DERIVED: "bg-sky-50 text-sky-800",
  PARTIAL: "bg-amber-50 text-amber-950",
  FOUNDATION: "border border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]",
  UNAVAILABLE: "border border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]",
  /** Successful empty collection — not LIVE traffic; page banner owns EMPTY. */
  EMPTY: "border border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]",
};

/**
 * Human labels for data provenance. LIVE is the expected default and renders
 * no badge; unfinished capabilities use a quiet Foundation label (not repeated
 * Phase 2 chips).
 */
const SOURCE_LABEL: Record<AdminKpiSource, string | null> = {
  LIVE: null,
  DERIVED: "Calculated",
  PARTIAL: "Partial data",
  FOUNDATION: "Foundation",
  UNAVAILABLE: null,
  /** No provenance badge — EMPTY is owned by OperationalStatusBanner + detail. */
  EMPTY: null,
};

const STATE_LABEL: Record<AdminKpiState, string> = {
  available: "Available",
  loading: "Loading",
  empty: "No data yet",
  unavailable: "Data unavailable",
  error: "Data unavailable",
  stale: "Earlier data",
  planned: "Foundation",
};

function resolveDisplayValue(
  value: string | null | undefined,
  state: AdminKpiState,
  showResolvedZero: boolean,
): string {
  if (state === "loading") return "…";
  // Successful empty payload with a resolved numeric count (including "0").
  if (state === "empty" && showResolvedZero && value != null && value !== "") {
    return value;
  }
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
  showResolvedZero = false,
  unavailable = false,
  className,
}: AdminKpiCardProps) {
  const resolvedState: AdminKpiState = state ?? (unavailable ? "unavailable" : "available");
  const display = resolveDisplayValue(value, resolvedState, showResolvedZero);
  const resolvedZeroEmpty = resolvedState === "empty" && showResolvedZero;
  const showAsMuted = resolvedState !== "available" && !resolvedZeroEmpty;

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
          {SOURCE_LABEL[source] ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                SOURCE_STYLES[source],
              )}
            >
              {SOURCE_LABEL[source]}
            </span>
          ) : null}
          {/* Resolved-zero EMPTY uses detail copy, not the generic "No data yet" badge. */}
          {resolvedState !== "available" &&
          !resolvedZeroEmpty &&
          STATE_LABEL[resolvedState] !== SOURCE_LABEL[source] ? (
            <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--admin-ink)]">
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
  return (
    <div
      className="h-[8.5rem] animate-pulse rounded-2xl bg-[var(--admin-soft)] motion-reduce:animate-none"
      aria-hidden
    />
  );
}

export function AdminSectionTitle({
  eyebrow,
  title,
  description,
  action,
  headingId,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional id for aria-labelledby on the wrapping section (single h2 only). */
  headingId?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3" data-admin-section-title>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-[var(--admin-ink)]">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

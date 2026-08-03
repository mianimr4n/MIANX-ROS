import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type OwnerDashboardCardState =
  | "loading"
  | "loaded"
  | "zero"
  | "empty"
  | "filtered-empty"
  | "partial"
  | "insufficient"
  | "stale"
  | "unavailable"
  | "restricted"
  | "error";

const STATE_LABEL: Partial<Record<OwnerDashboardCardState, string>> = {
  loading: "Loading",
  partial: "Partial data",
  insufficient: "Insufficient coverage",
  stale: "Earlier data",
  unavailable: "Unavailable",
  restricted: "Restricted",
  error: "Source failure",
};

/**
 * Compact provenance / honesty metadata. Prefer one line; put long formulas
 * in {@link OwnerDashboardDetails}.
 */
export function OwnerDashboardProvenance({
  items,
  className,
}: {
  items: Array<{ label: string; value: string }>;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <dl
      className={cn(
        "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--admin-muted)]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={`${item.label}:${item.value}`} className="min-w-0">
          <dt className="inline font-medium text-[var(--admin-ink)]">{item.label}: </dt>
          <dd className="inline">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Progressive disclosure for formulas, rules, and long limitations. */
export function OwnerDashboardDetails({
  summary = "Details",
  children,
  defaultOpen = false,
}: {
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="mt-2 group" open={defaultOpen || undefined}>
      <summary className="cursor-pointer text-xs font-semibold text-[var(--admin-ink)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]">
        {summary}
      </summary>
      <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">{children}</div>
    </details>
  );
}

export function OwnerDashboardStateBadge({
  state,
}: {
  state: OwnerDashboardCardState;
}) {
  const label = STATE_LABEL[state];
  if (!label) return null;
  const tone =
    state === "error" || state === "unavailable"
      ? "border-red-200 bg-red-50 text-red-900"
      : state === "partial" || state === "stale" || state === "insufficient"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}

/**
 * Shared Owner dashboard card shell — consistent header, count, and action slot.
 * Does not invent source quality; callers supply honest state.
 */
export function OwnerDashboardCard({
  title,
  description,
  count,
  state = "loaded",
  severityLabel,
  children,
  action,
  className,
  testId,
  dataAttrs,
}: {
  title: string;
  description?: string;
  count?: number | string | null;
  state?: OwnerDashboardCardState;
  /** Text severity / priority (never color-only). */
  severityLabel?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  testId?: string;
  /** Extra data-* attributes for regression selectors. */
  dataAttrs?: Record<string, string | undefined>;
}) {
  return (
    <article
      className={cn(
        "flex h-full min-w-0 flex-col rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3 shadow-[0_1px_2px_rgba(31,31,31,0.04)]",
        className,
      )}
      data-owner-card-state={state}
      data-testid={testId}
      aria-busy={state === "loading" || undefined}
      {...dataAttrs}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {severityLabel ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink)]">
              {severityLabel}
            </p>
          ) : null}
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
            <OwnerDashboardStateBadge state={state} />
          </div>
          {description ? (
            <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>
          ) : null}
        </div>
        {count != null && count !== "" ? (
          <p
            className="rounded-lg bg-[var(--admin-soft)] px-2.5 py-1 text-lg font-semibold tabular-nums text-[var(--admin-ink)]"
            aria-label={`Count ${count}`}
          >
            {count}
          </p>
        ) : null}
      </div>
      {children}
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}

export function OwnerDashboardZone({
  id,
  title,
  purpose,
  primary,
  children,
  defaultCollapsed = false,
}: {
  id: string;
  title: string;
  purpose: string;
  primary: boolean;
  children: ReactNode;
  /** Closing progressive disclosure for secondary zones. */
  defaultCollapsed?: boolean;
}) {
  if (defaultCollapsed) {
    return (
      <section
        className="mb-6 min-w-0 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)]/40 p-3 sm:p-4"
        aria-label={title}
        data-owner-zone={id}
        data-owner-zone-priority={primary ? "primary" : "secondary"}
        data-testid={`owner-zone-${id}`}
      >
        <details className="group">
          <summary className="cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]">
            <p className="text-lg font-semibold tracking-tight text-[var(--admin-ink)]">
              {title}
              <span className="ml-2 text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
                Expand
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">{purpose}</p>
          </summary>
          <div className="mt-4">{children}</div>
        </details>
      </section>
    );
  }

  return (
    <section
      className={cn("mb-8 min-w-0", !primary && "opacity-95")}
      aria-label={title}
      data-owner-zone={id}
      data-owner-zone-priority={primary ? "primary" : "secondary"}
      data-testid={`owner-zone-${id}`}
    >
      <header className="mb-4 border-b border-[var(--admin-border)] pb-2">
        <p className="text-lg font-semibold tracking-tight text-[var(--admin-ink)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">{purpose}</p>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

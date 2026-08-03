import type { ReactNode } from "react";

import {
  ADMIN_DATA_STATE_COPY,
  type AdminDataStateKind,
} from "@/lib/admin-presentation-contract";
import { cn } from "@/lib/utils";

const TONE: Record<AdminDataStateKind, string> = {
  LOADING: "border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]",
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-950",
  EMPTY: "border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-ink)]",
  FILTERED_EMPTY: "border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-ink)]",
  NO_ACTIVITY_YET: "border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-ink)]",
  CONFIGURATION_REQUIRED: "border-amber-200 bg-amber-50 text-amber-950",
  PARTIAL: "border-sky-200 bg-sky-50 text-sky-950",
  INSUFFICIENT_DATA: "border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]",
  STALE: "border-amber-200 bg-amber-50 text-amber-950",
  UNAVAILABLE: "border-amber-200 bg-amber-50 text-amber-950",
  PERMISSION_RESTRICTED: "border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-ink)]",
  ERROR: "border-red-200 bg-red-50 text-red-900",
};

/**
 * Shared Admin data-state panel — presentation only.
 * Does not invent metrics or issue requests.
 */
export function AdminDataState({
  state,
  title,
  description,
  action,
  children,
  className,
  testId,
  compact = false,
}: {
  state: AdminDataStateKind;
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  testId?: string;
  /** Avoid giant empty panels — content-sized padding. */
  compact?: boolean;
}) {
  const copy = ADMIN_DATA_STATE_COPY[state];
  const heading = title ?? copy.heading;
  const body = description ?? copy.explanation;
  const role = state === "ERROR" || state === "UNAVAILABLE" ? "alert" : "status";

  return (
    <div
      role={role}
      data-admin-data-state={state}
      data-testid={testId ?? `admin-data-state-${state.toLowerCase()}`}
      className={cn(
        "rounded-2xl border",
        compact ? "px-4 py-3" : "px-4 py-4 md:px-5",
        TONE[state],
        className,
      )}
    >
      <p className="text-sm font-semibold">{heading}</p>
      <p className="mt-1 text-sm opacity-90">{body}</p>
      {children ? <div className="mt-2 text-sm opacity-90">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function AdminEmptyState(props: Omit<Parameters<typeof AdminDataState>[0], "state">) {
  return <AdminDataState {...props} state="EMPTY" />;
}

export function AdminErrorState(props: Omit<Parameters<typeof AdminDataState>[0], "state">) {
  return <AdminDataState {...props} state="ERROR" />;
}

export function AdminPartialState(props: Omit<Parameters<typeof AdminDataState>[0], "state">) {
  return <AdminDataState {...props} state="PARTIAL" />;
}

export function AdminCapabilityNotice({
  summary,
  items,
  testId = "admin-capability-notice",
}: {
  summary: string;
  items: string[];
  testId?: string;
}) {
  if (items.length === 0) return null;
  return (
    <details
      className="mb-5 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3"
      data-testid={testId}
    >
      <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]">
        {summary}
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--admin-muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

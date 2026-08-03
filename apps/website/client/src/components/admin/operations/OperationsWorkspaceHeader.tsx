import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type OperationsMaturity = "LIVE" | "PARTIAL_LIVE" | "FOUNDATION";

const MATURITY_LABEL: Record<OperationsMaturity, string> = {
  LIVE: "Live",
  PARTIAL_LIVE: "Partial live",
  FOUNDATION: "Foundation",
};

/**
 * Shared operations workspace header — presentation only.
 * Does not change authorization or mutation contracts.
 */
export function OperationsWorkspaceHeader({
  eyebrow,
  title,
  description,
  branchLabel,
  roleLabel,
  maturity,
  primaryTask,
  liveLabel,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  branchLabel: string;
  roleLabel?: string;
  maturity: OperationsMaturity;
  /** One clear primary operational task for the page. */
  primaryTask: string;
  liveLabel?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("mb-5 flex flex-wrap items-start justify-between gap-4", className)}
      data-testid="operations-workspace-header"
      data-ops-maturity={maturity}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
          {eyebrow}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-ink)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>
        <p className="mt-2 text-sm text-[var(--admin-ink)]">
          <span className="font-medium">Active branch:</span> {branchLabel}
          {roleLabel ? (
            <>
              <span className="mx-1 text-[var(--admin-muted)]">·</span>
              {roleLabel}
            </>
          ) : null}
          <span className="mx-1 text-[var(--admin-muted)]">·</span>
          <span className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-soft)] px-2 py-0.5 text-xs font-semibold">
            {MATURITY_LABEL[maturity]}
          </span>
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--admin-ink)]" data-testid="operations-primary-task">
          Primary task: {primaryTask}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {liveLabel ? (
          <span
            className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-ink)]"
            role="status"
            aria-live="polite"
          >
            {liveLabel}
          </span>
        ) : null}
        {actions}
      </div>
    </header>
  );
}

/** Single deferred-capability disclosure — avoids repeating Phase 2 chips. */
export function OperationsDeferredNote({
  summary,
  items,
  testId = "operations-deferred-note",
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

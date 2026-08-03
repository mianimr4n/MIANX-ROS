import type { ReactNode } from "react";

import { AdminCapabilityNotice } from "@/components/admin/AdminDataState";
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

/** Single deferred-capability disclosure — shared with AdminCapabilityNotice. */
export function OperationsDeferredNote({
  summary,
  items,
  testId = "operations-deferred-note",
}: {
  summary: string;
  items: string[];
  testId?: string;
}) {
  return <AdminCapabilityNotice summary={summary} items={items} testId={testId} />;
}

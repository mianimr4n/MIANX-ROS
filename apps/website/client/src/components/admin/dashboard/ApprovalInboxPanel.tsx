import { useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  buildApprovalDrillDownAriaLabel,
  emphasizeApprovalsForMode,
  filterApprovalItems,
  type ApprovalInboxResult,
  type ApprovalPriority,
  type OwnerApprovalSummary,
} from "@/lib/approval-inbox";
import type { CommandModeId } from "@/lib/command-modes";

const PRIORITY_STYLES: Record<ApprovalPriority, string> = {
  URGENT: "border-red-300 bg-red-50",
  HIGH: "border-amber-300 bg-amber-50",
  NORMAL: "border-[var(--admin-border)] bg-[var(--admin-panel)]",
};

function ApprovalCard({ item }: { item: OwnerApprovalSummary }) {
  const aria = buildApprovalDrillDownAriaLabel(item);
  return (
    <li className="min-w-0">
      <article
        className={`rounded-2xl border px-4 py-3 ${PRIORITY_STYLES[item.priority]}`}
        data-approval-type={item.approvalType}
        data-approval-priority={item.priority}
        data-testid={`approval-card-${item.approvalType}`}
        data-kpi-maturity="DRILL_DOWN"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink)]">
              <span className="sr-only">Priority: </span>
              {item.priority}
              <span className="mx-1 text-[var(--admin-muted)]">·</span>
              <span className="sr-only">Status: </span>
              {item.status}
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--admin-ink)]">{item.title}</h3>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">{item.summary}</p>
          </div>
          <p
            className="rounded-lg bg-white/70 px-2.5 py-1 text-lg font-semibold tabular-nums text-[var(--admin-ink)]"
            aria-label={`Count ${item.count}`}
          >
            {item.count}
          </p>
        </div>
        <dl className="mt-3 grid gap-1 text-xs text-[var(--admin-muted)] sm:grid-cols-2">
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Domain: </dt>
            <dd className="inline">{item.domain}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Branch: </dt>
            <dd className="inline">{item.branchName}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Source: </dt>
            <dd className="inline">{item.source}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Trust: </dt>
            <dd className="inline">{item.trustState}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="inline font-medium text-[var(--admin-ink)]">Priority reason: </dt>
            <dd className="inline">{item.priorityReason}</dd>
          </div>
        </dl>
        {item.limitation ? (
          <p className="mt-2 text-xs text-[var(--admin-muted)]">{item.limitation}</p>
        ) : null}
        <div className="mt-3">
          <Link
            href={item.destinationHref}
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            aria-label={aria}
            data-testid={`approval-drilldown-${item.approvalType}`}
          >
            {item.destinationLabel}
          </Link>
        </div>
      </article>
    </li>
  );
}

export function ApprovalInboxPanel({
  result,
  loading,
  commandMode,
  onRetry,
}: {
  result: ApprovalInboxResult;
  loading: boolean;
  commandMode: CommandModeId;
  onRetry?: () => void;
}) {
  const [domainFilter, setDomainFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const visible = useMemo(() => {
    const filtered = filterApprovalItems(result.items, {
      domain: domainFilter,
      priority: priorityFilter,
    });
    return emphasizeApprovalsForMode(filtered, commandMode);
  }, [result.items, domainFilter, priorityFilter, commandMode]);

  const filtersActive = Boolean(domainFilter || priorityFilter);
  const filteredZero = filtersActive && visible.length === 0 && result.items.length > 0;

  return (
    <section
      className="mb-8 min-w-0"
      aria-labelledby="approval-inbox-heading"
      data-testid="approval-inbox"
      data-command-mode={commandMode}
    >
      <AdminSectionTitle
        headingId="approval-inbox-heading"
        eyebrow="Approvals"
        title="Approval Inbox"
        description="Read-only queue of supported pending approvals. Drill down to existing modules — no inline approve/reject."
      />

      <p className="mb-3 text-sm text-[var(--admin-muted)]" data-testid="approval-inbox-counts">
        Supported pending: {result.totalPendingCount}
        {result.urgentCount > 0 ? ` · Urgent: ${result.urgentCount}` : ""}
        . Inline approve/reject is not available in this foundation slice.
      </p>

      <div
        className="mb-4 flex flex-wrap gap-3"
        role="group"
        aria-label="Approval Inbox filters"
        data-testid="approval-inbox-filters"
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Domain</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            aria-label="Filter approvals by domain"
          >
            <option value="">All domains</option>
            <option value="purchasing">Purchasing</option>
            <option value="finance">Finance</option>
            <option value="hr">HR</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--admin-muted)]">Priority</span>
          <select
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter approvals by priority"
          >
            <option value="">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>
        </label>
        {filtersActive ? (
          <div className="flex items-end">
            <button
              type="button"
              className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-medium"
              onClick={() => {
                setDomainFilter("");
                setPriorityFilter("");
              }}
              aria-label="Clear approval filters"
              data-testid="approval-inbox-clear-filters"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {filtersActive ? (
        <p className="mb-3 text-sm text-[var(--admin-muted)]" role="status" data-testid="approval-inbox-active-filters">
          Active filters:
          {domainFilter ? ` domain=${domainFilter}` : ""}
          {priorityFilter ? ` priority=${priorityFilter}` : ""}
        </p>
      ) : null}

      {loading && result.items.length === 0 && !result.partialFailure && !result.totalFailure ? (
        <p className="text-sm text-[var(--admin-muted)]" role="status">
          Loading supported approvals…
        </p>
      ) : null}

      {result.totalFailure ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900"
          role="status"
          data-testid="approval-inbox-total-failure"
        >
          <p className="font-semibold">Approval sources unavailable</p>
          <p className="mt-1">
            Required approval sources could not be loaded. This is not an all-clear — counts are not shown as zero.
          </p>
          <p className="mt-1 text-xs">Unavailable: {result.unavailableSources.join(", ")}</p>
          {onRetry ? (
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-red-300 bg-white px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
              onClick={onRetry}
            >
              Retry sources
            </button>
          ) : null}
        </div>
      ) : null}

      {result.partialFailure ? (
        <div
          className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
          data-testid="approval-inbox-partial-failure"
        >
          <p className="font-semibold">Partial approval data</p>
          <p className="mt-1">
            Some approval sources failed. Showing available queues only — not a complete all-clear.
          </p>
          <p className="mt-1 text-xs">Unavailable: {result.unavailableSources.join(", ")}</p>
        </div>
      ) : null}

      {!result.totalFailure && filteredZero ? (
        <p className="text-sm text-[var(--admin-muted)]" role="status" data-testid="approval-inbox-filtered-zero">
          No approvals match the current filters.
        </p>
      ) : null}

      {!result.totalFailure && result.allClearSupported && !filtersActive ? (
        <p className="text-sm text-[var(--admin-muted)]" role="status" data-testid="approval-inbox-empty">
          No supported pending approvals were detected.
        </p>
      ) : null}

      {!result.totalFailure && visible.length > 0 ? (
        <ul className="grid min-w-0 gap-3" role="list">
          {visible.map((item) => (
            <ApprovalCard key={item.id} item={item} />
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-[var(--admin-muted)]">{result.deferredDomainsNote}</p>
    </section>
  );
}

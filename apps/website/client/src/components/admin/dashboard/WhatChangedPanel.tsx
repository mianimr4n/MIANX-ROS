import { useId, useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { CommandModeId } from "@/lib/command-modes";
import {
  formatChangeSentence,
  type OperationalTimeline,
  type WhatChangedDomain,
  type WhatChangedSeverity,
  type WhatChangedSummary,
} from "@/lib/what-changed";

const DOMAIN_FILTERS: Array<{ id: WhatChangedDomain | "all"; label: string }> = [
  { id: "all", label: "All domains" },
  { id: "orders", label: "Orders" },
  { id: "kitchen", label: "Kitchen" },
  { id: "delivery", label: "Delivery" },
  { id: "inventory", label: "Inventory" },
  { id: "purchasing", label: "Purchasing" },
];

const SEVERITY_FILTERS: Array<{ id: WhatChangedSeverity | "all"; label: string }> = [
  { id: "all", label: "All severities" },
  { id: "CRITICAL", label: "Critical" },
  { id: "WARNING", label: "Warning" },
  { id: "INFORMATION", label: "Information" },
];

export function WhatChangedPanel({
  summary,
  timeline,
  loading,
  commandMode,
  onRefresh,
  onMarkReviewed,
  onResetBaseline,
  domainFilter,
  severityFilter,
  onDomainFilter,
  onSeverityFilter,
}: {
  summary: WhatChangedSummary;
  timeline: OperationalTimeline;
  loading: boolean;
  commandMode: CommandModeId;
  onRefresh?: () => void;
  onMarkReviewed?: () => void;
  onResetBaseline?: () => void;
  domainFilter: WhatChangedDomain | "all";
  severityFilter: WhatChangedSeverity | "all";
  onDomainFilter: (v: WhatChangedDomain | "all") => void;
  onSeverityFilter: (v: WhatChangedSeverity | "all") => void;
}) {
  const titleId = useId();
  const timelineId = useId();
  const [showLimitations, setShowLimitations] = useState(false);

  const filteredEvents = useMemo(() => {
    let list = timeline.events;
    if (domainFilter !== "all") list = list.filter((e) => e.domain === domainFilter);
    if (severityFilter !== "all") list = list.filter((e) => e.severity === severityFilter);
    return list;
  }, [timeline.events, domainFilter, severityFilter]);

  return (
    <section
      className="mb-8 what-changed-panel"
      aria-labelledby={titleId}
      data-mode-section="what-changed"
      data-testid="what-changed-panel"
      data-command-mode={commandMode}
      data-since-anchor={summary.sinceAnchorKind}
      data-coverage={summary.coverageState}
    >
      <AdminSectionTitle
        headingId={titleId}
        eyebrow={commandMode === "CLOSING" ? "Closing context" : "Review"}
        title="What Changed"
        description="Since your last review on this device (or selected business window). Never “since last login.” Not a complete audit log."
      />

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]" data-testid="what-changed-loading">
          Loading comparison sources…
        </p>
      ) : null}

      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--admin-ink)]" data-testid="what-changed-since">
          {summary.sinceLabel}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Branch {summary.branchName}
          <span className="mx-1">·</span>
          Business window {summary.businessWindow}
          <span className="mx-1">·</span>
          Coverage {summary.coverageState}
          <span className="mx-1">·</span>
          {summary.sourceCoveragePercent}% sources
          <span className="mx-1">·</span>
          {summary.confidence} confidence
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          {summary.comparisonStart
            ? `Compared ${new Date(summary.comparisonStart).toLocaleString()} → ${new Date(summary.comparisonEnd).toLocaleString()}`
            : `As of ${new Date(summary.comparisonEnd).toLocaleString()} — no comparable baseline yet`}
        </p>

        {summary.totalFailure ? (
          <p
            className="mt-3 text-sm font-semibold text-[var(--admin-ink)]"
            role="status"
            data-testid="what-changed-source-failure"
          >
            Required history sources failed — this is not “No changes.”
          </p>
        ) : null}

        {!summary.totalFailure && summary.hasBaseline && summary.changes.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--admin-ink)]" role="status" data-testid="what-changed-no-deltas">
            No material metric deltas versus the last review baseline on this device.
            Timeline below may still show recent activity.
          </p>
        ) : null}

        {!summary.hasBaseline && !summary.totalFailure ? (
          <p className="mt-3 text-sm text-[var(--admin-ink)]" role="status" data-testid="what-changed-no-baseline">
            Mark this view as reviewed on this device to enable derived comparisons next time.
            Cross-device history is not available.
          </p>
        ) : null}

        {summary.changes.length > 0 ? (
          <ul className="mt-3 space-y-2" data-testid="what-changed-deltas">
            {summary.changes.slice(0, 8).map((change) => (
              <li
                key={change.metricId}
                className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-3"
              >
                <p className="text-sm font-semibold text-[var(--admin-ink)]">
                  {formatChangeSentence(change)}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Tone {change.tone}
                  <span className="mx-1">·</span>
                  Trust {change.trustState}
                  <span className="mx-1">·</span>
                  {change.persistenceState}
                  {change.percentChange != null ? (
                    <>
                      <span className="mx-1">·</span>
                      {change.percentChange}% relative
                    </>
                  ) : null}
                </p>
                <Link
                  href={change.drillDown.href}
                  className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
                  aria-label={change.drillDown.label}
                  data-testid={`what-changed-drill-${change.metricId}`}
                  data-kpi-maturity="DRILL_DOWN"
                >
                  {change.drillDown.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={onMarkReviewed}
            data-testid="what-changed-mark-reviewed"
            aria-label="Mark Command Center as reviewed on this device"
          >
            Mark reviewed on this device
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={onResetBaseline}
            data-testid="what-changed-reset-baseline"
            aria-label="Reset browser-local review baseline"
          >
            Reset review baseline
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={onRefresh}
            data-testid="what-changed-refresh"
            aria-label="Refresh What Changed preview"
          >
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-[var(--admin-border)] bg-transparent px-3 text-sm font-semibold text-[var(--admin-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={() => setShowLimitations((v) => !v)}
            aria-expanded={showLimitations}
            data-testid="what-changed-limitations-toggle"
          >
            {showLimitations ? "Hide limitations" : "Show limitations"}
          </button>
        </div>

        {showLimitations ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]" data-testid="what-changed-limitations">
            {summary.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {summary.unavailableDomains.map((d) => (
              <li key={d}>Unavailable / restricted: {d}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-6" data-mode-section="operational-timeline" data-testid="operational-timeline">
        <h3 id={timelineId} className="text-base font-semibold text-[var(--admin-ink)]">
          Operational timeline
        </h3>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Newest first. Derived from current admin lists — not a complete audit coverage claim.
        </p>

        <div className="mt-3 flex flex-wrap gap-3 print:hidden">
          <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--admin-ink)]">
            <span className="sr-only">Filter timeline by domain</span>
            <select
              className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-3"
              value={domainFilter}
              onChange={(e) => onDomainFilter(e.target.value as WhatChangedDomain | "all")}
              data-testid="timeline-domain-filter"
              aria-label="Filter timeline by domain"
            >
              {DOMAIN_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--admin-ink)]">
            <span className="sr-only">Filter timeline by severity</span>
            <select
              className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-white px-3"
              value={severityFilter}
              onChange={(e) => onSeverityFilter(e.target.value as WhatChangedSeverity | "all")}
              data-testid="timeline-severity-filter"
              aria-label="Filter timeline by severity"
            >
              {SEVERITY_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {timeline.partialFailure || timeline.totalFailure ? (
          <p className="mt-3 text-sm text-[var(--admin-ink)]" role="status" data-testid="timeline-partial">
            {timeline.totalFailure
              ? timeline.emptyHonestMessage
              : `Partial timeline — unavailable: ${timeline.unavailableDomains.join(", ")}.`}
          </p>
        ) : null}

        {!timeline.totalFailure && filteredEvents.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--admin-muted)]" role="status" data-testid="timeline-empty">
            {timeline.emptyHonestMessage}
          </p>
        ) : null}

        {filteredEvents.length > 0 ? (
          <ol className="mt-4 space-y-3 border-l border-[var(--admin-border)] pl-4" aria-labelledby={timelineId}>
            {filteredEvents.map((item) => (
              <li key={item.id} className="relative text-sm" data-testid={`timeline-event-${item.domain}`}>
                <span
                  className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]"
                  aria-hidden
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  {item.domain}
                  <span className="mx-1">·</span>
                  <span className="sr-only">Severity: </span>
                  {item.severity}
                  <span className="mx-1">·</span>
                  {item.persistenceState}
                </p>
                <p className="font-semibold text-[var(--admin-ink)]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{item.summary}</p>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  {new Date(item.occurredAt).toLocaleString("en-PK", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                    timeZone: "Asia/Karachi",
                  })}
                  <span className="mx-1">·</span>
                  {item.actorDisplaySafe}
                  <span className="mx-1">·</span>
                  Trust {item.trustState}
                </p>
                <Link
                  href={item.drillDown.href}
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--admin-ink)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
                  aria-label={item.drillDown.label}
                  data-kpi-maturity="DRILL_DOWN"
                >
                  {item.drillDown.label}
                </Link>
              </li>
            ))}
          </ol>
        ) : null}

        {timeline.truncated ? (
          <p className="mt-3 text-xs text-[var(--admin-muted)]">
            Showing newest {timeline.boundedCount} of {timeline.totalCandidateCount} supported candidates.
          </p>
        ) : null}
      </div>
    </section>
  );
}

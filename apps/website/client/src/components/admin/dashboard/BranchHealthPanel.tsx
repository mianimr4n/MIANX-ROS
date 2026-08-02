import { useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  buildBranchHealthAriaLabel,
  buildComponentDrillDownAriaLabel,
  type BranchHealthComponent,
  type BranchHealthScore,
  type BranchHealthScoreState,
} from "@/lib/branch-health";
import type { CommandModeId } from "@/lib/command-modes";

const STATE_STYLES: Record<BranchHealthScoreState, string> = {
  HEALTHY: "border-emerald-300 bg-emerald-50",
  WATCH: "border-amber-300 bg-amber-50",
  AT_RISK: "border-orange-300 bg-orange-50",
  CRITICAL: "border-red-300 bg-red-50",
  INSUFFICIENT_DATA: "border-[var(--admin-border)] bg-[var(--admin-soft)]",
};

function ComponentRow({ item }: { item: BranchHealthComponent }) {
  const aria = buildComponentDrillDownAriaLabel({
    label: item.label,
    score: item.score,
    explanation: item.explanation,
  });
  return (
    <li className="min-w-0">
      <article
        className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-3"
        data-testid={`branch-health-component-${item.componentId}`}
        data-component-status={item.status}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--admin-ink)]">{item.label}</h3>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.explanation}</p>
          </div>
          <p
            className="rounded-lg bg-white/80 px-2.5 py-1 text-base font-semibold tabular-nums text-[var(--admin-ink)]"
            aria-label={
              item.score == null ? `${item.label} score unavailable` : `${item.label} score ${item.score} out of 100`
            }
          >
            {item.score == null ? "—" : item.score}
          </p>
        </div>
        <dl className="mt-2 grid gap-1 text-xs text-[var(--admin-muted)] sm:grid-cols-2">
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Weight: </dt>
            <dd className="inline">{item.weight}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Metric: </dt>
            <dd className="inline">{item.metricValue}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Source: </dt>
            <dd className="inline">{item.source}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-[var(--admin-ink)]">Freshness: </dt>
            <dd className="inline">{item.freshnessState}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="inline font-medium text-[var(--admin-ink)]">Rule: </dt>
            <dd className="inline">{item.rule}</dd>
          </div>
        </dl>
        {item.limitation ? (
          <p className="mt-2 text-xs text-[var(--admin-muted)]">{item.limitation}</p>
        ) : null}
        {item.status !== "PERMISSION_RESTRICTED" && item.status !== "UNAVAILABLE" ? (
          <div className="mt-3">
            <Link
              href={item.drillDown.href}
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
              aria-label={aria}
              data-testid={`branch-health-drilldown-${item.componentId}`}
              data-kpi-maturity="DRILL_DOWN"
            >
              {item.drillDown.label}
            </Link>
          </div>
        ) : null}
      </article>
    </li>
  );
}

export function BranchHealthPanel({
  result,
  loading,
  commandMode,
}: {
  result: BranchHealthScore;
  loading: boolean;
  commandMode: CommandModeId;
}) {
  const [expanded, setExpanded] = useState(true);
  const headline = useMemo(
    () =>
      buildBranchHealthAriaLabel({
        score: result.score,
        statusLabel: result.statusLabel,
        coveragePercent: result.coveragePercent,
        confidence: result.confidence,
      }),
    [result],
  );

  const pressureLine =
    result.topNegativeContributors.length > 0
      ? `Main pressure: ${result.topNegativeContributors.map((c) => c.explanation).join(" ")}`
      : "No negative contributors among evaluated components.";

  return (
    <section
      className="mb-8"
      aria-labelledby="branch-health-heading"
      data-mode-section="branch-health"
      data-testid="branch-health-panel"
      data-command-mode={commandMode}
      data-score-state={result.scoreState}
      data-coverage={result.coveragePercent}
    >
      <AdminSectionTitle
        headingId="branch-health-heading"
        eyebrow="Multi-branch control"
        title="Branch Health Score"
        description="Explainable, coverage-adjusted score from verified operational sources. Not a black box."
      />

      {loading && result.score == null && result.coveragePercent === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]" data-testid="branch-health-loading">
          Loading branch health sources…
        </p>
      ) : (
        <div
          className={`rounded-2xl border px-4 py-4 ${STATE_STYLES[result.scoreState]}`}
          role="group"
          aria-label={headline}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink)]">
                <span className="sr-only">Status: </span>
                {result.statusLabel}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--admin-ink)]" data-testid="branch-health-score">
                {result.score == null ? "—" : result.score}
                <span className="ml-1 text-base font-medium text-[var(--admin-muted)]">/ 100</span>
              </p>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                {result.branchName}
                <span className="mx-1">·</span>
                {result.confidence} confidence
                <span className="mx-1">·</span>
                {result.coveragePercent}% source coverage
              </p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Evaluated {new Date(result.evaluatedAt).toLocaleString()} · {result.businessWindow}
                <span className="mx-1">·</span>
                Freshness {result.freshnessState}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-[var(--admin-ink)]" data-testid="branch-health-pressure">
            {pressureLine}
          </p>

          <p className="mt-2 text-xs text-[var(--admin-muted)]" data-testid="branch-health-comparison-note">
            {result.comparisonNote}
          </p>

          <button
            type="button"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            aria-expanded={expanded}
            aria-controls="branch-health-breakdown"
            data-testid="branch-health-toggle-breakdown"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide component breakdown" : "Show component breakdown"}
          </button>

          {expanded ? (
            <div id="branch-health-breakdown" className="mt-4">
              <ul className="grid min-w-0 gap-3 lg:grid-cols-2">
                {result.components.map((c) => (
                  <ComponentRow key={c.componentId} item={c} />
                ))}
              </ul>
              {result.excludedComponents.length > 0 ? (
                <div className="mt-4" data-testid="branch-health-excluded">
                  <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Excluded / unavailable</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
                    {result.excludedComponents.map((ex) => (
                      <li key={`${ex.componentId}-${ex.reason}`}>
                        {ex.label}: {ex.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4" data-testid="branch-health-limitations">
                <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Limitations</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
                  {result.limitations.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

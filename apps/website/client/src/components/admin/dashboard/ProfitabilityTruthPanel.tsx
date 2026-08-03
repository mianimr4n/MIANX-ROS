import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { OwnerDashboardDetails } from "@/components/admin/dashboard/OwnerDashboardPresentation";
import {
  buildProfitMetricAriaLabel,
  type ProfitMetric,
  type ProfitabilitySnapshot,
} from "@/lib/profitability-truth";
import type { CommandModeId } from "@/lib/command-modes";

function MetricCard({ metric }: { metric: ProfitMetric }) {
  const aria = buildProfitMetricAriaLabel({
    label: metric.label,
    maturity: metric.maturity,
    value: metric.value,
  });
  const negative =
    metric.rawValue != null && metric.unit === "PKR" && metric.rawValue < 0;

  return (
    <li className="min-w-0">
      <article
        className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-3"
        data-testid={`profit-metric-${metric.id}`}
        data-maturity={metric.maturity}
        data-trust={metric.trustState}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          <span className="sr-only">Maturity: </span>
          {metric.maturity}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">{metric.label}</h3>
        <p
          className="mt-2 text-xl font-semibold tabular-nums text-[var(--admin-ink)]"
          aria-label={aria}
        >
          {metric.value ?? "—"}
          {negative ? <span className="sr-only"> (negative)</span> : null}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">{metric.businessWindow}</p>
        <OwnerDashboardDetails summary="Source, trust & formula">
          <p>
            Source: {metric.source}. Trust: {metric.trustState}.
          </p>
          <p>Formula: {metric.formula}</p>
          {metric.limitation ? <p>{metric.limitation}</p> : null}
        </OwnerDashboardDetails>
        {metric.value != null ? (
          <div className="mt-3">
            <Link
              href={metric.drillDown.href}
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
              aria-label={metric.drillDown.label}
              data-testid={`profit-drilldown-${metric.id}`}
              data-kpi-maturity="DRILL_DOWN"
            >
              {metric.drillDown.label}
            </Link>
          </div>
        ) : null}
      </article>
    </li>
  );
}

function LaneSection({
  title,
  state,
  coverage,
  confidence,
  children,
  testId,
}: {
  title: string;
  state: string;
  coverage: number;
  confidence: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-4"
      data-testid={testId}
      data-lane-state={state}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
        <p className="text-xs text-[var(--admin-muted)]">
          <span className="sr-only">Lane state: </span>
          {state}
          <span className="mx-1">·</span>
          {coverage}% coverage
          <span className="mx-1">·</span>
          {confidence} confidence
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ProfitabilityTruthPanel({
  result,
  loading,
  commandMode,
}: {
  result: ProfitabilitySnapshot;
  loading: boolean;
  commandMode: CommandModeId;
}) {
  const [showExcluded, setShowExcluded] = useState(false);
  const headline = useMemo(
    () =>
      `Profitability Truth for ${result.branchName}. Operational Estimate coverage ${result.sourceCoverage.operationalPercent} percent. Accounting Posted coverage ${result.sourceCoverage.accountingPercent} percent.`,
    [result],
  );

  return (
    <section
      className="mb-8"
      aria-labelledby="profitability-truth-heading"
      data-mode-section="profitability-truth"
      data-testid="profitability-truth-panel"
      data-command-mode={commandMode}
    >
      <AdminSectionTitle
        headingId="profitability-truth-heading"
        eyebrow="Business pulse"
        title="Operational Estimate vs Accounting Posted"
        description="Operational Estimate ≠ Accounting Posted. Estimates are never labeled as posted profit."
      />

      {loading && result.operational.state === "LOADING" && result.accounting.state === "LOADING" ? (
        <p className="text-sm text-[var(--admin-muted)]" data-testid="profitability-loading">
          Loading profitability sources…
        </p>
      ) : (
        <div className="space-y-4" role="group" aria-label={headline}>
          <OwnerDashboardDetails summary="Currency, evaluation time & freshness" defaultOpen={false}>
            <p>
              Currency {result.currency} · Evaluated {new Date(result.evaluatedAt).toLocaleString()} ·
              Freshness {result.freshnessState}
            </p>
          </OwnerDashboardDetails>

          <LaneSection
            title="A. Operational Estimate"
            state={result.operational.state}
            coverage={result.operational.coveragePercent}
            confidence={result.operational.confidence}
            testId="profit-operational-lane"
          >
            <p className="mb-3 text-xs text-[var(--admin-muted)]">{result.operational.businessWindow}</p>
            {result.operational.metrics.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">
                {result.operational.limitations[0] ?? "Operational estimate unavailable."}
              </p>
            ) : (
              <ul className="grid min-w-0 gap-3 lg:grid-cols-3">
                {result.operational.metrics.map((m) => (
                  <MetricCard key={m.id} metric={m} />
                ))}
              </ul>
            )}
          </LaneSection>

          <LaneSection
            title="B. Accounting Posted"
            state={result.accounting.state}
            coverage={result.accounting.coveragePercent}
            confidence={result.accounting.confidence}
            testId="profit-accounting-lane"
          >
            <p className="mb-1 text-xs text-[var(--admin-muted)]">
              Period: {result.accounting.accountingPeriod ?? "—"} · Status: {result.accounting.periodStatus}
              {result.accounting.postedThrough
                ? ` · Posted through ${result.accounting.postedThrough}`
                : ""}
            </p>
            {result.accounting.state === "EMPTY" ? (
              <p className="text-sm text-[var(--admin-muted)]" data-testid="profit-accounting-empty">
                No posted P&L activity yet — empty ledger is not a claim of zero daily profit.
              </p>
            ) : null}
            {result.accounting.state === "PERMISSION_RESTRICTED" ? (
              <p className="text-sm text-[var(--admin-muted)]" data-testid="profit-accounting-restricted">
                Accounting Posted is permission-restricted for this session.
              </p>
            ) : null}
            {result.accounting.metrics.filter((m) => m.value != null).length > 0 ? (
              <ul className="mt-3 grid min-w-0 gap-3 lg:grid-cols-3">
                {result.accounting.metrics
                  .filter((m) => m.maturity === "Accounting Posted")
                  .map((m) => (
                    <MetricCard key={m.id} metric={m} />
                  ))}
              </ul>
            ) : null}
            {result.accounting.metrics.some((m) => m.maturity === "Not Available") ? (
              <ul className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
                {result.accounting.metrics
                  .filter((m) => m.maturity === "Not Available")
                  .map((m) => (
                    <MetricCard key={m.id} metric={m} />
                  ))}
              </ul>
            ) : null}
          </LaneSection>

          <div
            className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-4"
            data-testid="profit-reconciliation"
            data-comparable={result.reconciliation.comparable ? "true" : "false"}
          >
            <h3 className="text-base font-semibold text-[var(--admin-ink)]">C. Reconciliation</h3>
            <p className="mt-2 text-sm text-[var(--admin-ink)]">{result.reconciliation.explanation}</p>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              Ops window: {result.reconciliation.operationalWindow}
              {result.reconciliation.accountingWindow
                ? ` · Accounting window: ${result.reconciliation.accountingWindow}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            aria-expanded={showExcluded}
            data-testid="profit-toggle-excluded"
            onClick={() => setShowExcluded((v) => !v)}
          >
            {showExcluded ? "Hide excluded metrics" : "Show excluded / deferred metrics"}
          </button>

          {showExcluded ? (
            <div data-testid="profit-excluded" className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Excluded / deferred</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
                {[...result.operational.excludedComponents, ...result.accounting.excludedComponents].map(
                  (ex) => (
                    <li key={ex.id}>
                      {ex.label}: {ex.reason}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : null}

          <div data-testid="profit-limitations">
            <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Limitations</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
              {result.limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

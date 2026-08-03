import { Link } from "wouter";

import {
  OwnerDashboardCard,
  OwnerDashboardDetails,
  OwnerDashboardProvenance,
} from "@/components/admin/dashboard/OwnerDashboardPresentation";
import type { ExceptionCenterResult } from "@/lib/exception-center/types";
import { formatExceptionAge } from "@/lib/exception-center/build-exceptions";
import type { ExceptionSeverity, OwnerException } from "@/lib/exception-center/types";

const SEVERITY_STYLES: Record<ExceptionSeverity, string> = {
  CRITICAL: "border-red-300 bg-red-50",
  WARNING: "border-amber-300 bg-amber-50",
  INFORMATION: "border-sky-300 bg-sky-50",
};

const SEVERITY_TEXT: Record<ExceptionSeverity, string> = {
  CRITICAL: "Critical",
  WARNING: "Warning",
  INFORMATION: "Information",
};

function ExceptionCard({ item, nowMs }: { item: OwnerException; nowMs: number }) {
  const age = formatExceptionAge(item.oldestAt, nowMs);
  const aria = [
    SEVERITY_TEXT[item.severity],
    item.title,
    item.summary,
    `Count ${item.count}`,
    `Trust ${item.trustState}`,
    `Freshness ${item.freshnessState}`,
    age ?? "",
    item.drillDown.label,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <li className="min-w-0">
      <OwnerDashboardCard
        title={item.title}
        description={item.summary}
        count={item.count}
        severityLabel={`Severity: ${SEVERITY_TEXT[item.severity]}`}
        className={SEVERITY_STYLES[item.severity]}
        testId={`exception-card-${item.type}`}
        dataAttrs={{ "data-exception-type": item.type }}
        action={
          <>
            <Link
              href={item.drillDown.href}
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
              aria-label={aria}
              data-testid={`exception-drilldown-${item.type}`}
            >
              {item.drillDown.label}
            </Link>
            {item.drillDown.limitation ? (
              <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.drillDown.limitation}</p>
            ) : null}
          </>
        }
      >
        <OwnerDashboardProvenance
          items={[
            { label: "Branch", value: item.branchName },
            ...(age ? [{ label: "Age", value: age }] : []),
          ]}
        />
        <OwnerDashboardDetails summary="Source & trust">
          <p>
            Source: {item.source}. Trust: {item.trustState}. Freshness: {item.freshnessState}.
          </p>
          {item.limitation ? <p>{item.limitation}</p> : null}
        </OwnerDashboardDetails>
      </OwnerDashboardCard>
    </li>
  );
}

export function ExceptionCenterPanel({
  result,
  loading,
  onRetry,
  nowMs = Date.now(),
}: {
  result: ExceptionCenterResult;
  loading: boolean;
  onRetry?: () => void;
  nowMs?: number;
}) {
  return (
    <section
      className="mb-6 min-w-0"
      aria-label="Exception Center"
      data-testid="exception-center"
      data-mode-section="exception-center"
    >
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--admin-ink)]">Needs Attention Now</h3>
        <p className="mt-0.5 text-sm text-[var(--admin-muted)]">
          Read-only Exception Center from verified live sources — not an all-clear for every restaurant risk.
        </p>
      </div>

      {loading && result.exceptions.length === 0 && !result.partialFailure && !result.totalFailure ? (
        <p className="text-sm text-[var(--admin-muted)]" role="status">
          Loading supported exceptions…
        </p>
      ) : null}

      {result.totalFailure ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900"
          role="status"
          data-testid="exception-center-total-failure"
        >
          <p className="font-semibold">Exception sources unavailable</p>
          <p className="mt-1">
            Required sources could not be loaded. This is not an all-clear — counts are not shown as zero.
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
          data-testid="exception-center-partial-failure"
        >
          <p className="font-semibold">Partial data</p>
          <p className="mt-1">
            Some exception sources failed. Showing cards from available sources only — not a complete all-clear.
          </p>
          <p className="mt-1 text-xs">Unavailable: {result.unavailableSources.join(", ")}</p>
          {onRetry ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
              onClick={onRetry}
            >
              Retry sources
            </button>
          ) : null}
        </div>
      ) : null}

      {!result.totalFailure && result.allClear ? (
        <p
          className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]"
          role="status"
          data-testid="exception-center-empty"
        >
          No supported exceptions are currently detected for this branch scope. This does not mean every
          restaurant risk is covered — only the verified Exception Center sources for this slice.
        </p>
      ) : null}

      {!result.totalFailure && result.exceptions.length > 0 ? (
        <ul className="grid min-w-0 gap-3 lg:grid-cols-2" role="list">
          {result.exceptions.map((item) => (
            <ExceptionCard key={item.id} item={item} nowMs={nowMs} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

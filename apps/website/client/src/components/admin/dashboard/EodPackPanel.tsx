import { useId, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  downloadEodPackCsv,
  downloadEodPackJson,
  type EodPack,
  type EodUnresolvedItem,
} from "@/lib/eod-pack";
import type { CommandModeId } from "@/lib/command-modes";

function UnresolvedRow({ item }: { item: EodUnresolvedItem }) {
  return (
    <li className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-ink)]">
        <span className="sr-only">Severity: </span>
        {item.severity}
        <span className="mx-1 text-[var(--admin-muted)]">·</span>
        {item.domain}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--admin-ink)]">
        {item.type} <span className="tabular-nums">({item.count})</span>
      </p>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">Source: {item.source}</p>
      <Link
        href={item.drillDown.href}
        className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
        aria-label={item.drillDown.label}
        data-testid={`eod-unresolved-${item.type}`}
        data-kpi-maturity="DRILL_DOWN"
      >
        {item.drillDown.label}
      </Link>
    </li>
  );
}

export function EodPackPanel({
  result,
  loading,
  commandMode,
  onRefresh,
}: {
  result: EodPack;
  loading: boolean;
  commandMode: CommandModeId;
  onRefresh?: () => void;
}) {
  const titleId = useId();
  const [showSections, setShowSections] = useState(commandMode === "CLOSING");

  return (
    <section
      className="mb-8 eod-pack-panel"
      aria-labelledby={titleId}
      data-mode-section="eod-pack"
      data-testid="eod-pack-panel"
      data-command-mode={commandMode}
      data-pack-state={result.state}
      data-coverage={result.sourceCoveragePercent}
    >
      <AdminSectionTitle
        headingId={titleId}
        eyebrow={commandMode === "CLOSING" ? "Closing control" : "Preview"}
        title="EOD Pack preview"
        description="Reviewable end-of-day snapshot from verified sources. Not a closed day, final pack, or accounting close."
      />

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)] print:hidden" data-testid="eod-pack-loading">
          Loading EOD sources…
        </p>
      ) : null}

      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--admin-ink)]" data-testid="eod-pack-headline">
          {result.previewLabel} · {result.branchName} · {result.businessDate}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          <span className="sr-only">Pack state: </span>
          State {result.state}
          <span className="mx-1">·</span>
          {result.sourceCoveragePercent}% source coverage
          <span className="mx-1">·</span>
          {result.confidence} confidence
          <span className="mx-1">·</span>
          Freshness {result.freshnessState}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Generated {new Date(result.generatedAt).toLocaleString()} · Timezone {result.timezone}
        </p>
        <p className="mt-2 text-sm text-[var(--admin-ink)]">
          Operational data may still change. Accounting figures are not finalized unless explicitly marked posted.
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]" data-testid="eod-pack-nonfinal">
          REVIEWABLE does not mean day closed, accounting complete, or all operations resolved.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={() => onRefresh?.()}
            data-testid="eod-pack-refresh"
            aria-label="Refresh EOD Pack preview"
          >
            Refresh preview
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={() => window.print()}
            data-testid="eod-pack-print"
            aria-label="Print EOD Pack preview"
          >
            Print preview
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={() => downloadEodPackCsv(result)}
            data-testid="eod-pack-download-csv"
            aria-label="Download EOD Pack CSV"
          >
            Download CSV
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            onClick={() => downloadEodPackJson(result)}
            data-testid="eod-pack-download-json"
            aria-label="Download EOD Pack JSON"
          >
            Download JSON
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            aria-expanded={showSections}
            onClick={() => setShowSections((v) => !v)}
            data-testid="eod-pack-toggle-sections"
          >
            {showSections ? "Hide sections" : "Show sections"}
          </button>
        </div>

        <div className="mt-4" data-testid="eod-unresolved-list">
          <h3 className="text-sm font-semibold text-[var(--admin-ink)]">
            Unresolved items ({result.unresolvedItems.length})
          </h3>
          {result.unresolvedItems.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              No unresolved items from loaded verified sources — this is not an all-clear for deferred closing domains.
            </p>
          ) : (
            <ul className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
              {result.unresolvedItems.map((item) => (
                <UnresolvedRow key={`${item.type}-${item.domain}`} item={item} />
              ))}
            </ul>
          )}
        </div>

        {showSections ? (
          <div className="mt-6 space-y-4" data-testid="eod-pack-sections">
            {result.sections.map((section) => (
              <article
                key={section.sectionId}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-3"
                data-testid={`eod-section-${section.sectionId}`}
                data-section-coverage={section.coverage}
              >
                <h3 className="text-sm font-semibold text-[var(--admin-ink)]">{section.title}</h3>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Coverage {section.coverage} · Trust {section.trustState} · Freshness {section.freshnessState}
                </p>
                {section.metrics.length > 0 ? (
                  <table className="mt-3 w-full min-w-0 text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--admin-border)] text-xs text-[var(--admin-muted)]">
                        <th scope="col" className="py-1 pr-2 font-medium">
                          Metric
                        </th>
                        <th scope="col" className="py-1 pr-2 font-medium">
                          Value
                        </th>
                        <th scope="col" className="py-1 font-medium">
                          Maturity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.metrics.map((m) => (
                        <tr key={m.metricId} className="border-b border-[var(--admin-border)]/60">
                          <td className="py-2 pr-2 text-[var(--admin-ink)]">{m.label}</td>
                          <td className="py-2 pr-2 tabular-nums text-[var(--admin-ink)]">{m.value ?? "—"}</td>
                          <td className="py-2 text-xs text-[var(--admin-muted)]">{m.maturity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-2 text-xs text-[var(--admin-muted)]">
                    {section.limitations[0] ?? "No metrics for this section."}
                  </p>
                )}
                {section.drillDowns.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                    {section.drillDowns.map((d) => (
                      <Link
                        key={d.href + d.label}
                        href={d.href}
                        className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
                        aria-label={d.label}
                      >
                        {d.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-4" data-testid="eod-pack-limitations">
          <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Limitations</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
            {result.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h4 className="mt-3 text-xs font-semibold text-[var(--admin-ink)]">Excluded / deferred domains</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[var(--admin-muted)]">
            {result.excludedDomains.slice(0, 8).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

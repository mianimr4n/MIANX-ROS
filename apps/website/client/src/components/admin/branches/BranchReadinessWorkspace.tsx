import { useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { BranchReadiness, ConfigurationHistory, EffectiveConfiguration } from "@/lib/admin-api";

const STATE_LABELS = {
  READY: "Ready", READY_WITH_WARNINGS: "Ready with warnings", BLOCKED: "Blocked", NOT_CONFIGURED: "Not configured",
} as const;

function StateBadge({ state }: { state: BranchReadiness["readinessState"] }) {
  const tone = state === "READY" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : state === "BLOCKED" ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{STATE_LABELS[state]}</span>;
}

export function BranchReadinessWorkspace({
  reports, selectedId, onSelect, effective, history, detailLoading, onRetry,
}: {
  reports: BranchReadiness[]; selectedId: string | null; onSelect: (id: string) => void;
  effective: EffectiveConfiguration | null; history: ConfigurationHistory | null;
  detailLoading: boolean; onRetry: () => void;
}) {
  const [tab, setTab] = useState<"readiness" | "configuration" | "history">("readiness");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("ALL");
  const selected = reports.find((item) => item.branchId === selectedId) ?? reports[0] ?? null;
  const totals = useMemo(() => ({
    ready: reports.filter((item) => item.readinessState === "READY").length,
    warnings: reports.filter((item) => item.readinessState === "READY_WITH_WARNINGS").length,
    blocked: reports.filter((item) => item.readinessState === "BLOCKED").length,
    unconfigured: reports.filter((item) => item.readinessState === "NOT_CONFIGURED").length,
  }), [reports]);
  const values = (effective?.values ?? []).filter((item) => {
    const text = `${item.key} ${item.label} ${item.category}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (source === "ALL" || item.source === source);
  });

  return <div className="space-y-6">
    <section aria-labelledby="branch-readiness-overview">
      <h2 id="branch-readiness-overview" className="text-xl font-semibold text-[var(--admin-ink)]">Branch readiness overview</h2>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">Scores are derived from the live checks shown below. Unknown checks never count as passing.</p>
      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[['Branches', reports.length], ['Ready', totals.ready], ['Warnings', totals.warnings], ['Blocked', totals.blocked], ['Not configured', totals.unconfigured]].map(([label, value]) =>
          <div key={String(label)} className="rounded-xl border border-[var(--admin-border)] bg-white p-4">
            <p className="text-xs font-medium text-[var(--admin-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>)}
      </div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.7fr)]">
      <section aria-label="Branches" className="space-y-3">
        {reports.map((report) => <button key={report.branchId} type="button" onClick={() => onSelect(report.branchId)}
          aria-pressed={selected?.branchId === report.branchId}
          className={`w-full rounded-xl border bg-white p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] ${selected?.branchId === report.branchId ? 'border-[var(--brand-red)]' : 'border-[var(--admin-border)]'}`}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[var(--admin-ink)]">{report.branchName}</h3>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Evaluated {new Date(report.lastEvaluatedAt).toLocaleString()}</p></div><StateBadge state={report.readinessState} /></div>
          <div className="mt-4 flex items-end justify-between gap-3"><p className="text-sm"><span className="text-2xl font-semibold">{report.readinessScore}%</span><span className="sr-only"> readiness score</span></p>
            <p className="text-xs text-[var(--admin-muted)]">{report.blockingChecks} blockers · {report.warningChecks} warnings</p></div>
        </button>)}
      </section>

      {selected ? <AdminSurface>
        <AdminSurfaceHeader title={selected.branchName} description={`${STATE_LABELS[selected.readinessState]} · ${selected.passedChecks} of ${selected.totalChecks} checks passing`} />
        <AdminSurfaceBody>
          <div className="flex flex-wrap gap-2 border-b border-[var(--admin-border)] pb-4" role="tablist" aria-label="Branch control plane">
            {([['readiness','Readiness'],['configuration','Effective configuration'],['history','Audit history']] as const).map(([id,label]) =>
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)] ${tab === id ? 'bg-[var(--admin-ink)] text-white' : 'bg-[var(--admin-soft)] text-[var(--admin-ink)]'}`}>{label}</button>)}
          </div>

          {detailLoading ? <p className="py-8 text-sm text-[var(--admin-muted)]" aria-live="polite">Loading source-backed branch detail…</p> : null}

          {!detailLoading && tab === "readiness" ? <div className="mt-5 space-y-5">
            {selected.groups.map((group) => group.checks.length > 0 ? <section key={group.category} aria-labelledby={`group-${group.category}`}>
              <h3 id={`group-${group.category}`} className="text-sm font-semibold tracking-wide text-[var(--admin-ink)]">{group.category.replaceAll('_',' ')}</h3>
              <ul className="mt-2 divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)]">
                {group.checks.map((item) => <li key={item.key} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-[var(--admin-ink)]">{item.label}</p>
                    <p className="mt-1 text-sm text-[var(--admin-muted)]">{item.explanation}</p></div>
                    <div className="flex gap-2"><span className="rounded bg-[var(--admin-soft)] px-2 py-1 text-xs font-semibold">{item.state}</span><span className="rounded border border-[var(--admin-border)] px-2 py-1 text-xs">{item.source}</span></div></div>
                  {item.remediationPath && item.state !== "PASS" ? <Link href={item.remediationPath} className="mt-2 inline-flex text-sm font-semibold text-[var(--brand-red)]">Review setup →</Link> : null}
                </li>)}
              </ul>
            </section> : null)}
          </div> : null}

          {!detailLoading && tab === "configuration" ? <div className="mt-5">
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Search configuration<input value={search} onChange={(event) => setSearch(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2" /></label>
              <label className="text-sm font-medium">Source<select value={source} onChange={(event) => setSource(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"><option value="ALL">All sources</option><option value="ORGANIZATION">Organization</option><option value="BRANCH_OVERRIDE">Branch override</option><option value="SCHEMA_DEFAULT">Schema default</option></select></label></div>
            {values.length === 0 ? <p className="mt-6 rounded-lg bg-[var(--admin-soft)] p-4 text-sm text-[var(--admin-muted)]">No configuration values match this view. This is not treated as ready.</p> :
              <ul className="mt-5 divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)]">{values.map((item) => <li key={`${item.key}-${item.source}`} className="p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-medium">{item.label}</p><p className="text-xs text-[var(--admin-muted)]">{item.key} · {item.category}</p></div><span className="text-xs font-semibold">{item.source.replaceAll('_',' ')}</span></div><p className="mt-2 break-all text-sm">{item.masked ? '•••••••• (secret reference masked)' : JSON.stringify(item.value) ?? 'Not configured'}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{item.active ? `Active version ${item.versionId} · changed ${item.lastChangedAt ? new Date(item.lastChangedAt).toLocaleString() : 'time unavailable'}` : 'Schema default · no active version'}</p></li>)}</ul>}
          </div> : null}

          {!detailLoading && tab === "history" ? <div className="mt-5">
            {(history?.entries.length ?? 0) === 0 ? <p className="rounded-lg bg-[var(--admin-soft)] p-4 text-sm text-[var(--admin-muted)]">No immutable configuration history exists for this branch scope.</p> :
              <ol className="space-y-3">{history!.entries.map((entry) => <li key={entry.id} className="rounded-xl border border-[var(--admin-border)] p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{entry.label}</p><time className="text-xs text-[var(--admin-muted)]">{new Date(entry.timestamp).toLocaleString()}</time></div><p className="mt-1 text-sm text-[var(--admin-muted)]">{entry.action} · {entry.scopeType} · actor {entry.actorId ?? 'unavailable'}</p>{entry.reason ? <p className="mt-2 text-sm">Reason: {entry.reason}</p> : null}<p className="mt-2 text-xs text-[var(--admin-muted)]">Version {entry.toVersionId ?? 'unavailable'} · secret metadata remains redacted by the API</p></li>)}</ol>}
          </div> : null}
        </AdminSurfaceBody>
      </AdminSurface> : null}
    </div>
    <button type="button" onClick={onRetry} className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]">Refresh control plane</button>
  </div>;
}

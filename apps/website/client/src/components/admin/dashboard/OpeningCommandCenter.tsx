import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  categoryLabel,
  displayGroupLabel,
  type EvaluatedReadinessItem,
  type OpeningPercentage,
  type OwnerDecision,
  type ReadinessCategory,
  type ReadinessStatus,
} from "@/lib/opening-readiness-model";

const STATUS_STYLES: Record<ReadinessStatus, string> = {
  COMPLETE: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ACTIVE: "bg-sky-50 text-sky-950 border-sky-200",
  BLOCKED: "bg-red-50 text-red-900 border-red-200",
  WAITING_ON_HUMAN: "bg-amber-50 text-amber-950 border-amber-200",
  FOUNDATION: "bg-[var(--admin-soft)] text-[var(--admin-muted)] border-[var(--admin-border)]",
  UNAVAILABLE: "bg-stone-100 text-stone-700 border-stone-200",
  ERROR: "bg-red-50 text-red-900 border-red-200",
  OFFLINE: "bg-stone-100 text-stone-700 border-stone-200",
};

export function OpeningPercentageBanner({
  percentage,
  comingSoon,
}: {
  percentage: OpeningPercentage;
  comingSoon?: boolean;
}) {
  if (comingSoon) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
        Coming-soon branch — Royal Orchard opening percentage is not inherited here. Northern Bypass
        remains a separate Founder authorization.
      </p>
    );
  }
  return (
    <p
      className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm text-[var(--admin-ink)]"
      aria-live="polite"
      data-testid="opening-percentage"
    >
      {percentage.label}
      {percentage.live ? (
        <span className="mt-1 block text-xs text-[var(--admin-muted)]">
          Denominator: {percentage.completed} complete / {percentage.total} required checks. ACTIVE,
          WAITING_ON_HUMAN, BLOCKED, FOUNDATION, ERROR and OFFLINE do not earn completion credit.
        </span>
      ) : null}
    </p>
  );
}

export function OwnerDecisionQueueView({
  decisions,
  emptyLabel = "No urgent Owner decisions — keep monitoring.",
}: {
  decisions: OwnerDecision[];
  emptyLabel?: string;
}) {
  return (
    <section aria-label="Owner decision queue" className="mb-6">
      <AdminSectionTitle
        eyebrow="Owner"
        title="Owner Decision Queue"
        description="Unresolved human decisions only — completed work is listed separately."
      />
      {decisions.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">{emptyLabel}</p>
      ) : (
        <ol className="space-y-3">
          {decisions.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-[var(--admin-ink)]">
                  {d.priority}. {d.title}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[d.status]}`}
                >
                  {d.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-[var(--admin-muted)]">Why: {d.whyItMatters}</p>
              <p className="mt-1 text-[var(--admin-ink)]">
                <strong>Next:</strong> {d.nextAction}
              </p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Severity: {d.blockingSeverity} · Scope: {d.branchScope} · Human required
              </p>
              <Link
                href={d.deepLink}
                className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
              >
                Open destination
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ReadinessChecklistGroups({
  items,
  groups,
}: {
  items: EvaluatedReadinessItem[];
  groups?: Array<{ key: string; label: string; categories: ReadinessCategory[] }>;
}) {
  const defaultGroups: Array<{ key: string; label: string; categories: ReadinessCategory[] }> = [
    { key: "branch", label: "Branch", categories: ["BRANCH", "MENU"] },
    { key: "people", label: "People", categories: ["PEOPLE"] },
    { key: "floor", label: "Floor and booking", categories: ["FLOOR_AND_BOOKING"] },
    { key: "pay", label: "Payments and notifications", categories: ["PAYMENTS", "NOTIFICATIONS"] },
    { key: "devices", label: "Devices", categories: ["DEVICES"] },
    { key: "ops", label: "Operations", categories: ["OPERATIONS"] },
    {
      key: "train-gov",
      label: "Training and governance",
      categories: ["TRAINING", "GOVERNANCE", "RELIABILITY"],
    },
  ];
  const resolved = groups ?? defaultGroups;

  return (
    <div className="space-y-6">
      {resolved.map((g) => {
        const rows = items.filter((i) => g.categories.includes(i.category));
        if (rows.length === 0) return null;
        return (
          <section key={g.key} aria-label={g.label}>
            <h3 className="mb-2 text-sm font-semibold text-[var(--admin-ink)]">{g.label}</h3>
            <ul className="space-y-2">
              {rows.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[var(--admin-ink)]">{item.title}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[item.status]}`}
                    >
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {categoryLabel(item.category)} · {item.sourceType}
                    {item.requiredForOpening ? " · required" : " · optional"}
                  </p>
                  <p className="mt-2 text-[var(--admin-muted)]">
                    <strong className="text-[var(--admin-ink)]">Problem:</strong> {item.problem}
                  </p>
                  <p className="mt-1 text-[var(--admin-muted)]">
                    <strong className="text-[var(--admin-ink)]">Next action:</strong> {item.nextAction}
                  </p>
                  <Link
                    href={item.deepLink}
                    className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand-red)] underline-offset-2 hover:underline"
                  >
                    {item.deepLink}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function RecentlyCompletedList({ items }: { items: EvaluatedReadinessItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--admin-muted)]">No required checks marked COMPLETE yet.</p>;
  }
  return (
    <ul className="space-y-2 text-sm text-[var(--admin-muted)]">
      {items.map((i) => (
        <li key={`done-${i.id}`}>
          <span className="font-semibold text-emerald-800">COMPLETE</span> — {i.title}
          <span className="text-xs"> ({displayGroupLabel(i.category)})</span>
        </li>
      ))}
    </ul>
  );
}

export { STATUS_STYLES as readinessStatusStyles };

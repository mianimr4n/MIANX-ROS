import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import {
  OpeningPercentageBanner,
  OwnerDecisionQueueView,
  ReadinessChecklistGroups,
  RecentlyCompletedList,
} from "@/components/admin/dashboard/OpeningCommandCenter";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useOperationalData } from "@/lib/op-status";
import { fetchOpeningReadiness } from "@/lib/admin-api";
import { computeOpeningCountdown } from "@/lib/opening-countdown";
import {
  buildOwnerDecisionQueue,
  computeOpeningPercentage,
  evaluateOpeningReadiness,
  recentlyCompletedItems,
  waitingOnHumanCount,
  criticalBlockerCount,
} from "@/lib/opening-readiness-model";

const GRADE_STYLES: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-900 border-emerald-200",
  READY_WITH_LIMITATIONS: "bg-amber-50 text-amber-950 border-amber-200",
  BLOCKED: "bg-red-50 text-red-900 border-red-200",
  NOT_VERIFIED: "bg-[var(--admin-soft)] text-[var(--admin-muted)] border-[var(--admin-border)]",
  ERROR: "bg-red-50 text-red-900 border-red-200",
};

const GRADE_LABELS: Record<string, string> = {
  READY: "Stored probes ready",
  READY_WITH_LIMITATIONS: "Stored probes limited",
  BLOCKED: "Setup needed",
  NOT_VERIFIED: "Not verified yet",
  ERROR: "Readiness error",
};

function statusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "coming-soon") return "Coming soon";
  if (normalized === "operating" || normalized === "active") return "Operating";
  const words = normalized.replaceAll("-", " ").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Opening readiness panel — shared model for Branch + Dashboard.
 * Does not invent restaurant-ready claims from software % alone.
 */
export function OpeningReadinessSummary({
  token,
  branchId,
  enabled,
  showTechnicalDetail = false,
  variant = "full",
  northernBypassStatus = "coming-soon",
  reservationsOk = null,
  waitlistOk = null,
  healthOk = null,
  healthError = false,
  healthOffline = false,
}: {
  token: string | undefined;
  branchId: string | null;
  enabled: boolean;
  showTechnicalDetail?: boolean;
  variant?: "full" | "compact";
  northernBypassStatus?: string | null;
  reservationsOk?: boolean | null;
  waitlistOk?: boolean | null;
  healthOk?: boolean | null;
  healthError?: boolean;
  healthOffline?: boolean;
}) {
  const ready = Boolean(token) && Boolean(branchId) && enabled;
  const op = useOperationalData(
    ({ signal, correlationId }) => fetchOpeningReadiness(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    { enabled: ready, pollMs: 120_000 },
  );

  const data = op.data;
  const grade = data?.readinessGrade ?? (data?.operationallyActive ? "READY_WITH_LIMITATIONS" : "BLOCKED");
  const comingSoon = String(data?.status ?? "").toLowerCase() === "coming-soon";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!ready || comingSoon) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [comingSoon, ready]);
  const countdown = useMemo(() => computeOpeningCountdown(now.getTime(), false), [now]);

  const readinessError = op.state === "ERROR";
  const readinessOffline = op.state === "OFFLINE";

  const items = useMemo(
    () =>
      evaluateOpeningReadiness({
        nowIso: now.toISOString(),
        branchCode: data?.branchCode ?? null,
        branchStatus: data?.status ?? null,
        northernBypassStatus: northernBypassStatus ?? "coming-soon",
        readinessReport: data
          ? { readinessGrade: data.readinessGrade, checks: data.checks, blockers: data.blockers }
          : null,
        readinessError,
        readinessOffline,
        reservationsOk,
        waitlistOk,
        healthOk,
        healthError,
        healthOffline,
        rollbackRunbookPresent: true,
        incidentRunbookPresent: true,
      }),
    [
      data,
      healthError,
      healthOffline,
      healthOk,
      northernBypassStatus,
      now,
      readinessError,
      readinessOffline,
      reservationsOk,
      waitlistOk,
    ],
  );

  const percentage = useMemo(
    () => computeOpeningPercentage(items, { readinessError, readinessOffline }),
    [items, readinessError, readinessOffline],
  );

  const decisions = useMemo(
    () => buildOwnerDecisionQueue(items, data?.name ?? "Royal Orchard"),
    [items, data?.name],
  );

  const completed = useMemo(() => recentlyCompletedItems(items), [items]);

  if (!ready) return null;

  return (
    <section aria-label="Opening readiness" className="mb-8">
      <AdminSectionTitle
        eyebrow="Opening"
        title="Opening readiness"
        description={
          comingSoon
            ? "This branch is coming soon. Finish setup before live service — Royal Orchard opening percentage is not inherited here."
            : "Operational opening readiness (people, devices, payments) is separate from software delivery completion."
        }
      />
      {!comingSoon ? (
        <p className="mb-3 text-sm text-[var(--admin-muted)]" aria-live="polite">
          Opening countdown: <strong className="text-[var(--admin-ink)]">{countdown.label}</strong>
          <span className="ml-2 text-xs">(14 Aug 2026 · 10:00 Asia/Karachi)</span>
        </p>
      ) : null}
      <OperationalStatusBanner
        state={op.state}
        error={op.error}
        lastSuccessAt={op.lastSuccessAt}
        onRetry={op.retry}
        correlationId={op.correlationId}
        showTechnicalDetail={showTechnicalDetail}
      />

      {op.state === "LOADING" && !data ? (
        <div className="h-28 animate-pulse rounded-2xl bg-[var(--admin-soft)] motion-reduce:animate-none" aria-hidden />
      ) : null}

      <div className="mb-4">
        <OpeningPercentageBanner percentage={percentage} comingSoon={comingSoon} />
      </div>

      {data || readinessError || readinessOffline ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          {data ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--admin-ink)]">
                  {data.name}{" "}
                  <span className="font-normal text-[var(--admin-muted)]">({data.branchCode})</span>
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">Status: {statusLabel(String(data.status))}</p>
                {!comingSoon ? (
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Critical blockers: {criticalBlockerCount(items)} · Waiting on human:{" "}
                    {waitingOnHumanCount(items)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Coming-soon setup — Royal Orchard opening blockers are not counted here.
                  </p>
                )}
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${GRADE_STYLES[grade] ?? GRADE_STYLES.NOT_VERIFIED}`}
              >
                {GRADE_LABELS[grade] ?? String(grade)}
              </span>
            </div>
          ) : null}

          {!comingSoon && variant === "full" ? (
            <div className="mt-5">
              <OwnerDecisionQueueView decisions={decisions.slice(0, 6)} />
            </div>
          ) : null}

          {comingSoon && variant === "full" ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Coming-soon branch setup</p>
              <p className="mt-1">
                Keep this branch coming-soon until the Founder separately authorizes activation. Local
                phone, hours, menu, and staff setup can continue without inheriting Royal Orchard
                opening readiness percentage.
              </p>
            </div>
          ) : null}

          {!comingSoon && variant === "full" ? (
            <div className="mt-4">
              <ReadinessChecklistGroups items={items} />
            </div>
          ) : null}

          {!comingSoon && variant === "compact" ? (
            <ul className="mt-4 space-y-2" aria-label="Top opening blockers">
              {decisions.slice(0, 3).map((d) => (
                <li key={d.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <span className="font-medium">{d.title}</span> — {d.nextAction}
                </li>
              ))}
            </ul>
          ) : null}

          {!comingSoon && variant === "full" ? (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Recently completed</h3>
              <RecentlyCompletedList items={completed} />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/ai-team"
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-red-dark)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red-dark)]"
            >
              Open Mianx.ai Team
            </Link>
            <Link
              href="/admin/branch"
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
            >
              Review opening plan
            </Link>
            <Link
              href="/admin/hr"
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-soft)]"
            >
              Resolve setup blockers
            </Link>
          </div>
          <p className="mt-3 text-xs text-[var(--admin-muted)]">
            Actions navigate only — there is no fake completion toggle. Software % ≠ restaurant ready to open.
          </p>
        </div>
      ) : null}
    </section>
  );
}

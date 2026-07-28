import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import type { OpeningPercentage, OwnerDecision } from "@/lib/opening-readiness-model";

/** Compact Executive Dashboard summary — links to full Team Center. */
export function MianxTeamSummaryCard({
  countdownLabel,
  percentage,
  criticalBlockers,
  waitingOnHuman,
  nextDecision,
  comingSoon = false,
}: {
  countdownLabel: string;
  percentage: OpeningPercentage | null;
  criticalBlockers: number | null;
  waitingOnHuman: number | null;
  nextDecision: OwnerDecision | null;
  comingSoon?: boolean;
}) {
  return (
    <AdminSurface className="bg-gradient-to-br from-white to-[var(--admin-soft)]" aria-labelledby="mianx-team-summary">
      <AdminSurfaceHeader
        title="Opening command center"
        description={
          comingSoon
            ? "Coming-soon branch setup — Royal Orchard opening % is not shown here."
            : "Countdown, opening checks, and the next Owner decision."
        }
      />
      <AdminSurfaceBody>
        <h3 id="mianx-team-summary" className="sr-only">
          Opening command center summary
        </h3>
        <p className="text-2xl font-semibold tabular-nums text-[var(--admin-ink)]" aria-live="polite">
          {countdownLabel}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">Target 14 Aug 2026 · 10:00 Asia/Karachi</p>
        {comingSoon ? (
          <p className="mt-3 text-sm text-amber-950">
            Northern Bypass / coming-soon: keep separate from Royal Orchard launch readiness.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-[var(--admin-ink)]" data-testid="exec-opening-percentage">
              {percentage?.label ?? "Opening readiness loading…"}
            </p>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              Critical blockers: {criticalBlockers ?? "—"} · Waiting on human: {waitingOnHuman ?? "—"}
            </p>
            {nextDecision ? (
              <p className="mt-2 text-sm text-[var(--admin-muted)]">
                Next Owner decision: <strong className="text-[var(--admin-ink)]">{nextDecision.title}</strong>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--admin-muted)]">No urgent Owner decisions in queue.</p>
            )}
          </>
        )}
        <Link
          href="/admin/ai-team"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
        >
          Open Mianx.ai Team
        </Link>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

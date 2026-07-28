import { useEffect, useMemo, useState } from "react";

import { MianxTeamSummaryCard } from "@/components/admin/dashboard/MianxTeamSummaryCard";
import { fetchOpeningReadiness, fetchSystemHealth } from "@/lib/admin-api";
import { computeOpeningCountdown } from "@/lib/opening-countdown";
import {
  buildOwnerDecisionQueue,
  computeOpeningPercentage,
  criticalBlockerCount,
  evaluateOpeningReadiness,
  waitingOnHumanCount,
} from "@/lib/opening-readiness-model";
import { getOpeningReleaseEvidence } from "@/lib/opening-release-evidence";
import { useOperationalData } from "@/lib/op-status";
import { listReservations, listWaitlist } from "@/lib/table-service-api";

/** Fetches readiness + shared signals and feeds the Executive compact summary card. */
export function OpeningExecSummaryBridge({
  token,
  branchId,
  enabled,
  comingSoon,
  northernBypassStatus,
  branchLabel,
}: {
  token: string | undefined;
  branchId: string | null;
  enabled: boolean;
  comingSoon: boolean;
  northernBypassStatus: string | null;
  branchLabel: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const countdown = useMemo(() => computeOpeningCountdown(now.getTime(), false), [now]);

  const ready = Boolean(token) && Boolean(branchId) && enabled && !comingSoon;
  const op = useOperationalData(
    ({ signal, correlationId }) => fetchOpeningReadiness(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    { enabled: ready, pollMs: 120_000 },
  );
  const health = useOperationalData(
    ({ signal, correlationId }) => fetchSystemHealth(token!, { signal, correlationId }),
    [token],
    { enabled: ready, pollMs: 120_000 },
  );
  const reservations = useOperationalData(
    ({ signal, correlationId }) =>
      listReservations(token!, { branchId: branchId!, limit: 100 }, { signal, correlationId }),
    [token, branchId],
    { enabled: ready },
  );
  const waitlist = useOperationalData(
    ({ signal, correlationId }) =>
      listWaitlist(token!, { branchId: branchId!, limit: 100 }, { signal, correlationId }),
    [token, branchId],
    { enabled: ready },
  );

  const readinessError = op.state === "ERROR";
  const readinessOffline = op.state === "OFFLINE";
  const reservationsFailed = reservations.state === "ERROR" || reservations.state === "OFFLINE";
  const waitlistFailed = waitlist.state === "ERROR" || waitlist.state === "OFFLINE";
  const healthError = health.state === "ERROR";
  const healthOffline = health.state === "OFFLINE";
  const healthFailed = healthError || healthOffline;
  const releaseEvidence = getOpeningReleaseEvidence();

  const items = useMemo(
    () =>
      evaluateOpeningReadiness({
        nowIso: now.toISOString(),
        branchCode: op.data?.branchCode ?? null,
        branchStatus: op.data?.status ?? null,
        northernBypassStatus: northernBypassStatus ?? "coming-soon",
        readinessReport: op.data
          ? {
              readinessGrade: op.data.readinessGrade,
              checks: op.data.checks,
              blockers: op.data.blockers,
            }
          : null,
        readinessError,
        readinessOffline,
        reservationsOk: reservationsFailed ? false : reservations.data ? true : null,
        waitlistOk: waitlistFailed ? false : waitlist.data ? true : null,
        healthOk: healthFailed ? null : health.data ? health.data.api.status === "ok" : null,
        healthError,
        healthOffline,
        rollbackRunbookPresent: releaseEvidence.rollbackRunbookDocumented,
        incidentRunbookPresent: releaseEvidence.incidentRunbookDocumented,
      }),
    [
      health.data,
      healthError,
      healthFailed,
      healthOffline,
      northernBypassStatus,
      now,
      op.data,
      readinessError,
      readinessOffline,
      releaseEvidence.incidentRunbookDocumented,
      releaseEvidence.rollbackRunbookDocumented,
      reservations.data,
      reservationsFailed,
      waitlist.data,
      waitlistFailed,
    ],
  );

  const percentage = useMemo(
    () => computeOpeningPercentage(items, { readinessError, readinessOffline }),
    [items, readinessError, readinessOffline],
  );
  const decisions = useMemo(
    () => buildOwnerDecisionQueue(items, branchLabel),
    [items, branchLabel],
  );

  return (
    <MianxTeamSummaryCard
      countdownLabel={countdown.label}
      percentage={comingSoon ? null : percentage}
      criticalBlockers={comingSoon ? null : criticalBlockerCount(items)}
      waitingOnHuman={comingSoon ? null : waitingOnHumanCount(items)}
      nextDecision={comingSoon ? null : decisions[0] ?? null}
      comingSoon={comingSoon}
    />
  );
}

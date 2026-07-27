import { useEffect, useMemo, useState } from "react";

import { MianxTeamSummaryCard } from "@/components/admin/dashboard/MianxTeamSummaryCard";
import { fetchOpeningReadiness } from "@/lib/admin-api";
import { computeOpeningCountdown } from "@/lib/opening-countdown";
import {
  buildOwnerDecisionQueue,
  computeOpeningPercentage,
  criticalBlockerCount,
  evaluateOpeningReadiness,
  waitingOnHumanCount,
} from "@/lib/opening-readiness-model";
import { useOperationalData } from "@/lib/op-status";

/** Fetches readiness once and feeds the Executive compact summary card. */
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

  const readinessError = op.state === "ERROR";
  const readinessOffline = op.state === "OFFLINE";
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
        reservationsOk: null,
        waitlistOk: null,
        healthOk: null,
        healthError: false,
        healthOffline: false,
        rollbackRunbookPresent: true,
        incidentRunbookPresent: true,
      }),
    [northernBypassStatus, now, op.data, readinessError, readinessOffline],
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

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useBranch } from "@/contexts/BranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { canAccessAiTeam } from "@/lib/admin-access";
import {
  fetchAdminOperationsDashboard,
  fetchOpeningReadiness,
  fetchSystemHealth,
} from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import {
  buildMianxAgentCards,
  summarizeAgentStatuses,
  type MianxAgentCard,
} from "@/lib/mianx-team";
import { computeOpeningCountdown } from "@/lib/opening-countdown";
import {
  buildOwnerDecisionQueue,
  computeOpeningPercentage,
  criticalBlockerCount,
  evaluateOpeningReadiness,
  recentlyCompletedItems,
  waitingOnHumanCount,
} from "@/lib/opening-readiness-model";
import {
  OpeningPercentageBanner,
  OwnerDecisionQueueView,
  RecentlyCompletedList,
} from "@/components/admin/dashboard/OpeningCommandCenter";
import { useOperationalData } from "@/lib/op-status";
import { listReservations, listWaitlist } from "@/lib/table-service-api";
import { AdminShell } from "@/pages/admin/AdminShell";

const STATUS_STYLES: Record<string, string> = {
  COMPLETE: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ACTIVE: "bg-sky-50 text-sky-950 border-sky-200",
  BLOCKED: "bg-red-50 text-red-900 border-red-200",
  WAITING_ON_HUMAN: "bg-amber-50 text-amber-950 border-amber-200",
  FOUNDATION: "bg-[var(--admin-soft)] text-[var(--admin-muted)] border-[var(--admin-border)]",
  UNAVAILABLE: "bg-stone-100 text-stone-700 border-stone-200",
};

function formatKarachiNow(now: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

function AgentCardView({ agent }: { agent: MianxAgentCard }) {
  return (
    <article
      className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-sm"
      aria-label={`${agent.name} — ${agent.status}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-muted)]">
            {agent.department}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--admin-ink)]">{agent.name}</h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[agent.status]}`}
        >
          {agent.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--admin-muted)]">{agent.mission}</p>
      <div className="mt-4 space-y-2 text-sm">
        <div>
          <p className="font-semibold text-[var(--admin-ink)]">Status</p>
          <p className="text-[var(--admin-muted)]">{agent.status}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--admin-ink)]">Verified signal</p>
          <p className="text-[var(--admin-muted)]">{agent.verifiedSignal}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--admin-ink)]">Problem</p>
          <p className="text-[var(--admin-muted)]">{agent.currentProblem}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--admin-ink)]">Next action</p>
          <p className="text-[var(--admin-muted)]">{agent.nextAction}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-[var(--admin-muted)]">
          <span>Source: {agent.sourceType}</span>
          <span>Approval: {agent.humanApprovalRequired ? "Required" : "Not required"}</span>
        </div>
      </div>
    </article>
  );
}

export default function AdminAiTeam() {
  const { session, isSuperAdmin, roles, permissions } = useAuth();
  const { label: branchLabel, branchIdFilter, selection } = useAdminBranch();
  const { allBranches } = useBranch();
  const allowed = canAccessAiTeam({ roles, permissions, isSuperAdmin });
  const { isAuthLoading, gateReady } = useAdminAccessGate(allowed);
  const token = session?.access_token;
  const apiReady = Boolean(isApiConfigured && token && gateReady);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const countdown = useMemo(() => computeOpeningCountdown(now.getTime(), false), [now]);

  const ops = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId: branchIdFilter }, { signal, correlationId }),
    [token, branchIdFilter, apiReady],
    { enabled: apiReady },
  );

  const openingBranchId =
    selection.mode === "branch"
      ? selection.branchId
      : (branchIdFilter ?? allBranches.find((b) => b.code === "royal-orchard")?.id ?? null);

  const opening = useOperationalData(
    ({ signal, correlationId }) =>
      fetchOpeningReadiness(token!, openingBranchId!, { signal, correlationId }),
    [token, openingBranchId, apiReady],
    { enabled: apiReady && Boolean(openingBranchId) },
  );

  const health = useOperationalData(
    ({ signal, correlationId }) => fetchSystemHealth(token!, { signal, correlationId }),
    [token, apiReady, isSuperAdmin],
    { enabled: apiReady && isSuperAdmin },
  );

  const reservations = useOperationalData(
    ({ signal, correlationId }) =>
      listReservations(token!, { branchId: openingBranchId!, limit: 100 }, { signal, correlationId }),
    [token, openingBranchId, apiReady],
    { enabled: apiReady && Boolean(openingBranchId) },
  );

  const waitlist = useOperationalData(
    ({ signal, correlationId }) =>
      listWaitlist(token!, { branchId: openingBranchId!, limit: 100 }, { signal, correlationId }),
    [token, openingBranchId, apiReady],
    { enabled: apiReady && Boolean(openingBranchId) },
  );

  const northern = allBranches.find((b) => b.code === "northern-bypass" || /northern/i.test(b.name));
  const selectedBranchMeta =
    selection.mode === "branch"
      ? allBranches.find((b) => b.id === selection.branchId)
      : allBranches.find((b) => b.id === branchIdFilter) ?? null;

  const comingSoonSelected = selectedBranchMeta?.status === "coming-soon";
  const readinessError = opening.state === "ERROR";
  const readinessOffline = opening.state === "OFFLINE";
  const reservationsFailed = reservations.state === "ERROR" || reservations.state === "OFFLINE";
  const waitlistFailed = waitlist.state === "ERROR" || waitlist.state === "OFFLINE";
  const healthFailed = health.state === "ERROR" || health.state === "OFFLINE";

  const readinessItems = useMemo(
    () =>
      evaluateOpeningReadiness({
        nowIso: now.toISOString(),
        branchCode: opening.data?.branchCode ?? selectedBranchMeta?.code ?? null,
        branchStatus: selectedBranchMeta?.status ?? opening.data?.status ?? null,
        northernBypassStatus: northern?.status ?? "coming-soon",
        readinessReport: opening.data
          ? {
              readinessGrade: opening.data.readinessGrade,
              checks: opening.data.checks,
              blockers: opening.data.blockers,
            }
          : null,
        readinessError,
        readinessOffline,
        reservationsOk: reservationsFailed ? false : reservations.data ? true : null,
        waitlistOk: waitlistFailed ? false : waitlist.data ? true : null,
        healthOk: healthFailed ? null : health.data ? health.data.api.status === "ok" : null,
        healthError: health.state === "ERROR",
        healthOffline: health.state === "OFFLINE",
        rollbackRunbookPresent: true,
        incidentRunbookPresent: true,
      }),
    [
      health.data,
      health.state,
      northern?.status,
      now,
      opening.data,
      readinessError,
      readinessOffline,
      reservations.data,
      reservationsFailed,
      selectedBranchMeta?.code,
      selectedBranchMeta?.status,
      waitlist.data,
      waitlistFailed,
    ],
  );

  const openingPercentage = useMemo(
    () =>
      comingSoonSelected
        ? {
            completed: 0,
            total: 0,
            percent: null,
            label: "Coming-soon branch — Royal Orchard opening percentage is not inherited",
            live: false,
            error: false,
            offline: false,
          }
        : computeOpeningPercentage(readinessItems, { readinessError, readinessOffline }),
    [comingSoonSelected, readinessError, readinessItems, readinessOffline],
  );

  const ownerDecisions = useMemo(
    () => (comingSoonSelected ? [] : buildOwnerDecisionQueue(readinessItems, branchLabel)),
    [branchLabel, comingSoonSelected, readinessItems],
  );

  const completedItems = useMemo(() => recentlyCompletedItems(readinessItems), [readinessItems]);

  const cards = useMemo(() => {
    const kpis = ops.data?.kpis;
    const opsFailed = ops.state === "ERROR" || ops.state === "OFFLINE";
    const openingFailed = readinessError || readinessOffline;
    return buildMianxAgentCards({
      nowIso: now.toISOString(),
      branchLabel,
      branchStatus: selectedBranchMeta?.status ?? null,
      northernBypassStatus: northern?.status ?? "coming-soon",
      ordersPending: opsFailed
        ? null
        : (ops.data?.statusCounts?.pending ?? kpis?.activeOrders ?? null),
      ordersError: opsFailed,
      kitchenTickets: opsFailed ? null : (kpis?.kitchenWaiting ?? null),
      kitchenError: opsFailed,
      deliveriesActive: opsFailed ? null : (kpis?.activeDeliveries ?? null),
      deliveryError: opsFailed,
      reservationsCount: reservationsFailed ? null : (reservations.data?.length ?? null),
      reservationsError: reservationsFailed,
      waitlistCount: waitlistFailed ? null : (waitlist.data?.length ?? null),
      waitlistError: waitlistFailed,
      openingGrade: openingFailed ? null : (opening.data?.readinessGrade ?? null),
      openingBlockers: openingFailed ? null : (opening.data?.blockers?.length ?? null),
      openingError: openingFailed,
      healthOk: healthFailed ? null : health.data ? health.data.api.status === "ok" : null,
      healthError: healthFailed,
      isSuperAdmin,
      readinessItems,
      openingPercentage,
    });
  }, [
    branchLabel,
    health.data,
    healthFailed,
    isSuperAdmin,
    northern?.status,
    now,
    opening.data,
    openingPercentage,
    ops.data,
    ops.state,
    readinessError,
    readinessItems,
    readinessOffline,
    reservations.data,
    reservationsFailed,
    selectedBranchMeta?.status,
    waitlist.data,
    waitlistFailed,
  ]);

  const summary = useMemo(() => summarizeAgentStatuses(cards), [cards]);
  const blockers = cards.filter((c) => c.status === "BLOCKED" || c.status === "WAITING_ON_HUMAN");
  const nextSeven = ownerDecisions.slice(0, 7);

  if (isAuthLoading) {
    return (
      <AdminShell title="Mianx.ai Operating Team">
        <p className="text-sm text-[var(--admin-muted)]">Loading admin session…</p>
      </AdminShell>
    );
  }

  if (!gateReady) {
    return (
      <AdminShell title="Mianx.ai Operating Team">
        <p className="text-sm text-[var(--admin-muted)]">Checking authorization…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Mianx.ai Operating Team">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
          Telepizza Opening Mission
        </p>
        <p className="mt-2 max-w-3xl text-sm text-[var(--admin-muted)]">
          Status → Problem → Next Action. Honest operating signals only — no fabricated agent chat and no
          autonomous background workforce.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--admin-muted)]">
          <span className="rounded-full border border-[var(--admin-border)] bg-white px-3 py-1.5">
            Branch: <strong className="text-[var(--admin-ink)]">{branchLabel}</strong>
          </span>
          <span className="rounded-full border border-[var(--admin-border)] bg-white px-3 py-1.5">
            Now (Asia/Karachi): <strong className="text-[var(--admin-ink)]">{formatKarachiNow(now)}</strong>
          </span>
          <span className="rounded-full border border-[var(--admin-border)] bg-white px-3 py-1.5">
            Northern Bypass:{" "}
            <strong className="text-[var(--admin-ink)]">{northern?.status ?? "coming-soon"}</strong>
          </span>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Opening readiness summary">
        <AdminSurface className="sm:col-span-2 lg:col-span-2">
          <AdminSurfaceHeader title="Opening countdown" description="Canonical target 14 Aug 2026 · 10:00 Asia/Karachi" />
          <AdminSurfaceBody>
            <p className="text-3xl font-semibold tabular-nums text-[var(--admin-ink)]" aria-live="polite">
              {countdown.label}
            </p>
            {countdown.mode === "before" ? (
              <p className="mt-2 text-xs text-[var(--admin-muted)]">
                {countdown.days}d · {countdown.hours}h · {countdown.minutes}m · {countdown.seconds}s
              </p>
            ) : null}
          </AdminSurfaceBody>
        </AdminSurface>
        <AdminSurface className="sm:col-span-2">
          <AdminSurfaceHeader title="Opening readiness %" description="Required checks only — not agent heuristics" />
          <AdminSurfaceBody>
            <OpeningPercentageBanner percentage={openingPercentage} comingSoon={comingSoonSelected} />
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              Critical blockers: {comingSoonSelected ? "—" : criticalBlockerCount(readinessItems)} · Waiting on
              human: {comingSoonSelected ? "—" : waitingOnHumanCount(readinessItems)}
            </p>
          </AdminSurfaceBody>
        </AdminSurface>
        <AdminSurface>
          <AdminSurfaceHeader title="Agents ACTIVE" />
          <AdminSurfaceBody>
            <p className="text-3xl font-semibold tabular-nums">{summary.counts.ACTIVE}</p>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">COMPLETE: {summary.counts.COMPLETE}</p>
          </AdminSurfaceBody>
        </AdminSurface>
      </section>

      <section className="mb-8" aria-labelledby="today-mission">
        <AdminSectionTitle
          eyebrow="Today"
          title="Today’s Mission"
          description="Keep Royal Orchard opening-ready. Do not activate Northern Bypass."
        />
        <AdminSurface>
          <AdminSurfaceBody>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--admin-muted)]">
              <li id="today-mission">Clear Owner Decision Queue items that block opening day.</li>
              <li>Verify Orders / Kitchen / Delivery honesty for the selected branch.</li>
              <li>Confirm reservations/waitlist EMPTY or intentional bookings.</li>
              <li>Protect pending test order TP-260727-000001 until intentional confirmation.</li>
            </ol>
          </AdminSurfaceBody>
        </AdminSurface>
      </section>

      <section className="mb-8" aria-label="Critical opening blockers">
        <AdminSectionTitle eyebrow="Blockers" title="Critical Opening Blockers" description="Human attention first." />
        {blockers.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No BLOCKED or WAITING_ON_HUMAN agents right now.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {blockers.map((b) => (
              <li key={b.id} className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm">
                <p className="font-semibold text-[var(--admin-ink)]">{b.name}</p>
                <p className="mt-1 text-[var(--admin-muted)]">{b.currentProblem}</p>
                <p className="mt-2 font-medium text-[var(--admin-ink)]">Next: {b.nextAction}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <OwnerDecisionQueueView decisions={ownerDecisions} />

      <section className="mb-8" aria-label="Mianx.ai team agents">
        <AdminSectionTitle
          eyebrow="Team"
          title="Mianx.ai Team"
          description="Fourteen operating agents. LIVE only from successful API responses. No fake background-working animation."
        />
        <OperationalStatusBanner
          state={ops.state}
          error={ops.error}
          lastSuccessAt={ops.lastSuccessAt}
          onRetry={ops.retry}
          correlationId={ops.correlationId}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="mianx-agent-grid">
          {cards.map((agent) => (
            <AgentCardView key={agent.id} agent={agent} />
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--admin-muted)]">Agents rendered: {cards.length} (required 14)</p>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2" aria-label="Signals and recent work">
        <div>
          <AdminSectionTitle eyebrow="Signals" title="Live Operational Signals" />
          <AdminSurface>
            <AdminSurfaceBody className="space-y-2 text-sm text-[var(--admin-muted)]">
              <p>Orders feed: {ops.state}</p>
              <p>Opening readiness: {opening.state}</p>
              <p>Reservations: {reservations.state}</p>
              <p>Waitlist: {waitlist.state}</p>
              <p>System health: {health.state}</p>
            </AdminSurfaceBody>
          </AdminSurface>
        </div>
        <div>
          <AdminSectionTitle eyebrow="Done" title="Recently Completed Work" />
          <AdminSurface>
            <AdminSurfaceBody>
              <RecentlyCompletedList items={completedItems} />
              <p className="mt-3 text-xs text-[var(--admin-muted)]">
                Software delivery evidence (PR #111, #102) is separate from restaurant opening readiness.
              </p>
            </AdminSurfaceBody>
          </AdminSurface>
        </div>
      </section>

      <section className="mb-8" aria-label="Next seven actions">
        <AdminSectionTitle eyebrow="Plan" title="Next Seven Actions" />
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--admin-muted)]">
          {nextSeven.length === 0 ? <li>No urgent Owner decisions queued.</li> : null}
          {nextSeven.map((a) => (
            <li key={`next-${a.id}`}>
              <strong className="text-[var(--admin-ink)]">{a.title}:</strong> {a.nextAction}
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-4" aria-label="Evidence and release status">
        <AdminSectionTitle
          eyebrow="Evidence"
          title="Evidence and release status"
          description="Documentation links only — private absolute paths are never shown in Production UI."
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/dashboard" className="min-h-11 font-semibold text-red-700 underline-offset-2 hover:underline">
            Executive Dashboard
          </Link>
          <Link href="/admin/branch" className="min-h-11 font-semibold text-red-700 underline-offset-2 hover:underline">
            Branch readiness
          </Link>
          <Link href="/admin/orders" className="min-h-11 font-semibold text-red-700 underline-offset-2 hover:underline">
            Orders
          </Link>
          <a
            href="/docs/11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md"
            className="pointer-events-none min-h-11 font-semibold text-[var(--admin-muted)]"
            aria-disabled="true"
            title="See repository docs/11-ai (not a public site route)"
          >
            Docs: Mianx.ai operating model (repo)
          </a>
        </div>
      </section>
    </AdminShell>
  );
}

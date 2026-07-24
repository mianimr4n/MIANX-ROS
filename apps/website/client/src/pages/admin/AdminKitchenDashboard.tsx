import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";

import { KitchenBoard } from "@/components/admin/kitchen/KitchenBoard";
import { type KitchenCardEnrichment, KitchenCard } from "@/components/admin/kitchen/KitchenCard";
import { KitchenDetailsPanel } from "@/components/admin/kitchen/KitchenDetailsPanel";
import { KitchenManagerShell } from "@/components/admin/kitchen/KitchenManagerShell";
import { AdminKpiCard, AdminKpiSkeleton, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import {
  canAccessAdminOrdersApi,
  canAccessKitchenManagerDashboard,
  isKitchenOnly,
  primaryRoleLabel,
} from "@/lib/admin-access";
import {
  PREP_TARGET_MINUTES,
  averagePrepMinutes,
  elapsedMinutes,
  ticketTimerStartIso,
} from "@/lib/admin-kitchen";
import { getAdminOrder, listAdminOrders, type AdminOrderDetail, type AdminOrderListItem } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  listKitchenTickets,
  patchKitchenTicketStatus,
  type KitchenTicket,
} from "@/lib/ops-api";
import { useLocation } from "wouter";

function readState(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    view: params.get("view") ?? "board",
    status: params.get("status") ?? "",
    orderType: params.get("orderType") ?? "",
    source: params.get("source") ?? "",
    search: params.get("q") ?? "",
    selected: params.get("selected") ?? "",
  };
}

function sortTickets(tickets: KitchenTicket[]): KitchenTicket[] {
  return [...tickets].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.sequenceNumber - b.sequenceNumber;
  });
}

function matchesSearch(ticket: KitchenTicket, enrichment: KitchenCardEnrichment | undefined, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    String(ticket.sequenceNumber ?? "").includes(needle) ||
    ticket.orderId.toLowerCase().includes(needle) ||
    (enrichment?.orderNumber ?? "").toLowerCase().includes(needle) ||
    (enrichment?.contactName ?? "").toLowerCase().includes(needle)
  );
}

export default function AdminKitchenDashboard() {
  const { session, permissions, isSuperAdmin, roles, branchIds } = useAuth();
  const { branchIdFilter, label: branchLabel, allowedBranches, selection, setSelection } =
    useAdminBranch();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readState(search), [search]);

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const principal = { roles, permissions, isSuperAdmin, branchIds };
  const allowed = canAccessKitchenManagerDashboard(principal);
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);
  const canEnrichOrders = canAccessAdminOrdersApi(principal);
  const kitchenOnly = isKitchenOnly(principal);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  useEffect(() => {
    if (!gateReady) return;
    if (selection.mode === "branch" && branchIdFilter) return;
    const preferred =
      allowedBranches.find((b) => branchIds.includes(b.id)) ?? allowedBranches[0] ?? null;
    if (preferred) setSelection({ mode: "branch", branchId: preferred.id });
  }, [allowedBranches, branchIdFilter, branchIds, gateReady, selection.mode, setSelection]);

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readState>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.view && merged.view !== "board") params.set("view", merged.view);
      if (merged.status) params.set("status", merged.status);
      if (merged.orderType) params.set("orderType", merged.orderType);
      if (merged.source) params.set("source", merged.source);
      if (merged.search) params.set("q", merged.search);
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/kitchen-dashboard?${qs}` : "/admin/kitchen-dashboard");
    },
    [setLocation, urlState],
  );

  const loadTickets = useCallback(
    async (opts?: { soft?: boolean }) => {
      const token = session?.access_token;
      if (!token || !allowed) return;
      if (opts?.soft) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await listKitchenTickets(token, {
          branchId: branchIdFilter,
          limit: 100,
        });
        setTickets(data);
        setError(null);
        setLive(true);
        setLastUpdatedAt(new Date());
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Failed to load kitchen tickets");
        setLive(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, branchIdFilter, session?.access_token],
  );

  const loadOrderEnrichment = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !canEnrichOrders) {
      setOrders([]);
      return;
    }
    try {
      const result = await listAdminOrders(token, {
        branchId: branchIdFilter,
        limit: 100,
        offset: 0,
      });
      setOrders(result.orders);
    } catch {
      setOrders([]);
    }
  }, [branchIdFilter, canEnrichOrders, session?.access_token]);

  const loadDetail = useCallback(
    async (orderId: string) => {
      const token = session?.access_token;
      if (!token || !canEnrichOrders) {
        setDetail(null);
        setDetailError(
          canEnrichOrders ? null : "Order detail enrichment requires order.manage (usually available for kitchen).",
        );
        return;
      }
      setDetailLoading(true);
      try {
        const data = await getAdminOrder(token, orderId);
        setDetail(data);
        setDetailError(null);
      } catch (err) {
        setDetail(null);
        setDetailError(err instanceof ApiRequestError ? err.message : "Failed to load order detail");
      } finally {
        setDetailLoading(false);
      }
    },
    [canEnrichOrders, session?.access_token],
  );

  useEffect(() => {
    if (!gateReady) return;
    void loadTickets();
    void loadOrderEnrichment();
  }, [gateReady, loadTickets, loadOrderEnrichment]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 15_000);
    const poll = window.setInterval(() => {
      void loadTickets({ soft: true });
    }, 8_000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [loadTickets]);

  useEffect(() => {
    setSearchDraft(urlState.search);
  }, [urlState.search]);

  const enrichmentByOrderId = useMemo(() => {
    const map: Record<string, KitchenCardEnrichment> = {};
    for (const order of orders) {
      map[order.id] = {
        orderNumber: order.orderNumber,
        contactName: order.contactName,
        orderType: order.orderType,
        orderSource: order.orderSource || null,
        paymentStatus: order.paymentStatus,
        notes: null,
      };
    }
    return map;
  }, [orders]);

  const activeTickets = useMemo(
    () => sortTickets(tickets.filter((t) => ["queued", "accepted", "preparing", "ready"].includes(t.status))),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    return activeTickets.filter((ticket) => {
      if (urlState.view === "ready" && ticket.status !== "ready") return false;
      if (urlState.view === "delayed") {
        if (elapsedMinutes(ticketTimerStartIso(ticket), nowMs) < PREP_TARGET_MINUTES) return false;
      }
      if (urlState.view === "queue" && !["queued", "accepted", "preparing"].includes(ticket.status)) {
        return false;
      }
      if (urlState.status && ticket.status !== urlState.status) return false;
      const enrichment = enrichmentByOrderId[ticket.orderId];
      if (urlState.orderType && enrichment?.orderType !== urlState.orderType) return false;
      if (urlState.source) {
        const src = (enrichment?.orderSource ?? "").toLowerCase();
        if (src !== urlState.source.toLowerCase()) return false;
      }
      if (!matchesSearch(ticket, enrichment, urlState.search)) return false;
      return true;
    });
  }, [activeTickets, enrichmentByOrderId, nowMs, urlState]);

  const summary = useMemo(() => {
    const queued = activeTickets.filter((t) => t.status === "queued").length;
    const accepted = activeTickets.filter((t) => t.status === "accepted").length;
    const preparing = activeTickets.filter((t) => t.status === "preparing").length;
    const ready = activeTickets.filter((t) => t.status === "ready").length;
    const delayed = activeTickets.filter(
      (t) => elapsedMinutes(ticketTimerStartIso(t), nowMs) >= PREP_TARGET_MINUTES,
    ).length;
    const oldest = activeTickets[0]
      ? elapsedMinutes(ticketTimerStartIso(activeTickets[0]), nowMs)
      : null;
    const avgPrep = averagePrepMinutes(tickets);
    return { queued, accepted, preparing, ready, delayed, oldest, avgPrep };
  }, [activeTickets, nowMs, tickets]);

  async function onTransition(ticket: KitchenTicket, toStatus: string) {
    const token = session?.access_token;
    if (!token || busyTicketId) return;
    setBusyTicketId(ticket.id);
    setActionError(null);
    try {
      await patchKitchenTicketStatus(token, ticket.id, toStatus);
      await loadTickets({ soft: true });
      if (selectedTicket?.id === ticket.id) {
        const refreshed = (
          await listKitchenTickets(token, { branchId: branchIdFilter, limit: 100 })
        ).find((t) => t.id === ticket.id);
        if (refreshed) setSelectedTicket(refreshed);
      }
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Kitchen status update failed");
    } finally {
      setBusyTicketId(null);
    }
  }

  function openTicket(ticket: KitchenTicket) {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
    writeUrl({ selected: ticket.id });
    void loadDetail(ticket.orderId);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedTicket(null);
    setDetail(null);
    writeUrl({ selected: "" });
  }

  useEffect(() => {
    if (!urlState.selected || tickets.length === 0) return;
    const ticket = tickets.find((t) => t.id === urlState.selected);
    if (ticket) {
      setSelectedTicket(ticket);
      setDrawerOpen(true);
      void loadDetail(ticket.orderId);
    }
  }, [urlState.selected, tickets, loadDetail]);

  const syncTone = !live ? "failed" : refreshing ? "refreshing" : "live";
  const syncLabel = !live
    ? "Sync failed"
    : refreshing
      ? "Refreshing"
      : lastUpdatedAt
        ? `Live · ${lastUpdatedAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
        : "Live";

  useEffect(() => {
    if (isAuthLoading) return;
    if (!session) {
      setLocation("/admin/login?reason=unauthorized");
    }
  }, [isAuthLoading, session, setLocation]);

  if (isAuthLoading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] text-sm text-[var(--admin-muted)]">
        Checking kitchen access…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] text-sm text-[var(--admin-muted)]">
        Redirecting to staff login…
      </div>
    );
  }

  if (!gateReady) {
    return null;
  }

  return (
    <KitchenManagerShell
      syncLabel={syncLabel}
      syncTone={syncTone}
      refreshing={refreshing || loading}
      onRefresh={() => {
        void loadTickets({ soft: true });
        void loadOrderEnrichment();
      }}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <AdminSectionTitle
            eyebrow="Kitchen Manager"
            title="Kitchen operations board"
            description={`${roleLabel} · ${branchLabel}${kitchenOnly ? " · Branch scope enforced" : ""}`}
          />
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Stages map to live ticket statuses: New (queued) → Accepted → Preparing → Ready. Quality Check is{" "}
            <span className="font-semibold">UNAVAILABLE</span> (no backend status). Delay threshold{" "}
            {PREP_TARGET_MINUTES}m is <span className="font-semibold">DERIVED</span>, not a contractual SLA.
          </p>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            writeUrl({ search: searchDraft.trim() });
          }}
        >
          <label className="sr-only" htmlFor="kds-search">
            Search order number
          </label>
          <input
            id="kds-search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Order # / name"
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          />
          <select
            aria-label="Filter order type"
            value={urlState.orderType}
            onChange={(event) => writeUrl({ orderType: event.target.value })}
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="">All types</option>
            <option value="delivery">Delivery</option>
            <option value="pickup">Takeaway / pickup</option>
            <option value="dine-in">Dine-in</option>
          </select>
          <select
            aria-label="Filter source"
            value={urlState.source}
            onChange={(event) => writeUrl({ source: event.target.value })}
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="">All sources</option>
            <option value="website">Website</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="pos">POS</option>
            <option value="mobile">Mobile</option>
            <option value="admin">Admin / manual</option>
          </select>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              writeUrl({ search: "", orderType: "", source: "", status: "" });
            }}
            className="min-h-11 rounded-lg border border-[var(--admin-border)] px-4 text-sm font-semibold"
          >
            Reset
          </button>
        </form>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {loading && !tickets.length ? (
          Array.from({ length: 7 }).map((_, i) => <AdminKpiSkeleton key={i} />)
        ) : (
          <>
            <AdminKpiCard title="New (queued)" value={String(summary.queued)} source="LIVE" />
            <AdminKpiCard title="Accepted" value={String(summary.accepted)} source="LIVE" />
            <AdminKpiCard title="Preparing" value={String(summary.preparing)} source="LIVE" />
            <AdminKpiCard title="Ready" value={String(summary.ready)} source="LIVE" />
            <AdminKpiCard
              title="Delayed"
              value={String(summary.delayed)}
              source="DERIVED"
              detail={`≥ ${PREP_TARGET_MINUTES}m elapsed`}
            />
            <AdminKpiCard
              title="Avg prep (min)"
              value={summary.avgPrep != null ? String(summary.avgPrep) : "—"}
              source={summary.avgPrep != null ? "PARTIAL" : "UNAVAILABLE"}
              detail="Needs started_at + ready_at"
              unavailable={summary.avgPrep == null}
            />
            <AdminKpiCard
              title="Oldest active (min)"
              value={summary.oldest != null ? String(summary.oldest) : "—"}
              source="DERIVED"
              unavailable={summary.oldest == null}
            />
          </>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3 text-xs text-[var(--admin-muted)]">
        <p>
          <span className="font-semibold text-[var(--admin-ink)]">Quality Check:</span> UNAVAILABLE — not in
          kitchen ticket state machine.{" "}
          <span className="font-semibold text-[var(--admin-ink)]">Item prep toggles:</span> FOUNDATION —
          `is_completed` exists on rows but no PATCH API.{" "}
          <span className="font-semibold text-[var(--admin-ink)]">Stations / sound / shifts:</span> FOUNDATION
          or UNAVAILABLE.{" "}
          <span className="font-semibold text-[var(--admin-ink)]">Ready handoff:</span> ticket → ready mirrors
          order.status to ready (API-SUPPORTED); delivery/POS visibility depends on those modules reading ready
          orders.
        </p>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {actionError}
        </div>
      ) : null}

      {urlState.view === "board" ? (
        <KitchenBoard
          tickets={filteredTickets}
          enrichmentByOrderId={enrichmentByOrderId}
          loading={loading}
          error={error}
          nowMs={nowMs}
          busyTicketId={busyTicketId}
          canAct={allowed}
          selectedTicketId={selectedTicket?.id ?? null}
          onRetry={() => void loadTickets()}
          onView={openTicket}
          onTransition={onTransition}
        />
      ) : (
        <section aria-label="Kitchen queue list" className="space-y-3">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          ) : null}
          {loading ? <div className="h-40 animate-pulse rounded-2xl bg-[var(--admin-soft)]" /> : null}
          {!loading && filteredTickets.length === 0 ? (
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-8 text-center text-sm text-[var(--admin-muted)]">
              No tickets for this view and filters.
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredTickets.map((ticket) => (
              <KitchenCard
                key={ticket.id}
                ticket={ticket}
                enrichment={enrichmentByOrderId[ticket.orderId]}
                nowMs={nowMs}
                busy={busyTicketId === ticket.id}
                canAct={allowed}
                selected={selectedTicket?.id === ticket.id}
                onView={() => openTicket(ticket)}
                onTransition={(toStatus) => void onTransition(ticket, toStatus)}
              />
            ))}
          </div>
        </section>
      )}

      <KitchenDetailsPanel
        open={drawerOpen}
        ticket={selectedTicket}
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        busy={busyTicketId === selectedTicket?.id}
        canAct={allowed}
        onClose={closeDrawer}
        onRetryDetail={() => selectedTicket && void loadDetail(selectedTicket.orderId)}
        onTransition={(toStatus) => selectedTicket && void onTransition(selectedTicket, toStatus)}
      />
    </KitchenManagerShell>
  );
}

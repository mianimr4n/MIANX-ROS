import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { KitchenBoard } from "@/components/admin/kitchen/KitchenBoard";
import { type KitchenCardEnrichment } from "@/components/admin/kitchen/KitchenCard";
import { KitchenDetailsPanel } from "@/components/admin/kitchen/KitchenDetailsPanel";
import { KitchenFilters, type KitchenFilterState } from "@/components/admin/kitchen/KitchenFilters";
import { KitchenInsights, buildKitchenInsights } from "@/components/admin/kitchen/KitchenInsights";
import { KitchenKPIs, type KitchenKpiSnapshot } from "@/components/admin/kitchen/KitchenKPIs";
import { KitchenPerformance } from "@/components/admin/kitchen/KitchenPerformance";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import {
  canAccessAdminKitchen,
  canAccessAdminOrdersApi,
  primaryRoleLabel,
} from "@/lib/admin-access";
import {
  PREP_TARGET_MINUTES,
  PREP_WARN_MINUTES,
  averagePrepMinutes,
  currentShiftLabel,
  elapsedMinutes,
  isKarachiToday,
  ticketTimerStartIso,
  timerTone,
} from "@/lib/admin-kitchen";
import { getAdminOrder, listAdminOrders, type AdminOrderDetail, type AdminOrderListItem } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  listKitchenTickets,
  patchKitchenTicketStatus,
  type KitchenTicket,
} from "@/lib/ops-api";
import { AdminShell } from "./AdminShell";

function readFilters(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    status: params.get("status") ?? "",
    orderType: params.get("orderType") ?? "",
    priority: params.get("priority") ?? "",
    prepBand: params.get("prepBand") ?? "",
    search: params.get("q") ?? "",
    selected: params.get("selected") ?? "",
  };
}

function matchesSearch(ticket: KitchenTicket, enrichment: KitchenCardEnrichment | undefined, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    String(ticket.sequenceNumber ?? "").includes(needle) ||
    ticket.orderId.toLowerCase().includes(needle) ||
    ticket.id.toLowerCase().includes(needle) ||
    (enrichment?.orderNumber ?? "").toLowerCase().includes(needle) ||
    (enrichment?.contactName ?? "").toLowerCase().includes(needle)
  );
}

export default function AdminKitchen() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<KitchenTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const allowed = canAccessAdminKitchen({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const canEnrichOrders = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const filters: KitchenFilterState = {
    status: urlState.status,
    orderType: urlState.orderType,
    priority: urlState.priority,
    search: urlState.search,
    prepBand: urlState.prepBand,
  };

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.orderType) params.set("orderType", merged.orderType);
      if (merged.priority) params.set("priority", merged.priority);
      if (merged.prepBand) params.set("prepBand", merged.prepBand);
      if (merged.search) params.set("q", merged.search);
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/kitchen?${qs}` : "/admin/kitchen");
    },
    [setLocation, urlState],
  );

  const loadTickets = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !allowed) return;
    setLoading(true);
    try {
      const data = await listKitchenTickets(token, {
        branchId: branchIdFilter,
        limit: 100,
      });
      setTickets(data);
      setError(null);
      setLive(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load kitchen tickets");
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [allowed, branchIdFilter, session?.access_token]);

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
        setDetailError(null);
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
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    const poll = window.setInterval(() => {
      void loadTickets();
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
        notes: null,
      };
    }
    return map;
  }, [orders]);

  const activeTickets = useMemo(
    () => tickets.filter((t) => ["queued", "accepted", "preparing", "ready"].includes(t.status)),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    return activeTickets.filter((ticket) => {
      if (urlState.status && ticket.status !== urlState.status) return false;
      const enrichment = enrichmentByOrderId[ticket.orderId];
      if (urlState.orderType) {
        if (!enrichment?.orderType || enrichment.orderType !== urlState.orderType) return false;
      }
      const minutes = elapsedMinutes(ticketTimerStartIso(ticket), nowMs);
      if (urlState.priority === "normal" && ticket.priority > 0) return false;
      if (urlState.priority === "high" && ticket.priority <= 0) return false;
      if (urlState.priority === "delayed" && minutes < PREP_TARGET_MINUTES) return false;
      if (urlState.prepBand) {
        const tone = timerTone(minutes);
        if (tone !== urlState.prepBand) return false;
      }
      if (!matchesSearch(ticket, enrichment, urlState.search)) return false;
      return true;
    });
  }, [activeTickets, enrichmentByOrderId, nowMs, urlState]);

  const kpiSnapshot: KitchenKpiSnapshot = useMemo(() => {
    const waiting = activeTickets.filter((t) => t.status === "queued" || t.status === "accepted").length;
    const preparing = activeTickets.filter((t) => t.status === "preparing").length;
    const ready = activeTickets.filter((t) => t.status === "ready").length;
    const delayed = activeTickets.filter(
      (t) => elapsedMinutes(ticketTimerStartIso(t), nowMs) >= PREP_TARGET_MINUTES,
    ).length;
    const priorityOrders = activeTickets.filter((t) => t.priority > 0).length;
    const completedToday = tickets.filter(
      (t) => t.status === "completed" && isKarachiToday(t.completedAt),
    ).length;
    const avgPrepMinutes = averagePrepMinutes(tickets);
    return {
      waiting,
      preparing,
      ready,
      delayed,
      completedToday,
      priorityOrders,
      avgPrepMinutes,
    };
  }, [activeTickets, nowMs, tickets]);

  const insights = useMemo(
    () => buildKitchenInsights(filteredTickets, nowMs),
    [filteredTickets, nowMs],
  );

  async function onTransition(ticket: KitchenTicket, toStatus: string) {
    const token = session?.access_token;
    if (!token || busyTicketId) return;
    setBusyTicketId(ticket.id);
    try {
      await patchKitchenTicketStatus(token, ticket.id, toStatus);
      await loadTickets();
      if (selectedTicket?.id === ticket.id) {
        const refreshed = (await listKitchenTickets(token, { branchId: branchIdFilter, limit: 100 })).find(
          (t) => t.id === ticket.id,
        );
        if (refreshed) setSelectedTicket(refreshed);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Kitchen status update failed");
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

  return (
    <AdminShell title="Kitchen Display System">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Operations
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Kitchen Display System</h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {roleLabel} · {branchLabel} · {currentShiftLabel()}
            <span className="ml-2 rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Foundation shift label
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              live ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
            }`}
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${live ? "bg-emerald-600" : "bg-red-600"}`}
              aria-hidden
            />
            {live ? "Live" : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => {
              void loadTickets();
              void loadOrderEnrichment();
            }}
            className="min-h-12 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
          >
            Refresh
          </button>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              writeUrl({ search: searchDraft.trim() });
            }}
          >
            <label className="sr-only" htmlFor="kitchen-header-search">
              Kitchen search
            </label>
            <input
              id="kitchen-header-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search tickets"
              className="min-h-12 min-w-[10rem] rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
            />
            <button
              type="submit"
              className="min-h-12 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <KitchenKPIs snapshot={kpiSnapshot} loading={loading} />

      <KitchenFilters
        filters={filters}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onChange={(next) => writeUrl({ ...next })}
        onApplySearch={() => writeUrl({ search: searchDraft.trim() })}
        onReset={() => {
          setSearchDraft("");
          setLocation("/admin/kitchen");
        }}
      />

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
        onTransition={(ticket, toStatus) => void onTransition(ticket, toStatus)}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <KitchenPerformance snapshot={kpiSnapshot} />
        <KitchenInsights items={insights} />
      </div>

      <p className="mb-6 text-xs text-[var(--admin-muted)]">
        Timer colors: green &lt; {PREP_WARN_MINUTES}m · yellow {PREP_WARN_MINUTES}–{PREP_TARGET_MINUTES - 1}m ·
        red ≥ {PREP_TARGET_MINUTES}m. Elapsed from startedAt → acceptedAt → createdAt only — no fake countdowns.
        VIP / Urgent priority labels are not in the ticket API (Foundation).
      </p>

      <KitchenDetailsPanel
        open={drawerOpen}
        ticket={selectedTicket}
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        busy={busyTicketId === selectedTicket?.id}
        canAct={allowed}
        onClose={closeDrawer}
        onRetryDetail={() => {
          if (selectedTicket) void loadDetail(selectedTicket.orderId);
        }}
        onTransition={(toStatus) => {
          if (selectedTicket) void onTransition(selectedTicket, toStatus);
        }}
      />
    </AdminShell>
  );
}

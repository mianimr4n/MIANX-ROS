import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { DeliveryCards } from "@/components/admin/delivery/DeliveryCards";
import { DeliveryDrawer } from "@/components/admin/delivery/DeliveryDrawer";
import { DeliveryFilters, type DeliveryFilterState } from "@/components/admin/delivery/DeliveryFilters";
import { DeliveryInsights, buildDeliveryInsights } from "@/components/admin/delivery/DeliveryInsights";
import { DeliveryKPIs, type DeliveryKpiSnapshot } from "@/components/admin/delivery/DeliveryKPIs";
import {
  DeliveryMapFoundation,
  DeliveryPerformance,
  DeliveryRiderPanel,
} from "@/components/admin/delivery/DeliverySidePanels";
import { DispatchQueue, type DispatchEnrichment } from "@/components/admin/delivery/DispatchQueue";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import {
  canAccessAdminDelivery,
  canAccessAdminOrdersApi,
  canAssignDeliveries,
  canUpdateDeliveries,
  primaryRoleLabel,
} from "@/lib/admin-access";
import {
  DELIVERY_LATE_MINUTES,
  averageDeliveryMinutes,
  currentShiftLabel,
  deliveryTimerStartIso,
  elapsedMinutes,
  isKarachiToday,
  isOnlineRiderStatus,
} from "@/lib/admin-delivery";
import { getAdminOrder, listAdminOrders, type AdminOrderDetail } from "@/lib/admin-api";
import { useOperationalData } from "@/lib/op-status";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { ApiRequestError } from "@/lib/api";
import {
  assignDeliveryRider,
  listDeliveryAssignments,
  listRiderRoster,
  updateDeliveryStatus,
  type DeliveryAssignment,
  type RiderRosterItem,
} from "@/lib/ops-api";
import { AdminShell } from "./AdminShell";

function readFilters(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    status: params.get("status") ?? "",
    riderId: params.get("riderId") ?? "",
    search: params.get("q") ?? "",
    selected: params.get("selected") ?? "",
  };
}

function matchesSearch(row: DeliveryAssignment, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    row.orderNumber.toLowerCase().includes(needle) ||
    row.contactName.toLowerCase().includes(needle) ||
    row.contactPhone.toLowerCase().includes(needle) ||
    row.deliveryAddress.toLowerCase().includes(needle) ||
    (row.riderName ?? "").toLowerCase().includes(needle)
  );
}

export default function AdminDelivery() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel, allowedBranches } = useAdminBranch();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedRiderByDelivery, setSelectedRiderByDelivery] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<DeliveryAssignment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const principal = { roles, permissions, isSuperAdmin };
  const allowed = canAccessAdminDelivery(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const canAssign = canAssignDeliveries(principal);
  const canUpdate = canUpdateDeliveries(principal);
  const canEnrichOrders = canAccessAdminOrdersApi(principal);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const filters: DeliveryFilterState = {
    status: urlState.status,
    riderId: urlState.riderId,
    search: urlState.search,
  };

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.riderId) params.set("riderId", merged.riderId);
      if (merged.search) params.set("q", merged.search);
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/delivery?${qs}` : "/admin/delivery");
    },
    [setLocation, urlState],
  );

  const token = session?.access_token;

  const assignmentsOp = useOperationalData(
    ({ signal, correlationId }) =>
      listDeliveryAssignments(
        token!,
        { branchId: branchIdFilter, status: urlState.status || undefined, limit: 100 },
        { signal, correlationId },
      ),
    [token, branchIdFilter, urlState.status],
    {
      enabled: Boolean(token) && allowed && gateReady,
      pollMs: 8_000,
      isEmpty: (data) => data.length === 0,
    },
  );

  const ridersOp = useOperationalData(
    ({ signal, correlationId }) =>
      listRiderRoster(token!, { branchId: branchIdFilter }, { signal, correlationId }),
    [token, branchIdFilter],
    { enabled: Boolean(token) && canAssign && gateReady },
  );

  const enrichOp = useOperationalData(
    ({ signal, correlationId }) =>
      listAdminOrders(
        token!,
        { branchId: branchIdFilter, orderType: "delivery", limit: 100, offset: 0 },
        { signal, correlationId },
      ),
    [token, branchIdFilter],
    { enabled: Boolean(token) && canEnrichOrders && gateReady },
  );

  const assignments = assignmentsOp.data ?? [];
  const riders = ridersOp.data ?? [];
  const ridersLive = ridersOp.state === "LIVE" || ridersOp.state === "EMPTY";
  const orders = enrichOp.data?.orders ?? [];
  const loading = assignmentsOp.state === "LOADING";
  // Inline error only when nothing was ever loaded; STALE keeps the queue visible.
  const error = assignmentsOp.data == null ? assignmentsOp.error : actionError;
  const live = assignmentsOp.state === "LIVE" || assignmentsOp.state === "EMPTY";

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
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    setSearchDraft(urlState.search);
  }, [urlState.search]);

  const enrichmentByOrderId = useMemo(() => {
    const map: Record<string, DispatchEnrichment> = {};
    for (const order of orders) {
      map[order.id] = {
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
      };
    }
    return map;
  }, [orders]);

  const branchLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const branch of allowedBranches) {
      map[branch.id] = branch.shortName || branch.name;
    }
    return map;
  }, [allowedBranches]);

  const filtered = useMemo(() => {
    return assignments.filter((row) => {
      if (urlState.riderId === "unassigned" && row.riderId) return false;
      if (urlState.riderId && urlState.riderId !== "unassigned" && row.riderId !== urlState.riderId) {
        return false;
      }
      if (!matchesSearch(row, urlState.search)) return false;
      return true;
    });
  }, [assignments, urlState.riderId, urlState.search]);

  const waitingRows = useMemo(
    () => filtered.filter((row) => row.status === "pending"),
    [filtered],
  );
  const activeRows = useMemo(
    () => filtered.filter((row) => row.status === "assigned" || row.status === "picked-up"),
    [filtered],
  );

  const kpiSnapshot: DeliveryKpiSnapshot = useMemo(() => {
    const waiting = assignments.filter((a) => a.status === "pending").length;
    const assigned = assignments.filter((a) => a.status === "assigned").length;
    const outForDelivery = assignments.filter((a) => a.status === "picked-up").length;
    const deliveredToday = assignments.filter(
      (a) => a.status === "delivered" && isKarachiToday(a.deliveredAt),
    ).length;
    const failed = assignments.filter((a) => a.status === "failed").length;
    const late = assignments
      .filter((a) => a.status === "pending" || a.status === "assigned" || a.status === "picked-up")
      .filter((a) => elapsedMinutes(deliveryTimerStartIso(a), nowMs) >= DELIVERY_LATE_MINUTES).length;
    const onlineRiders = ridersLive
      ? riders.filter((rider) => isOnlineRiderStatus(rider.status)).length
      : null;
    return {
      waiting,
      assigned,
      outForDelivery,
      deliveredToday,
      failed,
      late,
      onlineRiders,
      avgDeliveryMinutes: averageDeliveryMinutes(assignments),
    };
  }, [assignments, nowMs, riders, ridersLive]);

  const insights = useMemo(
    () => buildDeliveryInsights(filtered, kpiSnapshot.deliveredToday),
    [filtered, kpiSnapshot.deliveredToday],
  );

  async function onAssign(deliveryId: string) {
    const token = session?.access_token;
    const riderId = selectedRiderByDelivery[deliveryId];
    if (!token || !riderId || busyId) {
      if (!riderId) setActionError("Select a rider first.");
      return;
    }
    setBusyId(deliveryId);
    try {
      await assignDeliveryRider(token, deliveryId, riderId);
      setActionError(null);
      assignmentsOp.retry();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Assign failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onStatus(deliveryId: string, status: "picked-up" | "delivered") {
    const token = session?.access_token;
    if (!token || busyId) return;
    setBusyId(deliveryId);
    try {
      await updateDeliveryStatus(token, deliveryId, status);
      setActionError(null);
      assignmentsOp.retry();
      if (selected?.id === deliveryId) {
        const refreshed = (
          await listDeliveryAssignments(token, { branchId: branchIdFilter, limit: 100 })
        ).find((row) => row.id === deliveryId);
        if (refreshed) setSelected(refreshed);
      }
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  function openDrawer(row: DeliveryAssignment) {
    setSelected(row);
    setDrawerOpen(true);
    writeUrl({ selected: row.id });
    void loadDetail(row.orderId);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    setDetail(null);
    writeUrl({ selected: "" });
  }

  useEffect(() => {
    if (!urlState.selected || assignments.length === 0) return;
    const row = assignments.find((item) => item.id === urlState.selected);
    if (row) {
      setSelected(row);
      setDrawerOpen(true);
      void loadDetail(row.orderId);
    }
  }, [urlState.selected, assignments, loadDetail]);

  return (
    <AdminShell title="Delivery Management">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Operations
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Delivery Management</h2>
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
            <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-600" : "bg-red-600"}`} aria-hidden />
            {assignmentsOp.state === "STALE" ? "Stale" : live ? "Live" : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => {
              assignmentsOp.retry();
              ridersOp.retry();
              enrichOp.retry();
            }}
            className="min-h-11 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled
            className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]"
            title="Export arrives with Reports"
          >
            Export · Foundation
          </button>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              writeUrl({ search: searchDraft.trim() });
            }}
          >
            <label className="sr-only" htmlFor="delivery-header-search">
              Search delivery
            </label>
            <input
              id="delivery-header-search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search delivery"
              className="min-h-11 min-w-[10rem] rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm"
            />
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <OperationalStatusBanner
        state={assignmentsOp.state}
        error={assignmentsOp.error}
        lastSuccessAt={assignmentsOp.lastSuccessAt}
        onRetry={assignmentsOp.retry}
        correlationId={assignmentsOp.correlationId}
        showTechnicalDetail={isSuperAdmin}
        className="mb-4"
      />

      <DeliveryKPIs snapshot={kpiSnapshot} loading={loading} ridersLive={ridersLive} />

      <DeliveryFilters
        filters={filters}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onChange={(next) => writeUrl({ ...next })}
        onApplySearch={() => writeUrl({ search: searchDraft.trim() })}
        onReset={() => {
          setSearchDraft("");
          setLocation("/admin/delivery");
        }}
        riders={riders}
        ridersLive={ridersLive}
      />

      <DispatchQueue
        rows={waitingRows}
        enrichmentByOrderId={enrichmentByOrderId}
        loading={loading}
        error={error}
        riders={riders}
        canAssign={canAssign}
        selectedRiderByDelivery={selectedRiderByDelivery}
        busyId={busyId}
        onSelectRider={(deliveryId, riderId) =>
          setSelectedRiderByDelivery((prev) => ({ ...prev, [deliveryId]: riderId }))
        }
        onAssign={(deliveryId) => void onAssign(deliveryId)}
        onView={openDrawer}
        onRetry={assignmentsOp.retry}
      />

      <DeliveryCards
        rows={activeRows}
        enrichmentByOrderId={enrichmentByOrderId}
        branchLabelById={branchLabelById}
        nowMs={nowMs}
        busyId={busyId}
        canUpdate={canUpdate}
        canAssign={canAssign}
        onView={openDrawer}
        onPickedUp={(id) => void onStatus(id, "picked-up")}
        onDelivered={(id) => void onStatus(id, "delivered")}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <DeliveryPerformance snapshot={kpiSnapshot} />
          <DeliveryMapFoundation />
          <DeliveryRiderPanel riders={riders} assignments={assignments} live={ridersLive} />
        </div>
        <DeliveryInsights items={insights} />
      </div>

      <DeliveryDrawer
        open={drawerOpen}
        assignment={selected}
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        busy={busyId === selected?.id}
        canUpdate={canUpdate}
        onClose={closeDrawer}
        onRetryDetail={() => {
          if (selected) void loadDetail(selected.orderId);
        }}
        onPickedUp={() => {
          if (selected) void onStatus(selected.id, "picked-up");
        }}
        onDelivered={() => {
          if (selected) void onStatus(selected.id, "delivered");
        }}
      />
    </AdminShell>
  );
}

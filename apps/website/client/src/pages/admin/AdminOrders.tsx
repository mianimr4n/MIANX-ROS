import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { OrderAIInsights, buildOrderInsights } from "@/components/admin/orders/OrderAIInsights";
import { OrderDrawer } from "@/components/admin/orders/OrderDrawer";
import { OrderFilters, type OrderFilterState } from "@/components/admin/orders/OrderFilters";
import { ORDER_STATUSES } from "@/lib/admin-order-format";
import { sanitizeStatusFilter } from "@/lib/kpi-drilldown/registry";
import { OrderGrid, type OrderSortKey } from "@/components/admin/orders/OrderGrid";
import { OrderKPIs, type OrderKpiSnapshot } from "@/components/admin/orders/OrderKPIs";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { canAccessAdminOrdersApi, canManageOrders, primaryRoleLabel } from "@/lib/admin-access";
import {
  fetchAdminOperationsDashboard,
  getAdminOrder,
  listAdminOrders,
  transitionAdminOrder,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminOrderTransitionAction,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import {
  OperationsDeferredNote,
  OperationsWorkspaceHeader,
} from "@/components/admin/operations/OperationsWorkspaceHeader";
import { AdminShell } from "./AdminShell";

const PAGE_SIZE = 20;

function readFilters(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    status: sanitizeStatusFilter(params.get("status"), ORDER_STATUSES),
    orderType: params.get("orderType") ?? "",
    orderSource: params.get("orderSource") ?? "",
    orderNumber: params.get("orderNumber") ?? "",
    offset: Math.max(0, Number(params.get("offset") ?? "0") || 0),
    selected: params.get("selected") ?? "",
  };
}

function sortOrders(orders: AdminOrderListItem[], key: OrderSortKey, dir: "asc" | "desc") {
  const sorted = [...orders].sort((a, b) => {
    let cmp = 0;
    if (key === "createdAt") cmp = a.createdAt.localeCompare(b.createdAt);
    else if (key === "orderNumber") cmp = a.orderNumber.localeCompare(b.orderNumber);
    else if (key === "status") cmp = a.status.localeCompare(b.status);
    else cmp = a.totalAmount - b.totalAmount;
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function currentShiftLabel(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Karachi",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value ?? "12",
  );
  if (hour < 16) return "Day shift (display only)";
  return "Evening shift (display only)";
}

export default function AdminOrders() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);

  const [orderNumberDraft, setOrderNumberDraft] = useState(urlState.orderNumber);
  const [sortKey, setSortKey] = useState<OrderSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [drawerOpen, setDrawerOpen] = useState(Boolean(urlState.selected));
  const [selectedId, setSelectedId] = useState<string | null>(urlState.selected || null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const allowed = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const canTransition = canManageOrders({ roles, permissions, isSuperAdmin });
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const filters: OrderFilterState = {
    status: urlState.status,
    orderType: urlState.orderType,
    orderSource: urlState.orderSource,
    orderNumber: urlState.orderNumber,
  };

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.orderType) params.set("orderType", merged.orderType);
      if (merged.orderSource) params.set("orderSource", merged.orderSource);
      if (merged.orderNumber) params.set("orderNumber", merged.orderNumber);
      if (merged.offset > 0) params.set("offset", String(merged.offset));
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/orders?${qs}` : "/admin/orders");
    },
    [setLocation, urlState],
  );

  const token = session?.access_token;

  const listOp = useOperationalData(
    ({ signal, correlationId }) =>
      listAdminOrders(
        token!,
        {
          branchId: branchIdFilter,
          status: urlState.status || undefined,
          orderType: urlState.orderType || undefined,
          orderSource: urlState.orderSource || undefined,
          orderNumber: urlState.orderNumber || undefined,
          limit: PAGE_SIZE,
          offset: urlState.offset,
        },
        { signal, correlationId },
      ),
    [
      token,
      branchIdFilter,
      urlState.status,
      urlState.orderType,
      urlState.orderSource,
      urlState.orderNumber,
      urlState.offset,
    ],
    {
      enabled: Boolean(token) && allowed && gateReady,
      isEmpty: (result) => result.orders.length === 0,
    },
  );

  const kpiOp = useOperationalData(
    ({ signal, correlationId }) =>
      fetchAdminOperationsDashboard(token!, { branchId: branchIdFilter }, { signal, correlationId }),
    [token, branchIdFilter],
    { enabled: Boolean(token) && allowed && gateReady },
  );

  const orders = listOp.data?.orders ?? [];
  const total = listOp.data?.pagination.total ?? 0;
  const loading = listOp.state === "LOADING";
  // Inline grid error only when there is no data at all; STALE keeps rows visible.
  const error = listOp.data == null ? listOp.error : null;
  const statusCounts = kpiOp.data?.statusCounts ?? {};
  const kpiSnapshot: OrderKpiSnapshot | null = kpiOp.data
    ? {
        todayOrders: kpiOp.data.kpis.todayOrders,
        pending: kpiOp.data.statusCounts.pending ?? 0,
        preparing: kpiOp.data.statusCounts.preparing ?? 0,
        ready: kpiOp.data.statusCounts.ready ?? 0,
        dispatched: kpiOp.data.statusCounts.dispatched ?? 0,
        completed: kpiOp.data.statusCounts.completed ?? 0,
        cancelled: kpiOp.data.statusCounts.cancelled ?? 0,
      }
    : null;
  const kpiLoading = kpiOp.state === "LOADING";

  const loadDetail = useCallback(
    async (orderId: string) => {
      const token = session?.access_token;
      if (!token) return;
      setDetailLoading(true);
      try {
        const data = await getAdminOrder(token, orderId);
        setDetail(data);
        setDetailError(null);
      } catch (err) {
        setDetail(null);
        setDetailError(err instanceof ApiRequestError ? err.message : "Failed to load order");
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    setOrderNumberDraft(urlState.orderNumber);
  }, [urlState.orderNumber]);

  useEffect(() => {
    if (urlState.selected) {
      setSelectedId(urlState.selected);
      setDrawerOpen(true);
      void loadDetail(urlState.selected);
    }
  }, [urlState.selected, loadDetail]);

  const sortedOrders = useMemo(() => sortOrders(orders, sortKey, sortDir), [orders, sortKey, sortDir]);
  const insights = useMemo(
    () => buildOrderInsights(orders, statusCounts),
    [orders, statusCounts],
  );

  function onSort(key: OrderSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "createdAt" ? "desc" : "asc");
  }

  function openDrawer(orderId: string) {
    setSelectedId(orderId);
    setDrawerOpen(true);
    writeUrl({ selected: orderId });
    void loadDetail(orderId);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedId(null);
    setDetail(null);
    writeUrl({ selected: "" });
  }

  async function onTransition(action: AdminOrderTransitionAction, needsReason?: boolean) {
    const token = session?.access_token;
    if (!token || !selectedId || !canTransition) return;
    setActionBusy(true);
    try {
      await transitionAdminOrder(
        token,
        selectedId,
        action,
        needsReason ? { reasonCode: "staff_cancelled" } : undefined,
      );
      listOp.retry();
      kpiOp.retry();
      await loadDetail(selectedId);
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : "Transition failed");
    } finally {
      setActionBusy(false);
    }
  }

  const pageStart = total === 0 ? 0 : urlState.offset + 1;
  const pageEnd = urlState.offset + orders.length;

  return (
    <AdminShell title="Orders Management">
      <OperationsWorkspaceHeader
        eyebrow="Operations"
        title="Orders Management"
        description={`Review and advance orders in branch scope. ${currentShiftLabel()} is display-only.`}
        branchLabel={branchLabel}
        roleLabel={roleLabel}
        maturity="PARTIAL_LIVE"
        primaryTask="Triage new, active, and problem orders"
        liveLabel={listOp.state === "STALE" ? "Stale" : listOp.state === "LIVE" ? "Live queue" : undefined}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                listOp.retry();
                kpiOp.retry();
              }}
              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
            >
              Refresh
            </button>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                writeUrl({ orderNumber: orderNumberDraft.trim(), offset: 0 });
              }}
            >
              <label className="sr-only" htmlFor="orders-header-search">
                Search orders
              </label>
              <input
                id="orders-header-search"
                value={orderNumberDraft}
                onChange={(event) => setOrderNumberDraft(event.target.value)}
                placeholder="Search order #"
                className="min-w-[10rem] rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
              >
                Search
              </button>
            </form>
          </>
        }
      />

      <OperationsDeferredNote
        summary="Deferred order capabilities"
        items={["Bulk export / reports download", "Advanced channel and date-range filters beyond current controls"]}
      />

      <OperationalStatusBanner
        state={listOp.state}
        error={listOp.error}
        lastSuccessAt={listOp.lastSuccessAt}
        onRetry={listOp.retry}
        correlationId={listOp.correlationId}
        showTechnicalDetail={isSuperAdmin}
        className="mb-4"
      />

      <OrderKPIs snapshot={kpiSnapshot} loading={kpiLoading} />

      <OrderFilters
        filters={filters}
        orderNumberDraft={orderNumberDraft}
        onOrderNumberDraftChange={setOrderNumberDraft}
        onChange={(next) => writeUrl({ ...next, offset: 0 })}
        onApplySearch={() => writeUrl({ orderNumber: orderNumberDraft.trim(), offset: 0 })}
        onReset={() => {
          setOrderNumberDraft("");
          setLocation("/admin/orders");
        }}
      />

      {filters.status || filters.orderType || filters.orderSource || filters.orderNumber ? (
        <p
          className="mb-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          role="status"
          data-testid="orders-active-filters"
        >
          Active filters:
          {filters.status ? ` status=${filters.status}` : ""}
          {filters.orderType ? ` type=${filters.orderType}` : ""}
          {filters.orderSource ? ` source=${filters.orderSource}` : ""}
          {filters.orderNumber ? ` order#=${filters.orderNumber}` : ""}
          . Branch scope follows the Owner branch selector.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <OrderGrid
          orders={sortedOrders}
          loading={loading}
          error={error}
          selectedId={selectedId}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onRetry={listOp.retry}
          onView={openDrawer}
          onOpenFullPage={(orderId) => setLocation(`/admin/orders/${orderId}`)}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={total}
          canPrev={urlState.offset > 0}
          canNext={urlState.offset + PAGE_SIZE < total}
          onPrev={() => writeUrl({ offset: Math.max(0, urlState.offset - PAGE_SIZE) })}
          onNext={() => writeUrl({ offset: urlState.offset + PAGE_SIZE })}
        />
        <OrderAIInsights items={insights} />
      </div>

      <OrderDrawer
        open={drawerOpen}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        busy={actionBusy}
        canTransition={canTransition}
        onClose={closeDrawer}
        onRetry={() => {
          if (selectedId) void loadDetail(selectedId);
        }}
        onTransition={onTransition}
      />
    </AdminShell>
  );
}

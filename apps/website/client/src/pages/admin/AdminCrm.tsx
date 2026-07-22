import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { CRMHeader } from "@/components/admin/crm/CRMHeader";
import { CustomerDrawer } from "@/components/admin/crm/CustomerDrawer";
import { CustomerFilters, type CustomerFilterState } from "@/components/admin/crm/CustomerFilters";
import { CustomerInsights, buildCrmInsights } from "@/components/admin/crm/CustomerInsights";
import { CustomerKPIs } from "@/components/admin/crm/CustomerKPIs";
import { CustomerTable, type CrmSortKey } from "@/components/admin/crm/CustomerTable";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminOrdersApi, primaryRoleLabel } from "@/lib/admin-access";
import {
  aggregateCustomersFromOrders,
  buildCrmKpis,
  daysSince,
  normalizePhoneKey,
  type CrmCustomer,
} from "@/lib/admin-crm";
import {
  getAdminOrder,
  listAdminOrders,
  type AdminOrderDetail,
  type AdminOrderListItem,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

const PAGE_SIZE = 20;
const ORDER_FETCH_LIMIT = 100;

function readFilters(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    status: params.get("status") ?? "",
    repeatOnly: params.get("repeat") === "1",
    search: params.get("q") ?? "",
    offset: Math.max(0, Number(params.get("offset") ?? "0") || 0),
    selected: params.get("selected") ?? "",
  };
}

function sortCustomers(rows: CrmCustomer[], key: CrmSortKey, dir: "asc" | "desc") {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "displayName") cmp = a.displayName.localeCompare(b.displayName);
    else if (key === "orderCount") cmp = a.orderCount - b.orderCount;
    else if (key === "lifetimeSpend") cmp = a.lifetimeSpend - b.lifetimeSpend;
    else if (key === "averageSpend") cmp = a.averageSpend - b.averageSpend;
    else cmp = a.lastOrderAt.localeCompare(b.lastOrderAt);
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export default function AdminCrm() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel, allowedBranches } = useAdminBranch();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [sortKey, setSortKey] = useState<CrmSortKey>("lastOrderAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<CrmCustomer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const allowed = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const filters: CustomerFilterState = {
    status: urlState.status,
    repeatOnly: urlState.repeatOnly,
    search: urlState.search,
  };

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.repeatOnly) params.set("repeat", "1");
      if (merged.search) params.set("q", merged.search);
      if (merged.offset > 0) params.set("offset", String(merged.offset));
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/crm?${qs}` : "/admin/crm");
    },
    [setLocation, urlState],
  );

  const loadOrders = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !allowed) return;
    setLoading(true);
    try {
      const looksLikeOrderNumber = /^[A-Za-z0-9-]{4,}$/.test(urlState.search.trim()) && /\d/.test(urlState.search);
      const result = await listAdminOrders(token, {
        branchId: branchIdFilter,
        orderNumber: looksLikeOrderNumber ? urlState.search.trim() : undefined,
        limit: ORDER_FETCH_LIMIT,
        offset: 0,
      });
      setOrders(result.orders);
      setError(null);
      setLive(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load customer order window");
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [allowed, branchIdFilter, session?.access_token, urlState.search]);

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
        setDetailError(err instanceof ApiRequestError ? err.message : "Failed to load order detail");
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    if (!gateReady) return;
    void loadOrders();
  }, [gateReady, loadOrders]);

  useEffect(() => {
    setSearchDraft(urlState.search);
  }, [urlState.search]);

  const customers = useMemo(() => aggregateCustomersFromOrders(orders), [orders]);
  const kpis = useMemo(() => buildCrmKpis(customers), [customers]);
  const insights = useMemo(() => buildCrmInsights(customers), [customers]);

  const branchLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const branch of allowedBranches) {
      map[branch.id] = branch.shortName || branch.name;
    }
    return map;
  }, [allowedBranches]);

  const filtered = useMemo(() => {
    const needle = urlState.search.trim().toLowerCase();
    const phoneNeedle = normalizePhoneKey(urlState.search);
    return customers.filter((customer) => {
      if (urlState.repeatOnly && customer.orderCount < 2) return false;
      if (urlState.status === "active" && daysSince(customer.lastOrderAt) > 30) return false;
      if (urlState.status === "inactive" && daysSince(customer.lastOrderAt) <= 30) return false;
      if (!needle) return true;
      return (
        customer.displayName.toLowerCase().includes(needle) ||
        customer.phone.toLowerCase().includes(needle) ||
        normalizePhoneKey(customer.phone).includes(phoneNeedle) ||
        customer.lastOrderNumber.toLowerCase().includes(needle) ||
        customer.id.includes(needle) ||
        customer.orders.some((o) => o.orderNumber.toLowerCase().includes(needle))
      );
    });
  }, [customers, urlState.repeatOnly, urlState.search, urlState.status]);

  const sorted = useMemo(() => sortCustomers(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);
  const pageRows = useMemo(
    () => sorted.slice(urlState.offset, urlState.offset + PAGE_SIZE),
    [sorted, urlState.offset],
  );

  function onSort(key: CrmSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "displayName" ? "asc" : "desc");
  }

  function openCustomer(customer: CrmCustomer) {
    setSelected(customer);
    setDrawerOpen(true);
    writeUrl({ selected: customer.id });
    void loadDetail(customer.lastOrderId);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    setDetail(null);
    writeUrl({ selected: "" });
  }

  useEffect(() => {
    if (!urlState.selected || customers.length === 0) return;
    const match = customers.find((c) => c.id === urlState.selected);
    if (match) {
      setSelected(match);
      setDrawerOpen(true);
      void loadDetail(match.lastOrderId);
    }
  }, [urlState.selected, customers, loadDetail]);

  const pageStart = sorted.length === 0 ? 0 : urlState.offset + 1;
  const pageEnd = urlState.offset + pageRows.length;

  return (
    <AdminShell title="Customer Relationship Management">
      <CRMHeader
        branchLabel={branchLabel}
        roleLabel={roleLabel}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onSearch={() => writeUrl({ search: searchDraft.trim(), offset: 0 })}
        onRefresh={() => void loadOrders()}
        live={live}
      />

      <CustomerKPIs
        snapshot={kpis}
        loading={loading}
        windowNote={`Derived from up to ${ORDER_FETCH_LIMIT} orders in the current branch scope.`}
      />

      <CustomerFilters
        filters={filters}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onChange={(next) =>
          writeUrl({
            status: next.status ?? urlState.status,
            repeatOnly: next.repeatOnly ?? urlState.repeatOnly,
            search: next.search ?? urlState.search,
            offset: 0,
          })
        }
        onApplySearch={() => writeUrl({ search: searchDraft.trim(), offset: 0 })}
        onReset={() => {
          setSearchDraft("");
          setLocation("/admin/crm");
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <CustomerTable
          customers={pageRows}
          loading={loading}
          error={error}
          selectedId={selected?.id ?? null}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onRetry={() => void loadOrders()}
          onView={openCustomer}
          onViewOrders={(customer) =>
            setLocation(`/admin/orders?orderNumber=${encodeURIComponent(customer.lastOrderNumber)}`)
          }
          onCreatePos={() => setLocation("/admin/pos")}
          branchLabelById={branchLabelById}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={sorted.length}
          canPrev={urlState.offset > 0}
          canNext={urlState.offset + PAGE_SIZE < sorted.length}
          onPrev={() => writeUrl({ offset: Math.max(0, urlState.offset - PAGE_SIZE) })}
          onNext={() => writeUrl({ offset: urlState.offset + PAGE_SIZE })}
        />
        <CustomerInsights items={insights} />
      </div>

      <CustomerDrawer
        open={drawerOpen}
        customer={selected}
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        branchLabelById={branchLabelById}
        onClose={closeDrawer}
        onRetryDetail={() => {
          if (selected) void loadDetail(selected.lastOrderId);
        }}
        onCreatePos={() => setLocation("/admin/pos")}
      />
    </AdminShell>
  );
}

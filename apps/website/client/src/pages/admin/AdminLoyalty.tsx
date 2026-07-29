import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { LoyaltyActivity } from "@/components/admin/loyalty/LoyaltyActivity";
import { LoyaltyCustomerDrawer } from "@/components/admin/loyalty/LoyaltyCustomerDrawer";
import { LoyaltyCustomerTable, type LoyaltySortKey } from "@/components/admin/loyalty/LoyaltyCustomerTable";
import { LoyaltyFilters, type LoyaltyFilterState } from "@/components/admin/loyalty/LoyaltyFilters";
import { LoyaltyHeader } from "@/components/admin/loyalty/LoyaltyHeader";
import { LoyaltyInsights } from "@/components/admin/loyalty/LoyaltyInsights";
import { LoyaltyKPIs } from "@/components/admin/loyalty/LoyaltyKPIs";
import { LoyaltyProgramBanner } from "@/components/admin/loyalty/LoyaltyProgramBanner";
import { RewardCatalogue } from "@/components/admin/loyalty/RewardCatalogue";
import { TierOverview } from "@/components/admin/loyalty/TierOverview";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminLoyalty, primaryRoleLabel } from "@/lib/admin-access";
import {
  aggregateCustomersFromOrders,
  daysSince,
  normalizePhoneKey,
  type CrmCustomer,
} from "@/lib/admin-crm";
import {
  buildLoyaltyActivity,
  buildLoyaltyInsights,
  buildLoyaltyKpis,
} from "@/lib/admin-loyalty";
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
const HIGH_VALUE_THRESHOLD = 5000;

function readFilters(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    status: params.get("status") ?? "",
    repeatOnly: params.get("repeat") === "1",
    highValueOnly: params.get("high") === "1",
    search: params.get("q") ?? "",
    offset: Math.max(0, Number(params.get("offset") ?? "0") || 0),
    selected: params.get("selected") ?? "",
  };
}

function sortCustomers(rows: CrmCustomer[], key: LoyaltySortKey, dir: "asc" | "desc") {
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

export default function AdminLoyalty() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel, allowedBranches } = useAdminBranch();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlState = useMemo(() => readFilters(search), [search]);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [sortKey, setSortKey] = useState<LoyaltySortKey>("lastOrderAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<CrmCustomer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const allowed = canAccessAdminLoyalty({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const filters: LoyaltyFilterState = {
    status: urlState.status,
    repeatOnly: urlState.repeatOnly,
    highValueOnly: urlState.highValueOnly,
    search: urlState.search,
  };

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.repeatOnly) params.set("repeat", "1");
      if (merged.highValueOnly) params.set("high", "1");
      if (merged.search) params.set("q", merged.search);
      if (merged.offset > 0) params.set("offset", String(merged.offset));
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/loyalty?${qs}` : "/admin/loyalty");
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
      setOrders([]);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load loyalty order window");
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
  const kpis = useMemo(() => buildLoyaltyKpis(customers), [customers]);

  const branchLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const branch of allowedBranches) {
      map[branch.id] = branch.shortName || branch.name;
    }
    return map;
  }, [allowedBranches]);

  const insights = useMemo(() => buildLoyaltyInsights(customers, branchLabelById), [customers, branchLabelById]);
  const activity = useMemo(() => buildLoyaltyActivity(orders), [orders]);

  const filtered = useMemo(() => {
    const needle = urlState.search.trim().toLowerCase();
    const phoneNeedle = normalizePhoneKey(urlState.search);
    return customers.filter((customer) => {
      if (urlState.repeatOnly && customer.orderCount < 2) return false;
      if (urlState.highValueOnly && customer.lifetimeSpend < HIGH_VALUE_THRESHOLD) return false;
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
  }, [customers, urlState.highValueOnly, urlState.repeatOnly, urlState.search, urlState.status]);

  const sorted = useMemo(() => sortCustomers(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);
  const pageRows = useMemo(
    () => sorted.slice(urlState.offset, urlState.offset + PAGE_SIZE),
    [sorted, urlState.offset],
  );

  function onSort(key: LoyaltySortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "displayName" ? "asc" : "desc");
  }

  function openCustomer(customer: CrmCustomer, trigger?: HTMLButtonElement | null) {
    drawerTriggerRef.current = trigger ?? null;
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
    <AdminShell title="Loyalty & Rewards">
      <LoyaltyHeader
        branchLabel={branchLabel}
        roleLabel={roleLabel}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onSearch={() => writeUrl({ search: searchDraft.trim(), offset: 0 })}
        onRefresh={() => void loadOrders()}
        live={live}
      />

      <LoyaltyProgramBanner />

      <LoyaltyKPIs
        snapshot={live ? kpis : null}
        loading={loading}
        windowNote={`Derived from up to ${ORDER_FETCH_LIMIT} orders in the current branch scope.`}
      />

      <LoyaltyFilters
        filters={filters}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onChange={(next) =>
          writeUrl({
            status: next.status ?? urlState.status,
            repeatOnly: next.repeatOnly ?? urlState.repeatOnly,
            highValueOnly: next.highValueOnly ?? urlState.highValueOnly,
            search: next.search ?? urlState.search,
            offset: 0,
          })
        }
        onApplySearch={() => writeUrl({ search: searchDraft.trim(), offset: 0 })}
        onReset={() => {
          setSearchDraft("");
          setLocation("/admin/loyalty");
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LoyaltyCustomerTable
          customers={pageRows}
          loading={loading}
          error={error}
          selectedId={selected?.id ?? null}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onRetry={() => void loadOrders()}
          onView={openCustomer}
          branchLabelById={branchLabelById}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={sorted.length}
          canPrev={urlState.offset > 0}
          canNext={urlState.offset + PAGE_SIZE < sorted.length}
          onPrev={() => writeUrl({ offset: Math.max(0, urlState.offset - PAGE_SIZE) })}
          onNext={() => writeUrl({ offset: urlState.offset + PAGE_SIZE })}
        />
        <LoyaltyInsights items={insights} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RewardCatalogue />
        <TierOverview />
      </div>

      <div className="mt-6">
        <LoyaltyActivity events={activity} branchLabelById={branchLabelById} loading={loading} />
      </div>

      <LoyaltyCustomerDrawer
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
        returnFocusRef={drawerTriggerRef}
      />
    </AdminShell>
  );
}

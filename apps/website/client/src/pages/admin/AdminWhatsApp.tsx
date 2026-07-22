import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";

import { ConversationWorkspace } from "@/components/admin/whatsapp/ConversationWorkspace";
import { CustomerContextPanel } from "@/components/admin/whatsapp/CustomerContextPanel";
import { LinkedOrderPanel } from "@/components/admin/whatsapp/LinkedOrderPanel";
import {
  WhatsAppFoundationPanel,
  WhatsAppIntegrationBanner,
} from "@/components/admin/whatsapp/WhatsAppIntegrationBanner";
import { WhatsAppActivity } from "@/components/admin/whatsapp/WhatsAppActivity";
import { WhatsAppFilters, type WhatsAppFilterState } from "@/components/admin/whatsapp/WhatsAppFilters";
import { WhatsAppHeader } from "@/components/admin/whatsapp/WhatsAppHeader";
import { WhatsAppInsights } from "@/components/admin/whatsapp/WhatsAppInsights";
import { WhatsAppKPIs } from "@/components/admin/whatsapp/WhatsAppKPIs";
import { WhatsAppOrderBuilder } from "@/components/admin/whatsapp/WhatsAppOrderBuilder";
import { WhatsAppOrderQueue } from "@/components/admin/whatsapp/WhatsAppOrderQueue";
import { WhatsAppTemplates } from "@/components/admin/whatsapp/WhatsAppTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminWhatsApp, primaryRoleLabel } from "@/lib/admin-access";
import { normalizePhoneKey } from "@/lib/admin-crm";
import {
  buildWhatsAppActivity,
  buildWhatsAppInsights,
  buildWhatsAppKpis,
  findCustomerForOrder,
  integrationChecks,
  WHATSAPP_ORDER_SOURCE,
} from "@/lib/admin-whatsapp";
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
    orderType: params.get("orderType") ?? "",
    search: params.get("q") ?? "",
    offset: Math.max(0, Number(params.get("offset") ?? "0") || 0),
    selected: params.get("selected") ?? "",
  };
}

export default function AdminWhatsApp() {
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
  const [selected, setSelected] = useState<AdminOrderListItem | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const allowed = canAccessAdminWhatsApp({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const filters: WhatsAppFilterState = {
    status: urlState.status,
    orderType: urlState.orderType,
    search: urlState.search,
  };

  const writeUrl = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...urlState, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.orderType) params.set("orderType", merged.orderType);
      if (merged.search) params.set("q", merged.search);
      if (merged.offset > 0) params.set("offset", String(merged.offset));
      if (merged.selected) params.set("selected", merged.selected);
      const qs = params.toString();
      setLocation(qs ? `/admin/whatsapp?${qs}` : "/admin/whatsapp");
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
        orderSource: WHATSAPP_ORDER_SOURCE,
        status: urlState.status || undefined,
        orderType: urlState.orderType || undefined,
        orderNumber: looksLikeOrderNumber ? urlState.search.trim() : undefined,
        limit: ORDER_FETCH_LIMIT,
        offset: 0,
      });
      let rows = result.orders;
      const needle = urlState.search.trim().toLowerCase();
      if (needle && !looksLikeOrderNumber) {
        rows = rows.filter(
          (order) =>
            order.contactName.toLowerCase().includes(needle) ||
            order.contactPhone.toLowerCase().includes(needle) ||
            normalizePhoneKey(order.contactPhone).includes(normalizePhoneKey(urlState.search)) ||
            order.orderNumber.toLowerCase().includes(needle),
        );
      }
      setOrders(rows);
      setError(null);
      setLive(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load WhatsApp-attributed orders");
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [allowed, branchIdFilter, session?.access_token, urlState.orderType, urlState.search, urlState.status]);

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

  const branchLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const branch of allowedBranches) {
      map[branch.id] = branch.shortName || branch.name;
    }
    return map;
  }, [allowedBranches]);

  const kpis = useMemo(() => buildWhatsAppKpis(orders), [orders]);
  const insights = useMemo(() => buildWhatsAppInsights(orders, branchLabelById), [orders, branchLabelById]);
  const customer = useMemo(() => findCustomerForOrder(orders, selected), [orders, selected]);
  const activity = useMemo(() => buildWhatsAppActivity(detail), [detail]);
  const checks = useMemo(() => integrationChecks(), []);

  const pageRows = useMemo(
    () => orders.slice(urlState.offset, urlState.offset + PAGE_SIZE),
    [orders, urlState.offset],
  );

  function selectOrder(order: AdminOrderListItem) {
    setSelected(order);
    writeUrl({ selected: order.id });
    void loadDetail(order.id);
  }

  useEffect(() => {
    if (!urlState.selected || orders.length === 0) return;
    const match = orders.find((o) => o.id === urlState.selected);
    if (match) {
      setSelected(match);
      void loadDetail(match.id);
    }
  }, [urlState.selected, orders, loadDetail]);

  const pageStart = orders.length === 0 ? 0 : urlState.offset + 1;
  const pageEnd = urlState.offset + pageRows.length;

  return (
    <AdminShell title="WhatsApp Order Center">
      <WhatsAppHeader
        branchLabel={branchLabel}
        roleLabel={roleLabel}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onSearch={() => writeUrl({ search: searchDraft.trim(), offset: 0 })}
        onRefresh={() => void loadOrders()}
        live={live}
        providerLabel="Not configured — order-derived mode"
      />

      <WhatsAppIntegrationBanner />

      <WhatsAppKPIs
        snapshot={kpis}
        loading={loading}
        windowNote={`WhatsApp-attributed orders only · up to ${ORDER_FETCH_LIMIT} in branch scope.`}
      />

      <WhatsAppFilters
        filters={filters}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onChange={(next) =>
          writeUrl({
            status: next.status ?? urlState.status,
            orderType: next.orderType ?? urlState.orderType,
            search: next.search ?? urlState.search,
            offset: 0,
          })
        }
        onApplySearch={() => writeUrl({ search: searchDraft.trim(), offset: 0 })}
        onReset={() => {
          setSearchDraft("");
          setLocation("/admin/whatsapp");
        }}
      />

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)_minmax(16rem,20rem)]">
        <WhatsAppOrderQueue
          orders={pageRows}
          loading={loading}
          error={error}
          selectedId={selected?.id ?? null}
          onSelect={selectOrder}
          onRetry={() => void loadOrders()}
          branchLabelById={branchLabelById}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={orders.length}
          canPrev={urlState.offset > 0}
          canNext={urlState.offset + PAGE_SIZE < orders.length}
          onPrev={() => writeUrl({ offset: Math.max(0, urlState.offset - PAGE_SIZE) })}
          onNext={() => writeUrl({ offset: urlState.offset + PAGE_SIZE })}
        />
        <ConversationWorkspace hasSelection={Boolean(selected)} />
        <div className="space-y-4">
          <CustomerContextPanel order={selected} customer={customer} branchLabelById={branchLabelById} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <LinkedOrderPanel
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onRetry={() => {
            if (selected) void loadDetail(selected.id);
          }}
          branchLabelById={branchLabelById}
        />
        <WhatsAppInsights items={insights} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <WhatsAppOrderBuilder />
        <WhatsAppTemplates />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <WhatsAppActivity events={activity} loading={detailLoading} />
        <WhatsAppFoundationPanel checks={checks} />
      </div>
    </AdminShell>
  );
}

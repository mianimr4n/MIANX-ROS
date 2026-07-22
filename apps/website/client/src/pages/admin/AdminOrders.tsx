import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminOrdersApi } from "@/lib/admin-access";
import { listAdminOrders, type AdminOrderListItem } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

const STATUSES = ["pending", "confirmed", "preparing", "ready", "dispatched", "completed", "cancelled"] as const;
const TYPES = ["delivery", "pickup", "dine-in"] as const;
const SOURCES = ["website", "whatsapp", "mobile", "pos", "admin"] as const;
const PAGE_SIZE = 20;

function formatPkr(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function readFilters(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    status: params.get("status") ?? "",
    orderType: params.get("orderType") ?? "",
    orderSource: params.get("orderSource") ?? "",
    orderNumber: params.get("orderNumber") ?? "",
    offset: Math.max(0, Number(params.get("offset") ?? "0") || 0),
  };
}

export default function AdminOrders() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter } = useAdminBranch();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const filters = useMemo(() => readFilters(search), [search]);

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderNumberDraft, setOrderNumberDraft] = useState(filters.orderNumber);

  const allowed = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });

  const writeFilters = useCallback(
    (next: Partial<ReturnType<typeof readFilters>>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.status) params.set("status", merged.status);
      if (merged.orderType) params.set("orderType", merged.orderType);
      if (merged.orderSource) params.set("orderSource", merged.orderSource);
      if (merged.orderNumber) params.set("orderNumber", merged.orderNumber);
      if (merged.offset > 0) params.set("offset", String(merged.offset));
      const qs = params.toString();
      setLocation(qs ? `/admin/orders?${qs}` : "/admin/orders");
    },
    [filters, setLocation],
  );

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !allowed) return;
    setLoading(true);
    try {
      const result = await listAdminOrders(token, {
        branchId: branchIdFilter,
        status: filters.status || undefined,
        orderType: filters.orderType || undefined,
        orderSource: filters.orderSource || undefined,
        orderNumber: filters.orderNumber || undefined,
        limit: PAGE_SIZE,
        offset: filters.offset,
      });
      setOrders(result.orders);
      setTotal(result.pagination.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [allowed, branchIdFilter, filters, session?.access_token]);

  useEffect(() => {
    if (!allowed) {
      setLocation("/admin/unauthorized");
      return;
    }
    void load();
  }, [allowed, load, setLocation]);

  useEffect(() => {
    setOrderNumberDraft(filters.orderNumber);
  }, [filters.orderNumber]);

  const pageStart = filters.offset + 1;
  const pageEnd = filters.offset + orders.length;

  return (
    <AdminShell title="Orders">
      <p className="mb-4 text-sm text-[var(--admin-muted)]">
        Read-only order operations for Foundation S1. Status transitions ship in S2.
      </p>

      <form
        className="mb-5 grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          writeFilters({ orderNumber: orderNumberDraft.trim(), offset: 0 });
        }}
      >
        <label className="text-sm">
          Order number
          <input
            value={orderNumberDraft}
            onChange={(e) => setOrderNumberDraft(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            placeholder="Search…"
            aria-label="Search by order number"
          />
        </label>
        <label className="text-sm">
          Status
          <select
            value={filters.status}
            onChange={(e) => writeFilters({ status: e.target.value, offset: 0 })}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Order type
          <select
            value={filters.orderType}
            onChange={(e) => writeFilters({ orderType: e.target.value, offset: 0 })}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            aria-label="Filter by order type"
          >
            <option value="">All types</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Source
          <select
            value={filters.orderSource}
            onChange={(e) => writeFilters({ orderSource: e.target.value, offset: 0 })}
            className="mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2"
            aria-label="Filter by order source"
          >
            <option value="">All sources</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="min-h-10 flex-1 rounded-lg bg-[var(--brand-red)] px-3 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
          >
            Apply
          </button>
          <button
            type="button"
            className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 text-sm font-semibold hover:bg-[var(--admin-soft)]"
            onClick={() => {
              setOrderNumberDraft("");
              setLocation("/admin/orders");
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading orders">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : null}

      {!loading && orders.length === 0 ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-8 text-center text-sm text-[var(--admin-muted)]">
          No orders match the current filters for this branch scope.
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--admin-border)]/70">
                    <td className="px-4 py-3 font-mono font-semibold">{order.orderNumber}</td>
                    <td className="px-4 py-3">{formatTime(order.createdAt)}</td>
                    <td className="px-4 py-3">{order.branchCode ?? "—"}</td>
                    <td className="px-4 py-3">{order.contactName || "—"}</td>
                    <td className="px-4 py-3 capitalize">{order.orderType}</td>
                    <td className="px-4 py-3 capitalize">{order.orderSource}</td>
                    <td className="px-4 py-3 capitalize">{order.paymentStatus}</td>
                    <td className="px-4 py-3 capitalize">{order.status}</td>
                    <td className="px-4 py-3 tabular-nums">{formatPkr(order.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-[var(--brand-red)]">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-[var(--admin-muted)]">
              Showing {pageStart}–{pageEnd} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={filters.offset <= 0}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 font-semibold disabled:opacity-40"
                onClick={() => writeFilters({ offset: Math.max(0, filters.offset - PAGE_SIZE) })}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={filters.offset + PAGE_SIZE >= total}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 font-semibold disabled:opacity-40"
                onClick={() => writeFilters({ offset: filters.offset + PAGE_SIZE })}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
      {/* keep location referenced for lint-friendly intentional identity */}
      <span className="sr-only">{location}</span>
    </AdminShell>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { CategorySidebar } from "@/components/admin/pos/CategorySidebar";
import { CustomerPanel } from "@/components/admin/pos/CustomerPanel";
import { OrderSummary } from "@/components/admin/pos/OrderSummary";
import { OrderTypeSelector } from "@/components/admin/pos/OrderTypeSelector";
import { PaymentPanel } from "@/components/admin/pos/PaymentPanel";
import { POSActions } from "@/components/admin/pos/POSActions";
import { POSHeader } from "@/components/admin/pos/POSHeader";
import { OperationsDeferredNote } from "@/components/admin/operations/OperationsWorkspaceHeader";
import { POSInsights, buildPosInsights } from "@/components/admin/pos/POSInsights";
import { ProductConfigureModal } from "@/components/admin/pos/ProductConfigureModal";
import { ProductGrid } from "@/components/admin/pos/ProductGrid";
import { ReceiptPreview } from "@/components/admin/pos/ReceiptPreview";
import { ShoppingCart } from "@/components/admin/pos/ShoppingCart";
import { ZReportModal } from "@/components/admin/pos/ZReportModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import {
  canAccessAdminPos,
  canAccessTableService,
  canManageOrders,
} from "@/lib/admin-access";
import { listActiveSessions, type DiningSessionRecord } from "@/lib/table-service-api";
import {
  channelToOrderType,
  defaultSku,
  displayPrice,
  itemNeedsConfiguration,
  mapCategoryBucket,
  type PosCartLine,
  type PosChannelMode,
} from "@/lib/admin-pos";
import {
  confirmPosZReportClose,
  createAdminPosOrder,
  fetchPosZReport,
  listAdminTables,
  transitionAdminOrder,
  type AdminRestaurantTable,
  type PosZReport,
} from "@/lib/admin-api";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { normalizePhoneE164 } from "@/lib/phone";
import { quoteOrder } from "@/lib/telepizza-api";
import type { MenuProductGroup, QuoteOrderResponse } from "@/lib/telepizza-types";
import { AdminShell } from "./AdminShell";

function newLineKey() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminPos() {
  const { session, profile, permissions, isSuperAdmin, roles } = useAuth();
  const { selection, setSelection, allowedBranches, label: branchLabel, branchIdFilter } =
    useAdminBranch();
  const {
    items,
    groups,
    isLoading: menuLoading,
    error: menuError,
    usingFallback,
    reloadCatalog,
  } = useMenuCatalog();
  const [, setLocation] = useLocation();

  const principal = { roles, permissions, isSuperAdmin };
  const allowed = canAccessAdminPos(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const canKitchen = canManageOrders(principal);
  const canLoadTables = isSuperAdmin || permissions.includes("branch.manage");

  const [channel, setChannel] = useState<PosChannelMode>("takeaway");
  const [bucket, setBucket] = useState("All");
  const [categorySearch, setCategorySearch] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [configureGroup, setConfigureGroup] = useState<MenuProductGroup | null>(null);
  const [guestMode, setGuestMode] = useState(true);
  const [customerName, setCustomerName] = useState("Walk-in Guest");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tableId, setTableId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [quote, setQuote] = useState<QuoteOrderResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [kitchenBusy, setKitchenBusy] = useState(false);
  const [tables, setTables] = useState<AdminRestaurantTable[]>([]);
  const [tablesLive, setTablesLive] = useState(false);
  // D3 — active dining sessions for dine-in order attachment.
  const [diningSessions, setDiningSessions] = useState<DiningSessionRecord[]>([]);
  const [diningSessionId, setDiningSessionId] = useState("");
  const canLoadSessions = canAccessTableService(principal);
  const [zReportOpen, setZReportOpen] = useState(false);
  const [zReport, setZReport] = useState<PosZReport | null>(null);
  const [zReportLoading, setZReportLoading] = useState(false);
  const [zReportConfirming, setZReportConfirming] = useState(false);
  const [zReportError, setZReportError] = useState<string | null>(null);

  const activeBranch = useMemo(() => {
    if (selection.mode === "branch") {
      return allowedBranches.find((b) => b.id === selection.branchId) ?? allowedBranches[0] ?? null;
    }
    return allowedBranches[0] ?? null;
  }, [allowedBranches, selection]);

  const branchCode = activeBranch?.code || activeBranch?.shortName || "";

  useEffect(() => {
    if (!gateReady) return;
    if (selection.mode === "all" && allowedBranches[0]) {
      setSelection({ mode: "branch", branchId: allowedBranches[0].id });
    }
  }, [gateReady, allowedBranches, selection.mode, setSelection]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !canLoadTables || !branchIdFilter) {
      setTables([]);
      setTablesLive(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listAdminTables(token, { branchId: branchIdFilter, limit: 100 });
        if (!cancelled) {
          setTables(rows.filter((t) => t.isActive));
          setTablesLive(true);
        }
      } catch {
        if (!cancelled) {
          setTables([]);
          setTablesLive(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchIdFilter, canLoadTables, session?.access_token]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !canLoadSessions || !branchIdFilter || channel !== "dine-in") {
      setDiningSessions([]);
      setDiningSessionId("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listActiveSessions(token, branchIdFilter);
        if (!cancelled) setDiningSessions(rows);
      } catch {
        if (!cancelled) setDiningSessions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchIdFilter, canLoadSessions, channel, session?.access_token]);

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { All: groups.length };
    for (const group of groups) {
      const key = mapCategoryBucket(group.category);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [groups]);

  // Search matches on any SKU inside a family so a cashier can type "12 inch" or an exact SKU slug.
  const filteredGroups = useMemo(() => {
    const needle = menuSearch.trim().toLowerCase();
    return groups.filter((group) => {
      if (bucket !== "All" && mapCategoryBucket(group.category) !== bucket) return false;
      if (!needle) return true;
      if (
        group.name.toLowerCase().includes(needle) ||
        group.productGroupSlug.toLowerCase().includes(needle) ||
        group.category.toLowerCase().includes(needle)
      ) {
        return true;
      }
      return group.options.some(
        (sku) =>
          sku.name.toLowerCase().includes(needle) ||
          (sku.slug ?? "").toLowerCase().includes(needle) ||
          sku.id.toLowerCase().includes(needle),
      );
    });
  }, [bucket, groups, menuSearch]);

  const addLine = useCallback((partial: Omit<PosCartLine, "key">) => {
    setLines((prev) => [...prev, { ...partial, key: newLineKey() }]);
    setLastOrderNumber(null);
    setLastOrderId(null);
  }, []);

  function quickAdd(group: MenuProductGroup) {
    if (itemNeedsConfiguration(group)) {
      setConfigureGroup(group);
      return;
    }
    const sku = defaultSku(group);
    if (!sku) return;
    addLine({
      menuItemId: sku.id,
      menuItemSlug: sku.slug ?? sku.id,
      productName: sku.name,
      variantLabel: sku.sizeLabel,
      unitPrice: displayPrice(group),
      quantity: 1,
      image: sku.image,
    });
  }

  const quotePayloadItems = useMemo(
    () =>
      lines.map((line) => ({
        menuItemId: line.menuItemId,
        menuItemSlug: line.menuItemSlug,
        variantLabel: line.variantLabel,
        quantity: line.quantity,
        productName: line.productName,
        instructions: line.instructions,
        modifiers: line.modifiers?.map((m) => ({
          groupCode: m.groupCode,
          optionCode: m.optionCode,
        })),
      })),
    [lines],
  );

  useEffect(() => {
    if (!isApiConfigured || !branchCode || lines.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setQuoting(true);
        try {
          const next = await quoteOrder({
            branchCode,
            orderType: channelToOrderType(channel),
            couponCode: couponCode.trim() || undefined,
            contactPhone: customerPhone.trim() || undefined,
            items: quotePayloadItems,
          });
          if (!cancelled) {
            setQuote(next);
            setQuoteError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setQuote(null);
            setQuoteError(err instanceof ApiRequestError ? err.message : "Quote failed");
          }
        } finally {
          if (!cancelled) setQuoting(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [branchCode, channel, couponCode, customerPhone, lines.length, quotePayloadItems]);

  const needsAddress = channel === "delivery" || channel === "phone";
  const insights = useMemo(
    () => buildPosInsights(lines, items, needsAddress, Boolean(address.trim())),
    [address, items, lines, needsAddress],
  );

  const selectedTable = tables.find((t) => t.id === tableId);
  const tableNote =
    channel === "dine-in"
      ? selectedTable
        ? `Table ${selectedTable.tableNumber}`
        : tableId
          ? `Table ${tableId}`
          : ""
      : "";

  async function placeOrder() {
    if (!isApiConfigured || !branchCode || !quote || lines.length === 0) return;
    const token = session?.access_token;
    if (!token) {
      setPlaceError("Sign in is required to place a POS order.");
      return;
    }
    if (activeBranch?.status && activeBranch.status !== "operating") {
      setPlaceError("This branch is not operationally active. Live POS orders are blocked.");
      return;
    }
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (name.length < 2 || phone.length < 7) {
      setPlaceError("Name and phone are required.");
      return;
    }
    if (needsAddress && !address.trim()) {
      setPlaceError("Delivery address is required for delivery/phone orders.");
      return;
    }
    if (paymentMethod !== "cash") {
      setPlaceError("Only Cash is available at place-order. Use dine-in bill settlement for other methods.");
      return;
    }
    setPlacing(true);
    setPlaceError(null);
    try {
      const notesParts = [`POS channel=${channel}`, tableNote].filter(Boolean);
      const created = await createAdminPosOrder(
        token,
        {
          branchCode,
          orderType: channelToOrderType(channel),
          contactName: name,
          contactPhone: normalizePhoneE164(phone),
          deliveryAddress: needsAddress ? address.trim() : undefined,
          notes: notesParts.join(" · ") || undefined,
          couponCode: couponCode.trim() || undefined,
          quoteId: quote.quoteId,
          paymentMethod: "cash",
          diningSessionId:
            channel === "dine-in" && diningSessionId ? diningSessionId : undefined,
          items: lines.map((line) => ({
            menuItemId: line.menuItemId,
            menuItemSlug: line.menuItemSlug,
            variantLabel: line.variantLabel,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            productName: line.productName,
            instructions: line.instructions,
            modifiers: line.modifiers?.map((m) => ({
              groupCode: m.groupCode,
              optionCode: m.optionCode,
            })),
          })),
        },
        `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      );
      setLastOrderNumber(created.orderNumber);
      setLastOrderId(created.id);
      setLines([]);
      setQuote(null);
      setQuoteError(null);
      setCouponCode("");
      toast.success(`Order ${created.orderNumber} placed successfully`);
    } catch (err) {
      setPlaceError(err instanceof ApiRequestError ? err.message : "Place order failed");
      toast.error(err instanceof ApiRequestError ? err.message : "Place order failed");
    } finally {
      setPlacing(false);
    }
  }

  async function kitchenSend() {
    const token = session?.access_token;
    if (!token || !lastOrderId || !canKitchen) return;
    setKitchenBusy(true);
    setPlaceError(null);
    try {
      await transitionAdminOrder(token, lastOrderId, "confirm").catch(() => undefined);
      await transitionAdminOrder(token, lastOrderId, "preparing");
    } catch (err) {
      setPlaceError(err instanceof ApiRequestError ? err.message : "Kitchen send failed");
    } finally {
      setKitchenBusy(false);
    }
  }

  function resetTicket() {
    setLines([]);
    setQuote(null);
    setQuoteError(null);
    setPlaceError(null);
    setLastOrderId(null);
    setLastOrderNumber(null);
    setCouponCode("");
    setAddress("");
    setTableId("");
  }

  async function openZReport() {
    const token = session?.access_token;
    const branchId = activeBranch?.id ?? branchIdFilter;
    if (!token || !branchId) {
      toast.error("Select an operating branch to close shift.");
      return;
    }
    setZReportOpen(true);
    setZReport(null);
    setZReportError(null);
    setZReportLoading(true);
    try {
      const report = await fetchPosZReport(token, branchId);
      setZReport(report);
    } catch (err) {
      setZReportError(err instanceof ApiRequestError ? err.message : "Failed to load Z-Report.");
    } finally {
      setZReportLoading(false);
    }
  }

  async function confirmZReportClose() {
    const token = session?.access_token;
    const branchId = activeBranch?.id ?? branchIdFilter;
    if (!token || !branchId) return;
    setZReportConfirming(true);
    setZReportError(null);
    try {
      const result = await confirmPosZReportClose(token, branchId);
      toast.success(
        `Shift closed · ${result.totalOrders} cash orders · expected ${Math.round(result.expectedCashInDrawer).toLocaleString("en-PK")} PKR`,
      );
      setZReportOpen(false);
      setZReport(result);
    } catch (err) {
      setZReportError(err instanceof ApiRequestError ? err.message : "Failed to confirm shift close.");
      toast.error(err instanceof ApiRequestError ? err.message : "Failed to confirm shift close.");
    } finally {
      setZReportConfirming(false);
    }
  }

  if (!allowed) {
    return (
      <AdminShell title="Point of Sale">
        <p className="text-sm text-[var(--admin-muted)]">Sign in required for POS.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Point of Sale">
      <POSHeader
        branchLabel={activeBranch ? activeBranch.shortName || activeBranch.name : branchLabel}
        cashierName={profile?.fullName || profile?.email || "Staff"}
        roles={roles}
        isSuperAdmin={isSuperAdmin}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onSearch={() => setMenuSearch(searchDraft.trim())}
        onRefresh={() => void reloadCatalog()}
        live={!usingFallback && !menuError}
      />

      <OperationsDeferredNote
        summary="Deferred POS capabilities"
        items={[
          "Hardware register and cash drawer status",
          "Save draft cart persistence",
          "Receipt printer hardware integration",
          "Existing-customer lookup and table inventory session link",
        ]}
      />

      {!isApiConfigured ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          API base URL is not configured — Place Order / Quote stay unavailable until `VITE_API_BASE_URL` is set.
        </div>
      ) : null}

      {menuError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {menuError}
        </div>
      ) : null}

      {placeError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {placeError}
        </div>
      ) : null}

      {lastOrderNumber ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950" role="status">
          Order placed: <span className="font-mono font-semibold">{lastOrderNumber}</span>
        </div>
      ) : null}

      <OrderTypeSelector value={channel} onChange={setChannel} />

      <div className="grid gap-4 xl:grid-cols-[14rem_minmax(0,1fr)_22rem]">
        <CategorySidebar
          selected={bucket}
          counts={bucketCounts}
          categorySearch={categorySearch}
          onCategorySearch={setCategorySearch}
          onSelect={setBucket}
        />

        <div className="min-w-0 space-y-4">
          <ProductGrid
            groups={filteredGroups}
            loading={menuLoading}
            emptyMessage="No products match the current category/search."
            onQuickAdd={quickAdd}
            onConfigure={setConfigureGroup}
          />
          <ReceiptPreview
            orderNumber={lastOrderNumber}
            lines={lines}
            quote={quote}
            paymentLabel={paymentMethod}
            customerName={customerName}
          />
          <POSInsights items={insights} />
        </div>

        <div className="space-y-4">
          <ShoppingCart
            lines={lines}
            onQuantity={(key, quantity) =>
              setLines((prev) =>
                prev.map((line) =>
                  line.key === key ? { ...line, quantity: Math.min(20, Math.max(1, quantity)) } : line,
                ),
              )
            }
            onRemove={(key) => setLines((prev) => prev.filter((line) => line.key !== key))}
            onClear={() => setLines([])}
            onNote={(key, note) =>
              setLines((prev) =>
                prev.map((line) => (line.key === key ? { ...line, instructions: note } : line)),
              )
            }
          />
          <CustomerPanel
            channel={channel}
            guestMode={guestMode}
            onGuestMode={setGuestMode}
            name={customerName}
            phone={customerPhone}
            address={address}
            tableId={tableId}
            couponCode={couponCode}
            onName={setCustomerName}
            onPhone={setCustomerPhone}
            onAddress={setAddress}
            onTableId={setTableId}
            onCoupon={setCouponCode}
            tables={tables}
            tablesLive={tablesLive}
          />
          {channel === "dine-in" && canLoadSessions ? (
            <div className="rounded-xl border p-3">
              <label className="flex flex-col gap-1 text-xs font-medium">
                Dining session (D3 — attaches this order to a seated table)
                <select
                  className="rounded-md border px-2 py-1.5 text-sm font-normal"
                  value={diningSessionId}
                  onChange={(e) => setDiningSessionId(e.target.value)}
                >
                  <option value="">No session — plain dine-in order</option>
                  {diningSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sessionNumber ?? s.id.slice(0, 8)} · {s.guestName ?? "Guest"} · party of{" "}
                      {s.partySize ?? "?"} · {s.serviceStatus}
                    </option>
                  ))}
                </select>
              </label>
              {diningSessions.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  No active dining sessions. Seat guests from the Live floor console first.
                </p>
              ) : null}
            </div>
          ) : null}
          <OrderSummary
            channel={channel}
            branchLabel={activeBranch ? activeBranch.shortName || activeBranch.name : branchLabel}
            customerName={customerName}
            quote={quote}
            quoting={quoting}
            quoteError={quoteError}
          />
          <PaymentPanel selected={paymentMethod} onSelect={setPaymentMethod} />
          <POSActions
            canPlace={Boolean(isApiConfigured && quote && lines.length > 0 && branchCode && !quoting)}
            placing={placing}
            canKitchenSend={canKitchen}
            kitchenBusy={kitchenBusy}
            lastOrderId={lastOrderId}
            canCloseShift={Boolean(session?.access_token && (activeBranch?.id || branchIdFilter) && isApiConfigured)}
            closingShiftBusy={zReportLoading}
            onPlace={() => void placeOrder()}
            onCancelLocal={resetTicket}
            onKitchenSend={() => void kitchenSend()}
            onCloseShift={() => void openZReport()}
          />
        </div>
      </div>

      <ProductConfigureModal
        open={Boolean(configureGroup)}
        group={configureGroup}
        onClose={() => setConfigureGroup(null)}
        onAdd={addLine}
      />

      <ZReportModal
        open={zReportOpen}
        report={zReport}
        loading={zReportLoading}
        confirming={zReportConfirming}
        error={zReportError}
        onClose={() => setZReportOpen(false)}
        onConfirm={() => void confirmZReportClose()}
      />
    </AdminShell>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { CategorySidebar } from "@/components/admin/pos/CategorySidebar";
import { CustomerPanel } from "@/components/admin/pos/CustomerPanel";
import { OrderSummary } from "@/components/admin/pos/OrderSummary";
import { OrderTypeSelector } from "@/components/admin/pos/OrderTypeSelector";
import { PaymentPanel } from "@/components/admin/pos/PaymentPanel";
import { POSActions } from "@/components/admin/pos/POSActions";
import { POSHeader } from "@/components/admin/pos/POSHeader";
import { POSInsights, buildPosInsights } from "@/components/admin/pos/POSInsights";
import { ProductConfigureModal } from "@/components/admin/pos/ProductConfigureModal";
import { ProductGrid } from "@/components/admin/pos/ProductGrid";
import { ReceiptPreview } from "@/components/admin/pos/ReceiptPreview";
import { ShoppingCart } from "@/components/admin/pos/ShoppingCart";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import {
  canAccessAdminPos,
  canManageOrders,
} from "@/lib/admin-access";
import {
  channelToOrderType,
  defaultVariant,
  displayPrice,
  itemNeedsConfiguration,
  mapCategoryBucket,
  type PosCartLine,
  type PosChannelMode,
} from "@/lib/admin-pos";
import { createAdminPosOrder, listAdminTables, transitionAdminOrder, type AdminRestaurantTable } from "@/lib/admin-api";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { normalizePhoneE164 } from "@/lib/phone";
import { quoteOrder } from "@/lib/telepizza-api";
import type { MenuItem, QuoteOrderResponse } from "@/lib/telepizza-types";
import { AdminShell } from "./AdminShell";

function newLineKey() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminPos() {
  const { session, profile, permissions, isSuperAdmin, roles } = useAuth();
  const { selection, setSelection, allowedBranches, label: branchLabel, branchIdFilter } =
    useAdminBranch();
  const { items, isLoading: menuLoading, error: menuError, usingFallback, reloadCatalog } =
    useMenuCatalog();
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
  const [configureItem, setConfigureItem] = useState<MenuItem | null>(null);
  const [guestMode, setGuestMode] = useState(true);
  const [customerName, setCustomerName] = useState("Walk-in Guest");
  const [customerPhone, setCustomerPhone] = useState("03000000000");
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

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    for (const item of items) {
      const key = mapCategoryBucket(item.category);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = menuSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (bucket !== "All" && mapCategoryBucket(item.category) !== bucket) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.slug ?? "").toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        (item.id ?? "").toLowerCase().includes(needle)
      );
    });
  }, [bucket, items, menuSearch]);

  const addLine = useCallback((partial: Omit<PosCartLine, "key">) => {
    setLines((prev) => [...prev, { ...partial, key: newLineKey() }]);
    setLastOrderNumber(null);
    setLastOrderId(null);
  }, []);

  function quickAdd(item: MenuItem) {
    if (!item.slug) return;
    if (itemNeedsConfiguration(item)) {
      setConfigureItem(item);
      return;
    }
    const variant = defaultVariant(item);
    addLine({
      menuItemSlug: item.slug,
      productName: item.name,
      variantLabel: variant?.label,
      unitPrice: displayPrice(item),
      quantity: 1,
      image: item.image,
    });
  }

  const quotePayloadItems = useMemo(
    () =>
      lines.map((line) => ({
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
    setPlacing(true);
    setPlaceError(null);
    try {
      const notesParts = [
        `POS channel=${channel}`,
        paymentMethod ? `Payment intent=${paymentMethod} (Foundation label)` : "",
        tableNote,
      ].filter(Boolean);
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
          items: lines.map((line) => ({
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
    } catch (err) {
      setPlaceError(err instanceof ApiRequestError ? err.message : "Place order failed");
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

  if (!allowed) return null;

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
            items={filteredItems}
            loading={menuLoading}
            emptyMessage="No products match the current category/search."
            onQuickAdd={quickAdd}
            onConfigure={setConfigureItem}
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
            onPlace={() => void placeOrder()}
            onCancelLocal={resetTicket}
            onKitchenSend={() => void kitchenSend()}
          />
        </div>
      </div>

      <ProductConfigureModal
        open={Boolean(configureItem)}
        item={configureItem}
        onClose={() => setConfigureItem(null)}
        onAdd={addLine}
      />
    </AdminShell>
  );
}

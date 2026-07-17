import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Check, Clock3, Loader2, PackageSearch, RefreshCw, XCircle } from "lucide-react";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { cancelOrder, fetchOrderTracking } from "@/lib/telepizza-api";
import { getLocalOrder, updateLocalOrderStatus } from "@/lib/customer-store";
import { canGuestCancelOrder, mapCancelApiError } from "@/lib/order-access";
import type { OrderTrackingResponse } from "@/lib/telepizza-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_STEPS = ["pending", "confirmed", "preparing", "ready", "dispatched", "completed"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  dispatched: "Dispatched",
  completed: "Delivered / collected",
  cancelled: "Cancelled",
};

export default function TrackOrder() {
  const [, params] = useRoute("/track/:orderNumber");
  const initialOrderNumber = params?.orderNumber ?? "";
  const initialPhone = new URLSearchParams(window.location.search).get("phone") ?? "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [tracking, setTracking] = useState<OrderTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const canCancelOnline = useMemo(
    () =>
      Boolean(
        tracking &&
          isApiConfigured &&
          !orderNumber.startsWith("LOC-") &&
          canGuestCancelOrder(tracking.status, tracking.createdAt),
      ),
    [tracking, orderNumber],
  );

  const loadTracking = async (
    nextOrderNumber = orderNumber,
    nextPhone = phone,
    background = false,
  ) => {
    if (!background) setLoading(true);
    setError(null);
    if (!background) setTracking(null);

    try {
      if (isApiConfigured && !nextOrderNumber.startsWith("LOC-")) {
        const remote = await fetchOrderTracking(nextOrderNumber, nextPhone);
        setTracking(remote);
        updateLocalOrderStatus(remote.orderNumber, nextPhone, remote.status, remote.updatedAt);
        setLastCheckedAt(new Date().toISOString());
        return;
      }

      const local = getLocalOrder(nextOrderNumber, nextPhone);
      if (!local) {
        setError("Order not found. Check the order number and phone.");
        return;
      }

      setTracking({
        orderNumber: local.orderNumber,
        status: local.status,
        orderType: local.orderType,
        contactName: local.contactName,
        contactPhone: local.contactPhone,
        subtotal: local.subtotal,
        totalAmount: local.totalAmount,
        deliveryAddress: local.deliveryAddress,
        notes: local.notes,
        createdAt: local.createdAt,
        updatedAt: local.updatedAt,
        items: local.items.map((item) => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          instructions: item.instructions,
          extras: item.extras,
        })),
      });
      setLastCheckedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tracking.");
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!tracking || !canCancelOnline) return;

    setCancelling(true);
    setError(null);

    try {
      const result = await cancelOrder(tracking.orderNumber, phone.trim());
      setTracking({
        ...tracking,
        status: result.status,
        updatedAt: result.cancelledAt,
      });
      updateLocalOrderStatus(tracking.orderNumber, phone, result.status, result.cancelledAt);
    } catch (cancelError) {
      const code =
        cancelError instanceof ApiRequestError ? cancelError.code : undefined;
      const message =
        cancelError instanceof Error ? cancelError.message : "Could not cancel order.";
      setError(mapCancelApiError(code, message));
      if (code === "ORDER_CANCEL_WINDOW_EXPIRED" || code === "ORDER_CANCEL_NOT_ALLOWED") {
        void loadTracking();
      }
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber && initialPhone) {
      void loadTracking(initialOrderNumber, initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !tracking ||
      !isApiConfigured ||
      orderNumber.startsWith("LOC-") ||
      ["completed", "cancelled"].includes(tracking.status.toLowerCase())
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadTracking(orderNumber, phone, true);
    }, 30_000);
    return () => window.clearInterval(timer);
    // Poll only while the current remote order is active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking?.status, orderNumber, phone]);

  const activeIndex = tracking ? STATUS_STEPS.indexOf(tracking.status) : -1;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl">
        <h1 className="brand-heading text-3xl md:text-4xl mb-2">Track Your Order</h1>
        <p className="text-muted-foreground mb-8">Enter your order number and phone to see status.</p>

        <form
          className="rounded-3xl border border-border bg-white p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
          onSubmit={(event) => {
            event.preventDefault();
            void loadTracking();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="order-number">Order number</Label>
            <Input id="order-number" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading} className="rounded-2xl brand-gradient text-white font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track Order"}
            </Button>
          </div>
        </form>

        {error && <p role="alert" className="text-brand-red mb-4">{error}</p>}

        {tracking && (
          <div className="rounded-3xl border border-border bg-white p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
              <PackageSearch className="w-6 h-6 text-brand-red" />
              <div>
                <div className="font-[var(--font-display)] font-bold text-xl">{tracking.orderNumber}</div>
                <div className="text-sm text-muted-foreground">
                  {STATUS_LABELS[tracking.status.toLowerCase()] ?? tracking.status.replace("-", " ")}
                </div>
              </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-2xl"
                disabled={loading}
                onClick={() => void loadTracking()}
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {tracking.status.toLowerCase() === "cancelled" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold">This order was cancelled</div>
                  <p className="text-sm">Contact Telepizza if you need help placing a new order.</p>
                </div>
              </div>
            ) : (
              <ol className="grid gap-2 sm:grid-cols-6" aria-label={`Order progress: ${tracking.status}`}>
                {STATUS_STEPS.map((step, index) => {
                  const complete = index <= activeIndex;
                  const current = index === activeIndex;
                  return (
                    <li
                      key={step}
                      aria-current={current ? "step" : undefined}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-semibold sm:flex-col sm:text-center ${
                        complete ? "bg-brand-red text-white" : "bg-brand-cream text-muted-foreground"
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      <span>{STATUS_LABELS[step]}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              {isApiConfigured && !orderNumber.startsWith("LOC-")
                ? "Active orders refresh automatically every 30 seconds. No driver location is available."
                : "Status reflects the order saved on this device."}
              {lastCheckedAt ? ` Last checked ${new Date(lastCheckedAt).toLocaleTimeString()}.` : ""}
            </p>

            <div className="space-y-2">
              {tracking.items.map((item, index) => (
                <div key={`${item.productName}-${index}`} className="border-b border-border pb-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>
                      {item.productName}
                      {item.variantName ? ` (${item.variantName})` : ""} x{item.quantity}
                    </span>
                    <span className="font-bold">Rs {item.totalPrice.toLocaleString()}</span>
                  </div>
                  {(item.extras ?? item.modifiers ?? []).length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {(item.extras ?? []).map((extra) => (
                        <li key={`${extra.slug ?? extra.label}-${extra.price}`}>
                          + {extra.label}
                          {extra.price ? ` — Rs ${extra.price.toLocaleString()}` : ""}
                        </li>
                      ))}
                      {!item.extras?.length &&
                        (item.modifiers ?? []).map((modifier) => (
                          <li key={`${modifier.groupCode}-${modifier.optionCode}`}>
                            + {modifier.optionName}
                            {modifier.priceDelta
                              ? ` — Rs ${modifier.priceDelta.toLocaleString()}`
                              : ""}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-brand-red">Rs {tracking.totalAmount.toLocaleString()}</span>
            </div>

            {canCancelOnline && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-sm text-amber-900">
                  You can cancel this order online while it is still pending (within 15 minutes of placing it).
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl border-brand-red text-brand-red hover:bg-brand-red/5"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                >
                  {cancelling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel order
                    </>
                  )}
                </Button>
              </div>
            )}

            <Link href="/orders">
              <Button variant="outline" className="rounded-2xl">View order history</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

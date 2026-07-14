import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Loader2, PackageSearch } from "lucide-react";
import { isApiConfigured } from "@/lib/api";
import { fetchOrderTracking } from "@/lib/telepizza-api";
import { getLocalOrder } from "@/lib/customer-store";
import type { OrderTrackingResponse } from "@/lib/telepizza-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_STEPS = ["pending", "confirmed", "preparing", "ready", "dispatched", "completed"];

export default function TrackOrder() {
  const [, params] = useRoute("/track/:orderNumber");
  const initialOrderNumber = params?.orderNumber ?? "";
  const initialPhone = new URLSearchParams(window.location.search).get("phone") ?? "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [tracking, setTracking] = useState<OrderTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracking = async (nextOrderNumber = orderNumber, nextPhone = phone) => {
    setLoading(true);
    setError(null);
    setTracking(null);

    try {
      if (isApiConfigured && !nextOrderNumber.startsWith("LOC-")) {
        const remote = await fetchOrderTracking(nextOrderNumber, nextPhone);
        setTracking(remote);
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
        })),
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load tracking.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber && initialPhone) {
      void loadTracking(initialOrderNumber, initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {error && <p className="text-brand-red mb-4">{error}</p>}

        {tracking && (
          <div className="rounded-3xl border border-border bg-white p-6 space-y-6">
            <div className="flex items-center gap-3">
              <PackageSearch className="w-6 h-6 text-brand-red" />
              <div>
                <div className="font-[var(--font-display)] font-bold text-xl">{tracking.orderNumber}</div>
                <div className="text-sm text-muted-foreground capitalize">{tracking.status.replace("-", " ")}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STATUS_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl px-3 py-2 text-xs font-[var(--font-accent)] font-semibold capitalize ${
                    index <= activeIndex ? "bg-brand-red text-white" : "bg-brand-cream text-muted-foreground"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {tracking.items.map((item, index) => (
                <div key={`${item.productName}-${index}`} className="flex justify-between text-sm border-b border-border pb-2">
                  <span>
                    {item.productName}
                    {item.variantName ? ` (${item.variantName})` : ""} x{item.quantity}
                  </span>
                  <span className="font-bold">Rs {item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-brand-red">Rs {tracking.totalAmount.toLocaleString()}</span>
            </div>

            <Link href="/orders">
              <Button variant="outline" className="rounded-2xl">View order history</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

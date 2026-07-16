import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemTotal } from "@/data/cart-config";
import { CheckoutSubmitError, submitWebsiteOrder } from "@/lib/submit-order";
import { isApiConfigured } from "@/lib/api";
import { quoteOrder } from "@/lib/telepizza-api";
import {
  buildQuoteRequest,
  buildWhatsAppOrderUrl,
  checkoutAttemptFingerprint,
  isQuoteExpired,
  isQuoteExpiringSoon,
  mapCheckoutApiError,
} from "@/lib/checkout-order";
import type { QuoteOrderResponse } from "@/lib/telepizza-types";

type QuotePhase = "idle" | "loading" | "ready" | "expiring" | "expired" | "error";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { state, subtotal, clearCart, setOrderDetails } = useCart();
  const { selectedBranch } = useBranch();
  const { profile, user, session } = useAuth();
  const [contactName, setContactName] = useState(profile?.fullName ?? "");
  const [contactPhone, setContactPhone] = useState(profile?.phone ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState(state.order.orderInstructions);
  const [couponCode, setCouponCode] = useState(state.order.couponCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotePhase, setQuotePhase] = useState<QuotePhase>(isApiConfigured ? "loading" : "idle");
  const [serverTotals, setServerTotals] = useState<QuoteOrderResponse["totals"] | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<{
    expiresAt: string;
    warnings: string[];
    quoteId: string;
  } | null>(null);
  const [serverQuoteItems, setServerQuoteItems] = useState<QuoteOrderResponse["items"] | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const quoteRequestSeq = useRef(0);
  const lastFingerprint = useRef<string>("");
  const submitInFlight = useRef(false);

  const deliveryMode = state.order.deliveryMode;

  const cartItems = useMemo(
    () =>
      state.items.map((item) => ({
        menuSlug: item.menuSlug,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        instructions: item.instructions,
        extras: item.extras,
      })),
    [state.items],
  );

  const orderPayloadItems = useMemo(
    () =>
      cartItems.map((item) => ({
        menuItemSlug: item.menuSlug,
        variantLabel: item.variant,
        quantity: item.quantity,
        unitPrice: item.price,
        productName: item.name,
        variantName: item.variant,
        instructions: item.instructions,
        extras: item.extras,
      })),
    [cartItems],
  );

  const attemptFingerprint = useMemo(
    () =>
      checkoutAttemptFingerprint({
        branchCode: selectedBranch.code ?? selectedBranch.id,
        orderType: deliveryMode,
        contactName,
        contactPhone,
        deliveryAddress: deliveryMode === "delivery" ? deliveryAddress : undefined,
        couponCode,
        items: orderPayloadItems,
      }),
    [
      selectedBranch.code,
      selectedBranch.id,
      deliveryMode,
      contactName,
      contactPhone,
      deliveryAddress,
      couponCode,
      orderPayloadItems,
    ],
  );

  useEffect(() => {
    if (state.items.length === 0) {
      navigate("/menu");
    }
  }, [state.items.length, navigate]);

  useEffect(() => {
    setContactName(profile?.fullName ?? user?.email?.split("@")[0] ?? "");
    setContactPhone(profile?.phone ?? "");
  }, [profile, user]);

  // Rotate idempotency key when material checkout data changes
  useEffect(() => {
    if (!lastFingerprint.current) {
      lastFingerprint.current = attemptFingerprint;
      return;
    }
    if (lastFingerprint.current !== attemptFingerprint) {
      lastFingerprint.current = attemptFingerprint;
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [attemptFingerprint]);

  const refreshQuote = useCallback(async () => {
    if (!isApiConfigured || !selectedBranch || cartItems.length === 0) {
      setQuotePhase("idle");
      return null;
    }

    const seq = ++quoteRequestSeq.current;
    setQuotePhase("loading");
    setError(null);

    try {
      const request = buildQuoteRequest({
        branchCode: selectedBranch.code ?? selectedBranch.id,
        orderType: deliveryMode,
        couponCode,
        contactPhone,
        cartItems,
      });
      const q = await quoteOrder(request);
      if (seq !== quoteRequestSeq.current) return null;

      setServerTotals(q.totals);
      setServerQuoteItems(q.items);
      setQuoteStatus({
        expiresAt: q.expiresAt,
        warnings: q.warnings.map((w) => w.message),
        quoteId: q.quoteId,
      });
      setQuotePhase(isQuoteExpired(q.expiresAt) ? "expired" : "ready");
      return q;
    } catch (e) {
      if (seq !== quoteRequestSeq.current) return null;
      const code = e instanceof Error && "code" in e ? String((e as { code?: string }).code) : undefined;
      setQuotePhase("error");
      setError(mapCheckoutApiError(code, e instanceof Error ? e.message : "Quote failed."));
      return null;
    }
  }, [selectedBranch, cartItems, deliveryMode, couponCode, contactPhone]);

  useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);

  // Tick quote expiry state without overlapping requests
  useEffect(() => {
    if (!quoteStatus?.expiresAt) return;
    const timer = window.setInterval(() => {
      if (isQuoteExpired(quoteStatus.expiresAt)) {
        setQuotePhase("expired");
      } else if (isQuoteExpiringSoon(quoteStatus.expiresAt)) {
        setQuotePhase("expiring");
      } else if (quotePhase !== "loading" && quotePhase !== "error") {
        setQuotePhase("ready");
      }
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [quoteStatus?.expiresAt, quotePhase]);

  const whatsappFallbackUrl = useMemo(
    () =>
      buildWhatsAppOrderUrl({
        branchPhone: selectedBranch.phone,
        contactName: contactName.trim() || "Customer",
        contactPhone: contactPhone.trim(),
        items: orderPayloadItems,
        orderType: deliveryMode,
        deliveryAddress: deliveryMode === "delivery" ? deliveryAddress : undefined,
      }),
    [selectedBranch.phone, contactName, contactPhone, orderPayloadItems, deliveryMode, deliveryAddress],
  );

  const handleSubmit = async () => {
    if (submitInFlight.current || isSubmitting) return;
    setError(null);

    if (!contactName.trim() || !contactPhone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    if (deliveryMode === "delivery" && !deliveryAddress.trim()) {
      setError("Delivery address is required.");
      return;
    }

    if (isApiConfigured && !quoteStatus?.quoteId) {
      setError("Waiting for server quote. Please try again in a moment.");
      return;
    }

    let activeQuoteId = quoteStatus?.quoteId;
    if (isApiConfigured && quoteStatus?.expiresAt && isQuoteExpired(quoteStatus.expiresAt)) {
      const refreshed = await refreshQuote();
      if (!refreshed) {
        setError("Quote expired. Please refresh and try again.");
        return;
      }
      activeQuoteId = refreshed.quoteId;
    }

    setOrderDetails({
      orderInstructions: notes,
      couponCode,
      deliveryAddress,
    });

    setIsSubmitting(true);
    submitInFlight.current = true;

    try {
      const result = await submitWebsiteOrder(
        {
          branchCode: selectedBranch.code ?? selectedBranch.id,
          branchName: selectedBranch.name,
          orderType: deliveryMode,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          deliveryAddress: deliveryMode === "delivery" ? deliveryAddress.trim() : undefined,
          notes: notes.trim() || undefined,
          couponCode: couponCode.trim() || undefined,
          items: orderPayloadItems,
        },
        {
          idempotencyKey,
          quoteId: activeQuoteId ?? "",
          accessToken: session?.access_token,
          requireApiSuccess: true,
        },
      );

      if (result.source !== "api") {
        setError("Order saved locally only — confirm on WhatsApp. Cart was not cleared.");
        return;
      }

      clearCart();
      const successParams = new URLSearchParams({
        phone: contactPhone.trim(),
        source: result.source,
        status: result.status,
        total: String(result.totalAmount),
      });
      navigate(`/order-success/${encodeURIComponent(result.orderNumber)}?${successParams.toString()}`);
    } catch (submitError) {
      if (submitError instanceof CheckoutSubmitError) {
        setError(submitError.message);
        if (submitError.code === "QUOTE_EXPIRED" || submitError.code === "QUOTE_PAYLOAD_MISMATCH") {
          void refreshQuote();
        }
      } else {
        setError(submitError instanceof Error ? submitError.message : "Could not place order.");
      }
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const quoteStatusLabel = (() => {
    switch (quotePhase) {
      case "loading":
        return "Calculating server totals…";
      case "expiring":
        return "Quote expiring soon — refresh if needed.";
      case "expired":
        return "Quote expired — refresh before placing order.";
      case "error":
        return "Could not load server quote.";
      case "ready":
        return quoteStatus
          ? `Quote valid until ${new Date(quoteStatus.expiresAt).toLocaleTimeString()}.`
          : null;
      default:
        return null;
    }
  })();

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-5xl">
        <h1 className="brand-heading text-3xl md:text-4xl mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-8">Ordering from {selectedBranch.name}</p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <section className="rounded-3xl border border-border bg-white p-6 space-y-4">
              <h2 className="font-[var(--font-display)] font-bold text-xl">Contact details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Full name</Label>
                  <Input
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
              </div>
              {!user && (
                <p className="text-sm text-muted-foreground">
                  <Link href="/register" className="text-brand-red font-semibold hover:underline">
                    Create an account
                  </Link>{" "}
                  to save your details for next time.
                </p>
              )}
            </section>

            {deliveryMode === "delivery" && (
              <section className="rounded-3xl border border-border bg-white p-6 space-y-3">
                <h2 className="font-[var(--font-display)] font-bold text-xl">Delivery address</h2>
                <Textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House #, street, area, Multan"
                  className="rounded-2xl min-h-[90px]"
                />
              </section>
            )}

            <section className="rounded-3xl border border-border bg-white p-6 space-y-3">
              <h2 className="font-[var(--font-display)] font-bold text-xl">Order notes</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Landmark, gate code, special requests..."
                className="rounded-2xl min-h-[90px]"
              />
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Promo code (optional)"
                className="rounded-2xl"
              />
            </section>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-border bg-white p-6 sticky top-24 space-y-4">
              <h2 className="font-[var(--font-display)] font-bold text-xl">Order summary</h2>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {state.items.map((item, index) => {
                  const serverLine = serverQuoteItems?.[index];
                  const displayTotal = serverLine
                    ? serverLine.lineTotal
                    : getLineItemTotal(item.price, item.extras, item.quantity);
                  return (
                  <div key={item.id} className="text-sm border-b border-border pb-3">
                    <div className="font-semibold">{item.name}</div>
                    {item.variant && <div className="text-muted-foreground text-xs">{item.variant}</div>}
                    <div className="text-brand-red font-bold">
                      Rs {displayTotal.toLocaleString()}
                      {serverLine ? (
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">(server)</span>
                      ) : null}
                    </div>
                  </div>
                  );
                })}
              </div>

              {serverTotals ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Subtotal</span>
                    <span className="text-brand-red">Rs {serverTotals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span>Rs {serverTotals.discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery fee</span>
                    <span>Rs {serverTotals.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tax</span>
                    <span>Rs {serverTotals.taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-brand-red">Rs {serverTotals.totalAmount.toLocaleString()}</span>
                  </div>
                  {quoteStatusLabel && (
                    <div
                      className={`text-xs ${quotePhase === "expired" || quotePhase === "error" ? "text-brand-red" : "text-muted-foreground"}`}
                    >
                      {quoteStatusLabel}
                    </div>
                  )}
                  {quoteStatus?.warnings?.length ? (
                    <ul className="text-xs text-amber-600 list-disc pl-5">
                      {quoteStatus.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                  {isApiConfigured && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-0 h-auto text-xs text-brand-red"
                      onClick={() => void refreshQuote()}
                      disabled={quotePhase === "loading"}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${quotePhase === "loading" ? "animate-spin" : ""}`} />
                      Refresh quote
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Subtotal (estimate)</span>
                    <span className="text-brand-red">Rs {subtotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isApiConfigured
                      ? "Server totals will appear when quote loads."
                      : "API not configured — use WhatsApp to confirm totals."}
                  </p>
                </>
              )}

              {error && <p className="text-sm text-brand-red">{error}</p>}

              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  (isApiConfigured && (quotePhase === "loading" || quotePhase === "expired"))
                }
                className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place Order"}
              </Button>

              <a href={whatsappFallbackUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full rounded-2xl">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Order on WhatsApp instead
                </Button>
              </a>

              <Link href="/menu">
                <Button variant="outline" className="w-full rounded-2xl">
                  Continue shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

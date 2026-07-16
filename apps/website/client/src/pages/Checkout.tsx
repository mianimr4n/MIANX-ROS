import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, MapPin, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLineItemTotal } from "@/data/cart-config";
import { submitWebsiteOrder } from "@/lib/submit-order";
import { isApiConfigured } from "@/lib/api";
import { quoteOrder } from "@/lib/telepizza-api";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { state, subtotal, clearCart, setOrderDetails } = useCart();
  const { selectedBranch } = useBranch();
  const { profile, user } = useAuth();
  const [contactName, setContactName] = useState(profile?.fullName ?? "");
  const [contactPhone, setContactPhone] = useState(profile?.phone ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState(state.order.orderInstructions);
  const [couponCode, setCouponCode] = useState(state.order.couponCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverTotals, setServerTotals] = useState<{
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    deliveryFee: number;
    totalAmount: number;
  } | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<{ expiresAt: string; warnings: string[] } | null>(null);

  useEffect(() => {
    if (state.items.length === 0) {
      navigate("/menu");
    }
  }, [state.items.length, navigate]);

  // Load server quote on entry (best-effort; UI still works offline)
  useEffect(() => {
    let active = true;
    async function loadQuote() {
      if (!isApiConfigured || !selectedBranch) return;
      setError(null);
      try {
        const q = await quoteOrder({
          branchCode: selectedBranch.code ?? selectedBranch.id,
          orderType: state.order.deliveryMode,
          couponCode,
          contactPhone,
          items: state.items.map((item) => ({
            menuItemSlug: item.menuSlug,
            variantLabel: item.variant,
            quantity: item.quantity,
            unitPrice: item.price,
            productName: item.name,
            variantName: item.variant,
            instructions: item.instructions,
            extras: item.extras,
          })),
        });
        if (!active) return;
        setServerTotals(q.totals);
        setQuoteStatus({
          expiresAt: q.expiresAt,
          warnings: q.warnings.map((w) => w.message),
        });
      } catch (e) {
        // Non-fatal — fall back to local subtotal display
        console.warn("Quote load failed", e);
      }
    }
    loadQuote();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(state.items), selectedBranch?.id, state.order.deliveryMode, couponCode, contactPhone]);

  useEffect(() => {
    setContactName(profile?.fullName ?? user?.email?.split("@")[0] ?? "");
    setContactPhone(profile?.phone ?? "");
  }, [profile, user]);

  const deliveryMode = state.order.deliveryMode;

  const handleSubmit = async () => {
    setError(null);

    if (!contactName.trim() || !contactPhone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    if (deliveryMode === "delivery" && !deliveryAddress.trim()) {
      setError("Delivery address is required.");
      return;
    }

    setOrderDetails({
      orderInstructions: notes,
      couponCode,
      deliveryAddress,
    });

    setIsSubmitting(true);

    try {
      const result = await submitWebsiteOrder({
        branchCode: selectedBranch.code ?? selectedBranch.id,
        branchName: selectedBranch.name,
        orderType: deliveryMode,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        deliveryAddress: deliveryMode === "delivery" ? deliveryAddress.trim() : undefined,
        notes: notes.trim() || undefined,
        couponCode: couponCode.trim() || undefined,
        items: state.items.map((item) => ({
          menuItemSlug: item.menuSlug,
          variantLabel: item.variant,
          quantity: item.quantity,
          unitPrice: item.price,
          productName: item.name,
          variantName: item.variant,
          instructions: item.instructions,
          extras: item.extras,
        })),
      });

      clearCart();
      navigate(`/order-success/${encodeURIComponent(result.orderNumber)}?phone=${encodeURIComponent(contactPhone.trim())}&source=${result.source}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-5xl">
        <h1 className="brand-heading text-3xl md:text-4xl mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-8">
          Ordering from {selectedBranch.name}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <section className="rounded-3xl border border-border bg-white p-6 space-y-4">
              <h2 className="font-[var(--font-display)] font-bold text-xl">Contact details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Full name</Label>
                  <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="rounded-2xl" />
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
                {state.items.map((item) => (
                  <div key={item.id} className="text-sm border-b border-border pb-3">
                    <div className="font-semibold">{item.name}</div>
                    {item.variant && <div className="text-muted-foreground text-xs">{item.variant}</div>}
                    <div className="text-brand-red font-bold">
                      Rs {getLineItemTotal(item.price, item.extras, item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
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
                  {quoteStatus && (
                    <div className="text-xs text-muted-foreground">
                      Quote expires at {new Date(quoteStatus.expiresAt).toLocaleTimeString()}.
                    </div>
                  )}
                  {quoteStatus?.warnings?.length ? (
                    <ul className="text-xs text-amber-600 list-disc pl-5">
                      {quoteStatus.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between font-bold text-lg">
                    <span>Subtotal</span>
                    <span className="text-brand-red">Rs {subtotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Delivery charges and taxes confirmed by branch on WhatsApp.
                  </p>
                </>
              )}
              {error && <p className="text-sm text-brand-red">{error}</p>}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-2xl brand-gradient text-white font-bold py-6"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place Order"}
              </Button>
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

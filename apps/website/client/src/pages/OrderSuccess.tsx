import { Link, useRoute } from "wouter";
import { AlertTriangle, CheckCircle2, MapPin, MessageCircle, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/contexts/BranchContext";
import { BrandLogoMark } from "@/components/BrandLogo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { BRAND } from "@/lib/brand";

function CelebrationBurst({ active }: { active: boolean }) {
  const reduced = usePrefersReducedMotion();
  if (!active || reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-8 mx-auto h-40 w-full max-w-md overflow-hidden" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-0 h-2 w-2 rounded-full xp-float"
          style={{
            background: i % 3 === 0 ? "#E31E24" : i % 3 === 1 ? "#F5B800" : "#FF6B35",
            marginLeft: `${(i - 7) * 14}px`,
            animationDelay: `${i * 0.08}s`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

export default function OrderSuccess() {
  const [, params] = useRoute("/order-success/:orderNumber");
  const orderNumber = params?.orderNumber ?? "";
  const search = new URLSearchParams(window.location.search);
  const phone = search.get("phone") ?? "";
  const source = search.get("source") ?? "local";
  const status = search.get("status") ?? "pending";
  const branchName = search.get("branch");
  const orderType = search.get("orderType");
  const totalParam = search.get("total");
  const parsedTotal = totalParam ? Number(totalParam) : NaN;
  const isConfirmedApiOrder = source === "api" && !orderNumber.startsWith("LOC-");
  const isLocalFallback = source === "local" || orderNumber.startsWith("LOC-");
  const { selectedBranch } = useBranch();

  const whatsappUrl = (() => {
    const orderingPhone = BRAND.phone.replace(/\D/g, "").replace(/^0/, "");
    const message = encodeURIComponent(
      `Hi Telepizza, I placed order ${orderNumber} on the website. Please confirm.`,
    );
    return `https://wa.me/92${orderingPhone}?text=${message}`;
  })();

  return (
    <div className="relative min-h-screen bg-background py-16 page-enter">
      <CelebrationBurst active={isConfirmedApiOrder} />
      <div className="container max-w-xl text-center">
        <BrandLogoMark className="mx-auto mb-4" />
        {isConfirmedApiOrder ? (
          <CheckCircle2 className="w-12 h-12 text-brand-red mx-auto mb-4" />
        ) : (
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        )}
        <p className="text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs mb-3">
          {BRAND.tagline}
        </p>
        <h1 className="brand-heading text-3xl md:text-4xl mb-3">
          {isConfirmedApiOrder ? "Order Received" : "Order Saved — Pending Confirmation"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isConfirmedApiOrder
            ? "Your order was sent to the branch system and is awaiting confirmation."
            : "This order is saved locally only and is not confirmed by the branch until you complete checkout on WhatsApp."}
        </p>
        <div className="rounded-3xl border border-border bg-white p-6 mb-6 text-left space-y-3 shadow-sm">
          <div>
            <div className="text-sm text-muted-foreground">Order reference</div>
            <div className="font-[var(--font-accent)] font-extrabold text-2xl text-brand-red">{orderNumber}</div>
          </div>
          {isConfirmedApiOrder && (
            <>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-semibold capitalize">{status.replace("-", " ")}</div>
              </div>
              {Number.isFinite(parsedTotal) && (
                <div>
                  <div className="text-sm text-muted-foreground">Server total</div>
                  <div className="font-bold text-lg text-brand-red">Rs {parsedTotal.toLocaleString()}</div>
                </div>
              )}
              {orderType === "delivery" || orderType === "pickup" ? (
                <div className="flex items-start gap-2">
                  <ReceiptText className="mt-0.5 h-4 w-4 text-brand-red" />
                  <div>
                    <div className="text-sm text-muted-foreground">Payment method</div>
                    <div className="font-semibold">
                      {orderType === "delivery" ? "Cash on delivery" : "Pay when you collect"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Payment status will be confirmed by the branch.
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
          {isLocalFallback && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">
              Local reference only — not a confirmed branch order. Use WhatsApp to confirm with{" "}
              {BRAND.phone}.
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <MapPin className="w-4 h-4 text-brand-red" />
            {branchName || selectedBranch.name}
          </div>
          <p className="rounded-2xl bg-brand-cream px-4 py-3 text-sm text-muted-foreground">
            The branch will confirm timing after reviewing your order. No estimated arrival time is available yet.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isConfirmedApiOrder && (
            <Link href={`/track/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`}>
              <Button className="btn-press rounded-2xl brand-gradient text-white font-bold px-8">Track Order</Button>
            </Link>
          )}
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="btn-press rounded-2xl px-8">
              <MessageCircle className="w-4 h-4 mr-2" />
              {isConfirmedApiOrder ? "Message branch on WhatsApp" : "Confirm on WhatsApp"}
            </Button>
          </a>
          <Link href="/orders">
            <Button variant="outline" className="btn-press rounded-2xl px-8">Order history</Button>
          </Link>
          <Link href="/menu">
            <Button variant="ghost" className="btn-press rounded-2xl px-8">Back to menu</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

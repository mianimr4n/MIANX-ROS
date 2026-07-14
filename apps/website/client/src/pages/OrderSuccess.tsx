import { Link, useRoute } from "wouter";
import { CheckCircle2, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/contexts/BranchContext";
import { BrandLogoMark } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

export default function OrderSuccess() {
  const [, params] = useRoute("/order-success/:orderNumber");
  const orderNumber = params?.orderNumber ?? "";
  const search = new URLSearchParams(window.location.search);
  const phone = search.get("phone") ?? "";
  const source = search.get("source") ?? "local";
  const { selectedBranch } = useBranch();

  const whatsappUrl = (() => {
    const branchPhone = selectedBranch.phone.replace(/-/g, "").replace(/^0/, "");
    const message = encodeURIComponent(
      `Hi Telepizza, I placed order ${orderNumber} on the website. Please confirm.`,
    );
    return `https://wa.me/92${branchPhone}?text=${message}`;
  })();

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container max-w-xl text-center">
        <BrandLogoMark className="mx-auto mb-4" />
        <CheckCircle2 className="w-12 h-12 text-brand-red mx-auto mb-4" />
        <p className="text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs mb-3">
          {BRAND.tagline}
        </p>
        <h1 className="brand-heading text-3xl md:text-4xl mb-3">Order Received</h1>
        <p className="text-muted-foreground mb-6">
          {source === "api"
            ? "Your order was sent to the branch system."
            : "Your order was saved locally and can be confirmed on WhatsApp."}
        </p>
        <div className="rounded-3xl border border-border bg-white p-6 mb-6 text-left space-y-2">
          <div className="text-sm text-muted-foreground">Order number</div>
          <div className="font-[var(--font-accent)] font-extrabold text-2xl text-brand-red">{orderNumber}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
            <MapPin className="w-4 h-4 text-brand-red" />
            {selectedBranch.name}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/track/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`}>
            <Button className="rounded-2xl brand-gradient text-white font-bold px-8">Track Order</Button>
          </Link>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="rounded-2xl px-8">
              <MessageCircle className="w-4 h-4 mr-2" />
              Confirm on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

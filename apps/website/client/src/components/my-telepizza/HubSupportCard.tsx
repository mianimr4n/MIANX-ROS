import { MessageCircle, Phone, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useBranch } from "@/contexts/BranchContext";

function toWhatsAppUrl(phoneDisplay: string, text?: string): string {
  const digits = phoneDisplay.replace(/\D/g, "");
  const international = digits.startsWith("92")
    ? digits
    : digits.startsWith("0")
      ? `92${digits.slice(1)}`
      : digits;
  const base = `https://wa.me/${international}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

type HubSupportCardProps = {
  orderNumber?: string;
  contactPhone?: string;
};

export function HubSupportCard({ orderNumber, contactPhone }: HubSupportCardProps) {
  const { selectedBranch } = useBranch();
  const branchPhone =
    selectedBranch.status === "operating" ? selectedBranch.phone : BRAND.phone;
  const waText = orderNumber
    ? `Hi Telepizza, I need help with order ${orderNumber}.`
    : "Hi Telepizza, I need help with my order.";

  return (
    <section
      className="rounded-3xl border border-border bg-white p-4 shadow-sm sm:p-6 space-y-4"
      aria-labelledby="my-telepizza-support-heading"
    >
      <div>
        <h2 id="my-telepizza-support-heading" className="font-bold text-lg flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-brand-red" aria-hidden="true" />
          Need help?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Reach your Multan branch or message us on WhatsApp. Guest checkout and tracking stay
          available without signing in.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={toWhatsAppUrl(BRAND.phone, waText)} target="_blank" rel="noreferrer">
          <Button type="button" className="rounded-2xl brand-gradient text-white font-semibold">
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            WhatsApp support
          </Button>
        </a>
        <a href={`tel:+92${branchPhone.replace(/-/g, "").replace(/^0/, "")}`}>
          <Button type="button" variant="outline" className="rounded-2xl">
            <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
            Call {branchPhone}
          </Button>
        </a>
        {orderNumber && contactPhone ? (
          <Link
            href={`/track/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(contactPhone)}`}
          >
            <Button type="button" variant="outline" className="rounded-2xl">
              Track this order
            </Button>
          </Link>
        ) : (
          <Link href="/track">
            <Button type="button" variant="outline" className="rounded-2xl">
              Track an order
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

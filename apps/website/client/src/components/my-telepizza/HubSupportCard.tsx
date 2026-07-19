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
      className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-white via-brand-cream/40 to-white shadow-sm"
      aria-labelledby="my-telepizza-support-heading"
    >
      <div className="h-1 brand-gradient" aria-hidden="true" />
      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <h2
            id="my-telepizza-support-heading"
            className="flex items-center gap-2 font-bold text-lg text-brand-charcoal"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-red/10">
              <HelpCircle className="h-5 w-5 text-brand-red" aria-hidden="true" />
            </span>
            Need help?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Reach your Multan branch or message us on WhatsApp. Guest checkout and tracking stay
            available without signing in.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={toWhatsAppUrl(BRAND.phone, waText)}
            target="_blank"
            rel="noreferrer"
            className="sm:flex-1 sm:min-w-[10rem]"
          >
            <Button
              type="button"
              className="w-full rounded-2xl brand-gradient text-white font-semibold focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
            >
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              WhatsApp support
            </Button>
          </a>
          <a
            href={`tel:+92${branchPhone.replace(/-/g, "").replace(/^0/, "")}`}
            className="sm:flex-1 sm:min-w-[10rem]"
          >
            <Button type="button" variant="outline" className="w-full rounded-2xl font-semibold">
              <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
              Call {branchPhone}
            </Button>
          </a>
          {orderNumber && contactPhone ? (
            <Link
              href={`/track/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(contactPhone)}`}
              className="sm:flex-1 sm:min-w-[10rem]"
            >
              <Button type="button" variant="outline" className="w-full rounded-2xl font-semibold">
                Track this order
              </Button>
            </Link>
          ) : (
            <Link href="/track" className="sm:flex-1 sm:min-w-[10rem]">
              <Button type="button" variant="outline" className="w-full rounded-2xl font-semibold">
                Track an order
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

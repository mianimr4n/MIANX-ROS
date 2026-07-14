import { Clock, Gift } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Loyalty() {
  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-2xl">
        <div className="rounded-3xl brand-gradient text-white p-8 mb-6 relative overflow-hidden">
          <Gift className="w-10 h-10 mb-4" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-[var(--font-accent)] font-bold uppercase tracking-wider mb-4">
            <Clock className="w-3.5 h-3.5" />
            Coming Soon
          </span>
          <h1 className="font-[var(--font-display)] font-extrabold text-3xl mb-2">Telepizza Loyalty</h1>
          <p className="text-white/85 max-w-lg">
            Earn rewards on every order once our loyalty program launches with full customer accounts and order history.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 space-y-4">
          <p className="text-muted-foreground">
            Loyalty points are not available yet. We are connecting rewards to real customer profiles and verified order
            history so points stay with you across devices and visits.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>Points tied to your Telepizza account</li>
            <li>Redeemable rewards on future orders</li>
            <li>Synced with website, app, and in-store orders</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/menu">
              <Button className="rounded-2xl brand-gradient text-white">Browse Menu</Button>
            </Link>
            <Link href="/account">
              <Button variant="outline" className="rounded-2xl">
                My Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

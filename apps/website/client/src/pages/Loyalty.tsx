import { Gift } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { getLoyaltyPoints } from "@/lib/customer-store";
import { Button } from "@/components/ui/button";

export default function Loyalty() {
  const { user, isAuthenticated } = useAuth();
  const points = user ? getLoyaltyPoints(user.phone) : 0;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-2xl">
        <div className="rounded-3xl brand-gradient text-white p-8 mb-6">
          <Gift className="w-10 h-10 mb-4" />
          <h1 className="font-[var(--font-display)] font-extrabold text-3xl mb-2">Telepizza Loyalty</h1>
          <p className="text-white/85">
            Earn 1 point for every Rs 100 spent through website checkout. Rewards catalog launches with full digital ordering rollout.
          </p>
        </div>

        {isAuthenticated && user ? (
          <div className="rounded-3xl border border-border bg-white p-6 text-center">
            <div className="text-sm text-muted-foreground mb-1">Your balance</div>
            <div className="font-[var(--font-accent)] font-extrabold text-5xl text-brand-red mb-2">{points}</div>
            <div className="text-muted-foreground text-sm">Points are tracked locally until the loyalty backend is connected.</div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-white p-6 text-center">
            <p className="text-muted-foreground mb-4">Register to start collecting loyalty points.</p>
            <Link href="/register"><Button className="rounded-2xl brand-gradient text-white">Create account</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}

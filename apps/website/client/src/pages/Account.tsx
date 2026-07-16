import { Link } from "wouter";
import { Bell, Gift, LogOut, Package, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function providerLabel(user: { app_metadata?: { provider?: string; providers?: string[] } } | null): string | null {
  if (!user) return null;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) return "Google";
  if (user.app_metadata?.provider === "google") return "Google";
  if (Array.isArray(providers) && providers.includes("email")) return "Email";
  if (user.app_metadata?.provider === "email") return "Email";
  return null;
}

export default function Account() {
  const { profile, user, isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container max-w-md text-center text-muted-foreground">Loading account…</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container max-w-md text-center">
          <UserCircle2 className="w-16 h-16 text-brand-red mx-auto mb-4" />
          <h1 className="brand-heading text-3xl mb-3">My Account</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to manage your Telepizza customer account.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login">
              <Button className="rounded-2xl brand-gradient text-white">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="rounded-2xl">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.fullName || user.email?.split("@")[0] || "Customer";
  const email = profile?.email || user.email || null;
  const signedInWith = providerLabel(user);

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="brand-heading text-3xl mb-1">{displayName}</h1>
            {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
            {signedInWith ? (
              <p className="text-xs text-muted-foreground mt-1">Signed in with {signedInWith}</p>
            ) : null}
            {profile?.phone ? (
              <p className="text-muted-foreground mt-2">{profile.phone}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Phone can be added at checkout</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void signOut();
            }}
            className="rounded-2xl"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/orders">
            <div className="rounded-3xl border border-border bg-white p-5 hover:border-brand-red/30 transition-colors">
              <Package className="w-6 h-6 text-brand-red mb-3" />
              <div className="font-bold">My Orders</div>
              <div className="text-sm text-muted-foreground">View order history</div>
            </div>
          </Link>
          <div className="rounded-3xl border border-border bg-white/70 p-5 opacity-80">
            <Gift className="w-6 h-6 text-brand-red mb-3" />
            <div className="font-bold">Loyalty</div>
            <div className="text-sm text-muted-foreground">Coming Soon</div>
          </div>
          <div className="rounded-3xl border border-border bg-white/70 p-5 opacity-80">
            <Bell className="w-6 h-6 text-brand-red mb-3" />
            <div className="font-bold">Notifications</div>
            <div className="text-sm text-muted-foreground">Coming Soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}

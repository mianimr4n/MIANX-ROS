import { Link } from "wouter";
import { Bell, Gift, LogOut, Package, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getLoyaltyPoints, listNotifications } from "@/lib/customer-store";

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background py-16">
        <div className="container max-w-md text-center">
          <UserCircle2 className="w-16 h-16 text-brand-red mx-auto mb-4" />
          <h1 className="brand-heading text-3xl mb-3">My Account</h1>
          <p className="text-muted-foreground mb-6">Login or register to view orders, loyalty, and notifications.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login"><Button className="rounded-2xl brand-gradient text-white">Login</Button></Link>
            <Link href="/register"><Button variant="outline" className="rounded-2xl">Register</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const points = getLoyaltyPoints(user.phone);
  const unreadNotifications = listNotifications(user.phone).filter((entry) => !entry.read).length;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="brand-heading text-3xl mb-1">{user.name}</h1>
            <p className="text-muted-foreground">{user.phone}</p>
            {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
          </div>
          <Button variant="outline" onClick={logout} className="rounded-2xl">
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
          <Link href="/loyalty">
            <div className="rounded-3xl border border-border bg-white p-5 hover:border-brand-red/30 transition-colors">
              <Gift className="w-6 h-6 text-brand-red mb-3" />
              <div className="font-bold">Loyalty Points</div>
              <div className="text-sm text-brand-red font-bold">{points} pts</div>
            </div>
          </Link>
          <Link href="/notifications">
            <div className="rounded-3xl border border-border bg-white p-5 hover:border-brand-red/30 transition-colors">
              <Bell className="w-6 h-6 text-brand-red mb-3" />
              <div className="font-bold">Notifications</div>
              <div className="text-sm text-muted-foreground">{unreadNotifications} unread</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

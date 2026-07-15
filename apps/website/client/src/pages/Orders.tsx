import { Link } from "wouter";
import { listLocalOrders } from "@/lib/customer-store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const { profile, user, isAuthenticated } = useAuth();
  const orderKey = profile?.phone || user?.email || user?.id;
  const orders = listLocalOrders(orderKey);

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Login to view your orders.</p>
        <Link href="/login"><Button className="rounded-2xl brand-gradient text-white">Login</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl">
        <h1 className="brand-heading text-3xl mb-6">My Orders</h1>
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground">
            No orders yet. Place your first order from the menu.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-3xl border border-border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="font-[var(--font-accent)] font-bold text-brand-red">{order.orderNumber}</div>
                  <div className="text-sm capitalize text-muted-foreground">{order.status}</div>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {new Date(order.createdAt).toLocaleString()} · {order.branchName}
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-bold">Rs {order.totalAmount.toLocaleString()}</div>
                  <Link href={`/track/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(order.contactPhone)}`}>
                    <Button variant="outline" size="sm" className="rounded-2xl">Track</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

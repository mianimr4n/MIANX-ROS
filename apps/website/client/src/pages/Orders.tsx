import { useMemo, useState } from "react";
import { Link } from "wouter";
import { listLocalOrders, type StoredOrder } from "@/lib/customer-store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type OrderTab = "active" | "completed" | "cancelled";

function bucketForStatus(status: string): OrderTab {
  const normalized = status.trim().toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized === "completed" || normalized === "delivered") return "completed";
  return "active";
}

function filterOrders(orders: StoredOrder[], tab: OrderTab): StoredOrder[] {
  return orders.filter((order) => bucketForStatus(order.status) === tab);
}

export default function Orders() {
  const { profile, user, isAuthenticated } = useAuth();
  const orderKey = profile?.phone || user?.email || user?.id;
  const orders = listLocalOrders(orderKey);
  const [tab, setTab] = useState<OrderTab>("active");

  const filtered = useMemo(() => filterOrders(orders, tab), [orders, tab]);

  const counts = useMemo(
    () => ({
      active: filterOrders(orders, "active").length,
      completed: filterOrders(orders, "completed").length,
      cancelled: filterOrders(orders, "cancelled").length,
    }),
    [orders],
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Login to view your orders.</p>
        <Link href="/login">
          <Button className="rounded-2xl brand-gradient text-white">Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Account
            </p>
            <h1 className="brand-heading text-3xl">My Orders</h1>
          </div>
          <Link href="/account#orders">
            <Button variant="outline" className="rounded-2xl">
              Back to Account
            </Button>
          </Link>
        </div>

        <div
          role="tablist"
          aria-label="Order status"
          className="flex flex-wrap gap-2 rounded-3xl border border-border bg-white p-2"
        >
          {(
            [
              ["active", "Active", counts.active],
              ["completed", "Completed", counts.completed],
              ["cancelled", "Cancelled", counts.cancelled],
            ] as const
          ).map(([id, label, count]) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-brand-red text-white"
                    : "text-brand-charcoal hover:bg-muted/60"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground">
            {orders.length === 0
              ? "No orders yet. Place your first order from the menu."
              : `No ${tab} orders on this device.`}
            {orders.length === 0 ? (
              <div className="mt-4">
                <Link href="/menu">
                  <Button className="rounded-2xl brand-gradient text-white">Browse menu</Button>
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <div key={order.id} className="rounded-3xl border border-border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="font-[var(--font-accent)] font-bold text-brand-red">
                    {order.orderNumber}
                  </div>
                  <div className="text-sm capitalize text-muted-foreground">{order.status}</div>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {new Date(order.createdAt).toLocaleString()} · {order.branchName}
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-bold">Rs {order.totalAmount.toLocaleString()}</div>
                  <Link
                    href={`/track/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(order.contactPhone)}`}
                  >
                    <Button variant="outline" size="sm" className="rounded-2xl">
                      Track
                    </Button>
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

import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { listLocalOrders, type StoredOrder } from "@/lib/customer-store";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
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

function statusBadgeClass(status: string): string {
  const bucket = bucketForStatus(status);
  if (bucket === "cancelled") return "bg-muted text-muted-foreground";
  if (bucket === "completed") return "bg-emerald-50 text-emerald-800";
  return "bg-brand-red/10 text-brand-red";
}

const STATUS_STEPS = ["pending", "confirmed", "preparing", "ready", "dispatched", "completed"];

export default function Orders() {
  const [, navigate] = useLocation();
  const { profile, user, isAuthenticated } = useAuth();
  const { addItem, setOrderDetails } = useCart();
  // Match device-local orders by checkout phone only — never invent an email match.
  const orderKey = profile?.phone ?? undefined;
  const orders = useMemo(() => (orderKey ? listLocalOrders(orderKey) : []), [orderKey]);
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

  function handleReorder(order: StoredOrder) {
    if (!order.items.every((item) => item.menuItemSlug)) return;
    order.items.forEach((item) => {
      const extrasTotal = (item.extras ?? []).reduce((sum, extra) => sum + extra.price, 0);
      addItem({
        id: `${item.menuItemSlug}-${item.variantName ?? "standard"}`,
        menuSlug: item.menuItemSlug!,
        name: item.productName,
        price: Math.max(0, item.unitPrice - extrasTotal),
        quantity: item.quantity,
        category: "Reorder",
        variant: item.variantName,
        extras: item.extras,
        instructions: item.instructions,
      });
    });
    setOrderDetails({
      deliveryMode: order.orderType === "pickup" ? "pickup" : "delivery",
      deliveryAddress: order.deliveryAddress ?? "",
      orderInstructions: order.notes ?? "",
      couponCode: "",
    });
    navigate("/checkout");
  }

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
            <p className="text-sm text-muted-foreground mt-1">
              Orders saved on this device for your checkout phone.
            </p>
          </div>
          <Link href="/account#orders">
            <Button variant="outline" className="rounded-2xl">
              Back to Account
            </Button>
          </Link>
        </div>

        {!profile?.phone ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-8 text-center">
            <p className="font-semibold">Add a phone number to see matching orders</p>
            <p className="text-sm text-muted-foreground mt-1">
              Orders are matched by the phone number used at checkout.
            </p>
            <Link href="/account#profile">
              <Button className="mt-4 rounded-2xl brand-gradient text-white">Go to Profile</Button>
            </Link>
          </div>
        ) : (
          <>
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
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
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
                  <article
                    key={order.id}
                    className="rounded-3xl border border-border bg-white p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-[var(--font-accent)] font-bold text-brand-red">
                        {order.orderNumber}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()} · {order.branchName}
                    </div>
                    {bucketForStatus(order.status) !== "cancelled" ? (
                      <div
                        className="grid grid-cols-3 sm:grid-cols-6 gap-1.5"
                        aria-label={`Order progress: ${order.status}`}
                      >
                        {STATUS_STEPS.map((step, index) => {
                          const activeIndex = STATUS_STEPS.indexOf(order.status.toLowerCase());
                          return (
                            <div
                              key={step}
                              className={`rounded-xl px-2 py-1.5 text-center text-[10px] font-semibold capitalize ${
                                index <= activeIndex
                                  ? "bg-brand-red text-white"
                                  : "bg-brand-cream text-muted-foreground"
                              }`}
                            >
                              {step}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">
                        This order was cancelled.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">Branch:</span> {order.branchName}
                      </div>
                      <div>
                        <span className="font-semibold">Type:</span>{" "}
                        <span className="capitalize">{order.orderType}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {order.items.map((item, index) => (
                        <div
                          key={`${item.productName}-${index}`}
                          className="flex justify-between gap-3"
                        >
                          <span>
                            {item.quantity}× {item.productName}
                            {item.variantName ? ` (${item.variantName})` : ""}
                          </span>
                          <span>Rs {item.totalPrice.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold">Rs {order.totalAmount.toLocaleString()}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          disabled={!order.items.every((item) => item.menuItemSlug)}
                          title={
                            order.items.every((item) => item.menuItemSlug)
                              ? "Add these items to cart"
                              : "Reorder is unavailable for orders saved before this update"
                          }
                          onClick={() => handleReorder(order)}
                        >
                          Reorder
                        </Button>
                        <Link
                          href={`/track/${encodeURIComponent(order.orderNumber)}?phone=${encodeURIComponent(order.contactPhone)}`}
                        >
                          <Button variant="outline" size="sm" className="rounded-2xl">
                            Track
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

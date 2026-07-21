import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Star } from "lucide-react";
import { listLocalOrders, type StoredOrder } from "@/lib/customer-store";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useMenuCatalog } from "@/contexts/MenuCatalogContext";
import { Button } from "@/components/ui/button";
import { OrderStatusTimeline } from "@/components/my-telepizza/OrderStatusTimeline";
import { ReorderReviewDialog } from "@/components/my-telepizza/ReorderReviewDialog";
import { OrderReviewDialog } from "@/components/my-telepizza/OrderReviewDialog";
import { bucketForOrderStatus, type OrderStatusBucket } from "@/lib/order-status";
import {
  buildReorderPreview,
  confirmedReorderCartItems,
  type ReorderPreview,
} from "@/lib/reorder";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import {
  cloudDetailToStored,
  cloudListItemToStored,
  cloudOrdersAvailable,
  fetchCloudOrderDetail,
  fetchCloudOrders,
} from "@/lib/customer-orders-api";
import {
  createCloudReview,
  fetchCloudReviews,
  updateCloudReview,
  type CloudReview,
} from "@/lib/customer-reviews-api";
import { toCustomerMessage } from "@/lib/customer-errors";

const PAGE_SIZE = 20;

type OrderTab = OrderStatusBucket;

function filterOrders(orders: StoredOrder[], tab: OrderTab): StoredOrder[] {
  return orders.filter((order) => bucketForOrderStatus(order.status) === tab);
}

function statusBadgeClass(status: string): string {
  const bucket = bucketForOrderStatus(status);
  if (bucket === "cancelled") return "bg-muted text-muted-foreground";
  if (bucket === "completed") return "bg-emerald-50 text-emerald-800";
  return "bg-brand-red/10 text-brand-red";
}

export default function Orders() {
  const [, navigate] = useLocation();
  const { profile, user, session, isAuthenticated } = useAuth();
  const { addItem, setOrderDetails } = useCart();
  const { items: catalogItems, isLoading: catalogLoading } = useMenuCatalog();

  const usingCloudOrders = Boolean(
    isAuthenticated && session?.access_token && cloudOrdersAvailable,
  );

  const orderKey = profile?.phone ?? undefined;
  const localOrders = useMemo(
    () => (orderKey ? listLocalOrders(orderKey) : []),
    [orderKey],
  );

  const [cloudOrders, setCloudOrders] = useState<StoredOrder[]>([]);
  const [cloudTotal, setCloudTotal] = useState(0);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<CloudReview[]>([]);

  const orders = usingCloudOrders ? cloudOrders : localOrders;

  const [tab, setTab] = useState<OrderTab>("active");
  const [reorderPreview, setReorderPreview] = useState<ReorderPreview | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<StoredOrder | null>(null);
  const [reviewMode, setReviewMode] = useState<"create" | "edit">("create");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadCloudPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!session?.access_token) return;
      setCloudLoading(true);
      setCloudError(null);
      try {
        const result = await fetchCloudOrders(session.access_token, {
          limit: PAGE_SIZE,
          offset,
        });
        const mapped = result.orders.map(cloudListItemToStored);
        setCloudOrders((current) => (append ? [...current, ...mapped] : mapped));
        setCloudTotal(result.total);
        setCloudOffset(offset + mapped.length);
        try {
          const reviewRows = await fetchCloudReviews(session.access_token);
          setReviews(reviewRows);
          setReviewError(null);
        } catch (reviewFetchError) {
          setReviews([]);
          setReviewError(toCustomerMessage(reviewFetchError, "reviews"));
        }
      } catch (error) {
        setCloudError(toCustomerMessage(error, "orders"));
        if (!append) {
          setCloudOrders([]);
          setCloudTotal(0);
        }
      } finally {
        setCloudLoading(false);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    if (!usingCloudOrders) return;
    void loadCloudPage(0, false);
  }, [usingCloudOrders, loadCloudPage]);

  const filtered = useMemo(() => filterOrders(orders, tab), [orders, tab]);

  const counts = useMemo(
    () => ({
      active: filterOrders(orders, "active").length,
      completed: filterOrders(orders, "completed").length,
      cancelled: filterOrders(orders, "cancelled").length,
    }),
    [orders],
  );

  const reviewByOrderNumber = useMemo(() => {
    const map = new Map<string, CloudReview>();
    reviews.forEach((review) => map.set(review.orderNumber, review));
    return map;
  }, [reviews]);

  async function openReorderReview(order: StoredOrder) {
    if (catalogLoading) return;
    setReorderBusy(true);
    try {
      let target = order;
      if (usingCloudOrders && session?.access_token && order.items.length === 0) {
        const detail = await fetchCloudOrderDetail(session.access_token, order.orderNumber);
        target = cloudDetailToStored(detail);
      }
      setReorderPreview(buildReorderPreview(target, catalogItems));
      setReorderOpen(true);
    } catch (error) {
      setCloudError(toCustomerMessage(error, "orders"));
    } finally {
      setReorderBusy(false);
    }
  }

  function confirmReorder() {
    if (!reorderPreview) return;
    const items = confirmedReorderCartItems(reorderPreview);
    if (!items.length) return;
    items.forEach((item) => addItem(item));
    setOrderDetails({
      deliveryMode: reorderPreview.order.orderType === "pickup" ? "pickup" : "delivery",
      deliveryAddress: reorderPreview.order.deliveryAddress ?? "",
      orderInstructions: reorderPreview.order.notes ?? "",
      couponCode: "",
    });
    setReorderOpen(false);
    setReorderPreview(null);
    navigate("/checkout");
  }

  function openReviewDialog(order: StoredOrder, mode: "create" | "edit") {
    setReviewOrder(order);
    setReviewMode(mode);
    setReviewError(null);
    setReviewOpen(true);
  }

  async function submitReview(input: { rating: number; comment: string }) {
    if (!session?.access_token || !reviewOrder) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      const payload = { rating: input.rating, comment: input.comment || undefined };
      const saved =
        reviewMode === "edit"
          ? await updateCloudReview(session.access_token, reviewOrder.orderNumber, payload)
          : await createCloudReview(session.access_token, reviewOrder.orderNumber, payload);
      setReviews((current) => {
        const next = current.filter((entry) => entry.orderNumber !== saved.orderNumber);
        return [saved, ...next];
      });
      setReviewOpen(false);
      setReviewOrder(null);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setReviewBusy(false);
    }
  }

  if (!isAuthenticated || !user) {
    const returnPath = "/orders";
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in to view your orders.</p>
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          onClick={() => rememberAuthNextPath(returnPath)}
        >
          <Button className="rounded-2xl brand-gradient text-white">Sign in</Button>
        </Link>
      </div>
    );
  }

  const showLocalFallbackHint = !usingCloudOrders;
  const showPhoneGate = !usingCloudOrders && !profile?.phone;

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-red mb-1">
              My Telepizza
            </p>
            <h1 className="brand-heading text-3xl">My Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {usingCloudOrders
                ? cloudTotal === 0 && !cloudLoading
                  ? "No orders linked to your account yet."
                  : cloudTotal === 1
                    ? "1 order in your Telepizza account."
                    : `${cloudTotal} orders in your Telepizza account.`
                : !profile?.phone
                  ? "Add a phone number to see orders matched to your checkout on this device."
                  : orders.length === 0
                    ? "You have no recent orders on this device yet."
                    : orders.length === 1
                      ? "You have 1 recent order on this device."
                      : `You have ${orders.length} recent orders on this device.`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {usingCloudOrders
                ? "Account order history from Telepizza — synced when you order while signed in."
                : "History shown here is matched by checkout phone on this browser only. Cross-device account history needs the live API."}
            </p>
            {showLocalFallbackHint ? (
              <p className="text-xs text-amber-900 mt-1">
                Cloud order history is unavailable right now — showing honest device-local matches
                only.
              </p>
            ) : null}
          </div>
          <Link href="/my-telepizza#orders">
            <Button variant="outline" className="rounded-2xl">
              Back to My Telepizza
            </Button>
          </Link>
        </div>

        {cloudError ? (
          <p className="rounded-2xl border border-brand-red/20 bg-brand-red/5 px-4 py-3 text-sm text-brand-red">
            {cloudError}
          </p>
        ) : null}

        {showPhoneGate ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-8 text-center">
            <p className="font-semibold">Add a phone number to see matching orders</p>
            <p className="text-sm text-muted-foreground mt-1">
              Orders are matched by the phone number used at checkout.
            </p>
            <Link href="/my-telepizza#profile">
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

            {cloudLoading && orders.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-brand-red" />
                Loading orders…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground">
                {orders.length === 0
                  ? "No orders yet. Place your first order from the menu."
                  : `No ${tab} orders right now.`}
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
                {filtered.map((order) => {
                  const review = reviewByOrderNumber.get(order.orderNumber);
                  const completed = bucketForOrderStatus(order.status) === "completed";
                  return (
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
                      <OrderStatusTimeline status={order.status} />
                      {order.items.length > 0 ? (
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
                      ) : usingCloudOrders ? (
                        <p className="text-xs text-muted-foreground">
                          Line items load when you reorder or open full detail.
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold">Rs {order.totalAmount.toLocaleString()}</div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-2xl"
                            disabled={catalogLoading || reorderBusy}
                            onClick={() => void openReorderReview(order)}
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
                          {usingCloudOrders && completed ? (
                            review ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-2xl"
                                onClick={() => openReviewDialog(order, "edit")}
                              >
                                <Star className="mr-1 h-3.5 w-3.5 fill-brand-red text-brand-red" />
                                Edit review
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-2xl"
                                onClick={() => openReviewDialog(order, "create")}
                              >
                                Rate order
                              </Button>
                            )
                          ) : null}
                        </div>
                      </div>
                      {review ? (
                        <p className="text-xs text-muted-foreground">
                          Your rating: {review.rating}/5
                          {review.comment ? ` — “${review.comment}”` : ""}
                        </p>
                      ) : null}
                    </article>
                  );
                })}

                {usingCloudOrders && cloudTotal > orders.length ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      disabled={cloudLoading}
                      onClick={() => void loadCloudPage(cloudOffset, true)}
                    >
                      {cloudLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}

        {reviewError ? (
          <p className="text-sm text-brand-red" role="alert">
            {reviewError}
          </p>
        ) : null}
      </div>

      <ReorderReviewDialog
        open={reorderOpen}
        preview={reorderPreview}
        busy={reorderBusy}
        onOpenChange={(open) => {
          setReorderOpen(open);
          if (!open) setReorderPreview(null);
        }}
        onConfirm={confirmReorder}
      />

      <OrderReviewDialog
        open={reviewOpen}
        orderNumber={reviewOrder?.orderNumber ?? ""}
        mode={reviewMode}
        initialRating={reviewOrder ? reviewByOrderNumber.get(reviewOrder.orderNumber)?.rating ?? 0 : 0}
        initialComment={reviewOrder ? reviewByOrderNumber.get(reviewOrder.orderNumber)?.comment ?? "" : ""}
        busy={reviewBusy}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) setReviewOrder(null);
        }}
        onSubmit={(input) => void submitReview(input)}
      />
    </div>
  );
}

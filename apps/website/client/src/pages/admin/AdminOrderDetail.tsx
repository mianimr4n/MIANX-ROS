import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminOrdersApi } from "@/lib/admin-access";
import { getAdminOrder, type AdminOrderDetail } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

function formatPkr(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminOrderDetail() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const allowed = canAccessAdminOrdersApi({ roles, permissions, isSuperAdmin });

  useEffect(() => {
    if (!allowed) {
      setLocation("/admin/unauthorized");
      return;
    }
    const token = session?.access_token;
    if (!token || !orderId) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await getAdminOrder(token, orderId);
        if (!cancelled) {
          setDetail(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(err instanceof ApiRequestError ? err.message : "Failed to load order");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allowed, orderId, session?.access_token, setLocation]);

  return (
    <AdminShell title="Order detail">
      <div className="mb-4">
        <Link href="/admin/orders" className="text-sm font-semibold text-[var(--brand-red)]">
          ← Back to orders
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading order detail">
          <div className="h-28 animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          <div className="h-56 animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {detail ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-semibold">{detail.orderNumber}</p>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {detail.branchCode ?? detail.branchId} · {detail.orderType} · {detail.orderSource}
                </p>
              </div>
              <span className="rounded-full bg-[var(--admin-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {detail.status}
              </span>
            </div>
            <p className="mt-4 text-sm text-[var(--admin-muted)]">
              Created {formatTime(detail.createdAt)} · Updated {formatTime(detail.updatedAt)}
            </p>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              Status actions are intentionally disabled in S1 (read-only).
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Customer</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Name</dt>
                  <dd>{detail.contactName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Phone</dt>
                  <dd>{detail.contactPhone || "—"}</dd>
                </div>
                {detail.deliveryAddress ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Address</dt>
                    <dd className="text-right">{detail.deliveryAddress}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Payment & totals</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Payment</dt>
                  <dd className="capitalize">{detail.paymentStatus}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Subtotal</dt>
                  <dd className="tabular-nums">{formatPkr(detail.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Discount</dt>
                  <dd className="tabular-nums">{formatPkr(detail.discountAmount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Tax</dt>
                  <dd className="tabular-nums">{formatPkr(detail.taxAmount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Delivery fee</dt>
                  <dd className="tabular-nums">{formatPkr(detail.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-[var(--admin-border)] pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPkr(detail.totalAmount)}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
            <h2 className="text-base font-semibold">Line items</h2>
            <ul className="mt-4 space-y-3">
              {detail.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="rounded-xl bg-[var(--admin-soft)] px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {item.quantity}× {item.productName}
                        {item.variantName ? ` · ${item.variantName}` : ""}
                      </p>
                      {item.extras.length > 0 ? (
                        <p className="mt-1 text-[var(--admin-muted)]">
                          {item.extras.map((extra) => extra.label).join(", ")}
                        </p>
                      ) : null}
                      {item.instructions ? (
                        <p className="mt-1 text-[var(--admin-muted)]">Note: {item.instructions}</p>
                      ) : null}
                    </div>
                    <p className="tabular-nums font-semibold">{formatPkr(item.totalPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {detail.delivery ? (
            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
              <h2 className="text-base font-semibold">Delivery</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--admin-muted)]">Status</dt>
                  <dd className="capitalize">{detail.delivery.status}</dd>
                </div>
                {detail.delivery.deliveryAddress ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Address</dt>
                    <dd className="text-right">{detail.delivery.deliveryAddress}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-5">
            <h2 className="text-base font-semibold">Status timeline</h2>
            {detail.statusHistory.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--admin-muted)]">No status history recorded.</p>
            ) : (
              <ol className="mt-4 space-y-3 border-l border-[var(--admin-border)] pl-4">
                {detail.statusHistory.map((entry, index) => (
                  <li key={`${entry.createdAt}-${index}`} className="relative text-sm">
                    <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--brand-red)]" />
                    <p className="font-semibold capitalize">
                      {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
                    </p>
                    <p className="text-[var(--admin-muted)]">
                      {formatTime(entry.createdAt)} · {entry.actorType}
                      {entry.reasonCode ? ` · ${entry.reasonCode}` : ""}
                    </p>
                    {entry.note ? <p className="mt-1">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

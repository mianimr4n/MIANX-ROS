import { useEffect, useState } from "react";
import { Link } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import {
  listSupplierPortalOrders,
  respondSupplierPortalAction,
  type SupplierPortalOrder,
} from "@/lib/supplier-portal-api";
import { SupplierShell } from "./SupplierShell";

export default function SupplierPurchaseOrders() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [orders, setOrders] = useState<SupplierPortalOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    if (!token || !isApiConfigured) return;
    setOrders(await listSupplierPortalOrders(token));
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof ApiRequestError ? err.message : "Unable to load purchase orders.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function act(
    orderId: string,
    action: "acknowledge" | "accept" | "reject" | "request-amendment",
  ) {
    if (!token) return;
    setBusy(orderId);
    setError(null);
    try {
      let reason: string | null = null;
      if (action === "reject" || action === "request-amendment") {
        reason = window.prompt("Reason (required)");
        if (!reason?.trim()) {
          setError(
            action === "reject"
              ? "A reason is required to reject this purchase order."
              : "A reason is required for amendment requests.",
          );
          return;
        }
      }
      await respondSupplierPortalAction(token, orderId, action, {
        reason,
        idempotencyKey: `${action}-${orderId}-${Date.now()}`,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SupplierShell title="Purchase orders">
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {orders.length === 0 ? (
        <p className="text-sm text-zinc-600">No open deliveries were found.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/supplier/purchase-orders/${order.id}`} className="font-semibold underline">
                    {order.poNumber}
                  </Link>
                  <p className="text-sm text-zinc-600">
                    {order.status} · response {order.supplierResponseStatus ?? "awaiting"} · Rs{" "}
                    {order.totalAmount}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["acknowledge", "accept", "reject", "request-amendment"] as const).map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={busy === order.id}
                      className="rounded-lg border px-2 py-1 text-xs capitalize focus-visible:outline focus-visible:outline-2"
                      onClick={() => void act(order.id, action)}
                    >
                      {action.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SupplierShell>
  );
}

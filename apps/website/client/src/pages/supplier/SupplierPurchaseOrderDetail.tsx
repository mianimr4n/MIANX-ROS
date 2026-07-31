import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, bearerHeaders, fetchApiData, isApiConfigured } from "@/lib/api";
import {
  respondSupplierPortalAction,
  type SupplierPortalOrder,
} from "@/lib/supplier-portal-api";
import { SupplierShell } from "./SupplierShell";

export default function SupplierPurchaseOrderDetail() {
  const [, params] = useRoute("/supplier/purchase-orders/:id");
  const orderId = params?.id;
  const { session } = useAuth();
  const token = session?.access_token;
  const [order, setOrder] = useState<(SupplierPortalOrder & {
    receivingSummary?: {
      status: string;
      grnNumber: string | null;
      receivedAt: string | null;
      message: string;
    };
  }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orderId || !isApiConfigured) return;
    void (async () => {
      try {
        const data = await fetchApiData<SupplierPortalOrder & {
          receivingSummary: {
            status: string;
            grnNumber: string | null;
            receivedAt: string | null;
            message: string;
          };
        }>(`/supplier-portal/orders/${orderId}`, {
          method: "GET",
          headers: bearerHeaders(token),
        });
        setOrder(data);
      } catch (err) {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "You do not have access to this purchase order.",
        );
      }
    })();
  }, [token, orderId]);

  async function proposeDate() {
    if (!token || !orderId) return;
    const date = window.prompt("Proposed delivery date (YYYY-MM-DD)");
    if (!date) return;
    try {
      const updated = await respondSupplierPortalAction(token, orderId, "propose-delivery-date", {
        confirmedDeliveryDate: date,
        idempotencyKey: `propose-${orderId}-${date}`,
      });
      setOrder(updated as typeof order);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Proposal failed.");
    }
  }

  return (
    <SupplierShell title={order?.poNumber ?? "Purchase order"}>
      <p className="mb-3 text-sm">
        <Link href="/supplier/purchase-orders" className="text-red-700 underline">
          Back to purchase orders
        </Link>
      </p>
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {!order && !error ? <p className="text-sm text-zinc-600">Loading…</p> : null}
      {order ? (
        <div className="space-y-4">
          <section className="rounded-xl border bg-white p-4 text-sm">
            <p>
              Status: <strong>{order.status}</strong>
            </p>
            <p>Supplier response: {order.supplierResponseStatus ?? "awaiting"}</p>
            <p>Total: Rs {order.totalAmount}</p>
            <p>Expected delivery: {order.expectedDeliveryDate ?? "—"}</p>
            <button
              type="button"
              className="mt-3 rounded-lg border px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2"
              onClick={() => void proposeDate()}
            >
              Propose delivery date
            </button>
          </section>
          <section className="rounded-xl border bg-white p-4 text-sm">
            <h2 className="font-semibold">Receiving summary</h2>
            <p className="mt-1 text-zinc-700">
              {order.receivingSummary?.message ?? "Receiving has not been recorded yet."}
            </p>
            {order.receivingSummary?.grnNumber ? (
              <p className="mt-1 text-zinc-600">
                GRN {order.receivingSummary.grnNumber}
                {order.receivingSummary.receivedAt
                  ? ` · ${order.receivingSummary.receivedAt}`
                  : ""}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-zinc-500">
              Accepted/rejected line quantities remain staff-controlled via GRN. Suppliers cannot
              mark goods received.
            </p>
          </section>
          <section className="rounded-xl border bg-white p-4 text-sm">
            <h2 className="font-semibold">Lines</h2>
            {order.lines.length === 0 ? (
              <p className="mt-1 text-zinc-600">No line items on this PO yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {order.lines.map((line) => (
                  <li key={line.id}>
                    {line.lineNumber}. {line.description} — qty {line.quantity} @ Rs {line.unitPrice}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </SupplierShell>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api";
import {
  getOpsOrder,
  listOpsOrders,
  transitionOpsOrder,
  type OpsOrderDetail,
  type OpsOrderListItem,
} from "@/lib/ops-api";
import { OpsShell } from "./OpsShell";

const ACTIONS: Array<{
  action: "confirm" | "reject" | "preparing" | "ready" | "dispatch" | "complete" | "cancel";
  label: string;
  from: string[];
  needsReason?: boolean;
}> = [
  { action: "confirm", label: "Confirm", from: ["pending"] },
  { action: "reject", label: "Reject", from: ["pending", "confirmed"] },
  { action: "preparing", label: "Preparing", from: ["confirmed"] },
  { action: "ready", label: "Ready", from: ["preparing"] },
  { action: "dispatch", label: "Dispatch", from: ["ready"] },
  { action: "complete", label: "Complete", from: ["ready", "dispatched"] },
  { action: "cancel", label: "Cancel", from: ["pending", "confirmed", "preparing", "ready"], needsReason: true },
];

export default function OpsOrders() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OpsOrderListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OpsOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token = session?.access_token;

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listOpsOrders(token, { limit: 50 });
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load orders");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getOpsOrder(token, selectedId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : "Failed to load order");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  async function runAction(action: (typeof ACTIONS)[number]["action"], needsReason?: boolean) {
    if (!token || !selectedId) return;
    setBusy(true);
    try {
      await transitionOpsOrder(token, selectedId, action, needsReason ? { reasonCode: "staff_cancelled" } : undefined);
      await refresh();
      const data = await getOpsOrder(token, selectedId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsShell>
      <h1 className="text-3xl font-bold mb-2">Live order management</h1>
      <p className="text-zinc-400 mb-6">Queue refreshes every 8 seconds. Large buttons for touch screens.</p>
      {error ? <p className="mb-4 rounded-lg bg-red-950 text-red-200 px-4 py-3">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-3">
          {orders.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">No orders in queue.</p>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedId(order.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === order.id
                    ? "border-red-500 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-lg font-bold">{order.orderNumber}</span>
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-wide">
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">
                  {order.orderType} · {order.contactName} · {order.contactPhone}
                </p>
                <p className="text-sm text-zinc-500">
                  {order.itemCount} items · Rs {order.totalAmount.toFixed(0)} · {order.paymentStatus}
                </p>
              </button>
            ))
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 min-h-[28rem]">
          {!detail ? (
            <p className="text-zinc-400">Select an order to view details and actions.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold font-mono">{detail.orderNumber}</h2>
                  <p className="text-zinc-400">
                    {detail.branchCode ?? detail.branchId} · {detail.orderType} · {detail.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700 print:hidden"
                >
                  Print view
                </button>
              </div>

              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-zinc-500">Customer:</span> {detail.contactName} ({detail.contactPhone})
                </p>
                <p>
                  <span className="text-zinc-500">Payment:</span> {detail.paymentStatus}
                </p>
                {detail.deliveryAddress ? (
                  <p>
                    <span className="text-zinc-500">Address:</span> {detail.deliveryAddress}
                  </p>
                ) : null}
                {detail.notes ? (
                  <p>
                    <span className="text-zinc-500">Notes:</span> {detail.notes}
                  </p>
                ) : null}
              </div>

              <ul className="space-y-2 border-y border-zinc-800 py-3">
                {detail.items.map((item, index) => (
                  <li key={`${item.productName}-${index}`} className="flex justify-between gap-3 text-sm">
                    <span>
                      {item.quantity}× {item.productName}
                      {item.variantName ? ` (${item.variantName})` : ""}
                      {item.instructions ? ` — ${item.instructions}` : ""}
                    </span>
                    <span className="tabular-nums">Rs {item.totalPrice.toFixed(0)}</span>
                  </li>
                ))}
              </ul>

              <p className="text-right text-xl font-bold">Total Rs {detail.totalAmount.toFixed(0)}</p>

              <div className="flex flex-wrap gap-2 print:hidden">
                {ACTIONS.filter((a) => a.from.includes(detail.status)).map((a) => (
                  <button
                    key={a.action}
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(a.action, a.needsReason)}
                    className="min-h-12 min-w-[7rem] rounded-xl bg-red-600 px-4 py-3 text-base font-bold hover:bg-red-500 disabled:opacity-50"
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Timeline</h3>
                <ol className="space-y-1 text-sm text-zinc-300">
                  {detail.statusHistory.map((entry, index) => (
                    <li key={`${entry.createdAt}-${index}`}>
                      {entry.fromStatus ?? "—"} → <strong>{entry.toStatus}</strong> ·{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                      {entry.reasonCode ? ` (${entry.reasonCode})` : ""}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>
      </div>
    </OpsShell>
  );
}

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { listOpsOrders, type OpsOrderListItem } from "@/lib/ops-api";
import { canManageOrders } from "@/lib/staff-access";
import { OpsShell } from "./OpsShell";
import { ApiRequestError } from "@/lib/api";

function countBy(orders: OpsOrderListItem[], status: string) {
  return orders.filter((o) => o.status === status).length;
}

export default function OpsDashboard() {
  const { session, permissions, isSuperAdmin } = useAuth();
  const [orders, setOrders] = useState<OpsOrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !canManageOrders({ permissions, isSuperAdmin })) return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await listOpsOrders(token, { limit: 100 });
        if (cancelled) return;
        setOrders(data);
        setError(null);
        setUpdatedAt(new Date().toLocaleTimeString());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load dashboard");
      }
    };

    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session?.access_token, permissions, isSuperAdmin]);

  const active = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const salesToday = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const cards = [
    { label: "Active orders", value: active.length },
    { label: "Pending", value: countBy(orders, "pending") },
    { label: "Preparing", value: countBy(orders, "preparing") },
    { label: "Ready", value: countBy(orders, "ready") },
    { label: "Dispatched", value: countBy(orders, "dispatched") },
    { label: "Completed (loaded)", value: countBy(orders, "completed") },
    { label: "Sales (completed in list)", value: `Rs ${salesToday.toFixed(0)}` },
    { label: "Kitchen load", value: countBy(orders, "preparing") + countBy(orders, "confirmed") },
  ];

  return (
    <OpsShell>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Restaurant dashboard</h1>
          <p className="text-zinc-400">Live poll every 10s · last update {updatedAt || "—"}</p>
        </div>
        <Link href="/ops/orders" className="rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-500">
          Open order queue
        </Link>
      </div>
      {error ? <p className="mb-4 rounded-lg bg-red-950 text-red-200 px-4 py-3">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>
    </OpsShell>
  );
}

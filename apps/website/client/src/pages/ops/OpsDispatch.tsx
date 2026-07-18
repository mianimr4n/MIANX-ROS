import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api";
import {
  assignDeliveryRider,
  listDeliveryAssignments,
  listRiderRoster,
  updateDeliveryStatus,
  type DeliveryAssignment,
  type RiderRosterItem,
} from "@/lib/ops-api";
import { OpsShell } from "./OpsShell";

export default function OpsDispatch() {
  const { session, permissions, isSuperAdmin } = useAuth();
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [riders, setRiders] = useState<RiderRosterItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});
  const token = session?.access_token;
  const canAssign = isSuperAdmin || permissions.includes("delivery.assign");

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [list, roster] = await Promise.all([
        listDeliveryAssignments(token, { limit: 50 }),
        canAssign ? listRiderRoster(token).catch(() => []) : Promise.resolve([]),
      ]);
      setAssignments(list.filter((a) => a.status !== "delivered" && a.status !== "cancelled"));
      setRiders(roster);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load dispatch queue");
    }
  }, [token, canAssign]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function onAssign(deliveryId: string) {
    if (!token) return;
    const riderId = selectedRider[deliveryId];
    if (!riderId) {
      setError("Select a rider first.");
      return;
    }
    try {
      await assignDeliveryRider(token, deliveryId, riderId);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Assign failed");
    }
  }

  async function onStatus(deliveryId: string, status: "picked-up" | "delivered") {
    if (!token) return;
    try {
      await updateDeliveryStatus(token, deliveryId, status);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Status update failed");
    }
  }

  return (
    <OpsShell>
      <h1 className="text-3xl font-bold mb-2">Rider dispatch</h1>
      <p className="text-zinc-400 mb-6">Ready-for-dispatch and in-flight deliveries · order status mirrors automatically</p>
      {error ? <p className="mb-4 rounded-lg bg-red-950 text-red-200 px-4 py-3">{error}</p> : null}

      <div className="space-y-4">
        {assignments.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">No open deliveries.</p>
        ) : (
          assignments.map((row) => (
            <article key={row.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xl font-bold">{row.orderNumber}</p>
                  <p className="text-sm text-zinc-400">
                    Delivery {row.status} · Order {row.orderStatus}
                  </p>
                  <p className="mt-2 text-sm">
                    {row.contactName} · {row.contactPhone}
                  </p>
                  <p className="text-sm text-zinc-300">{row.deliveryAddress}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Rider: {row.riderName ?? "Unassigned"}
                    {row.assignedAt ? ` · assigned ${new Date(row.assignedAt).toLocaleTimeString()}` : ""}
                    {row.pickedUpAt ? ` · picked up ${new Date(row.pickedUpAt).toLocaleTimeString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-w-[14rem]">
                  {canAssign && (row.status === "pending" || row.status === "assigned") ? (
                    <>
                      <select
                        className="min-h-12 rounded-xl bg-zinc-800 px-3 text-sm"
                        value={selectedRider[row.id] ?? ""}
                        onChange={(e) =>
                          setSelectedRider((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      >
                        <option value="">Select rider</option>
                        {riders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.fullName} ({rider.status})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void onAssign(row.id)}
                        className="min-h-12 rounded-xl bg-red-600 font-bold hover:bg-red-500"
                      >
                        Assign rider
                      </button>
                    </>
                  ) : null}
                  {row.status === "assigned" ? (
                    <button
                      type="button"
                      onClick={() => void onStatus(row.id, "picked-up")}
                      className="min-h-12 rounded-xl bg-amber-600 font-bold hover:bg-amber-500"
                    >
                      Mark picked up (dispatch)
                    </button>
                  ) : null}
                  {row.status === "picked-up" ? (
                    <button
                      type="button"
                      onClick={() => void onStatus(row.id, "delivered")}
                      className="min-h-12 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-500"
                    >
                      Mark delivered
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </OpsShell>
  );
}

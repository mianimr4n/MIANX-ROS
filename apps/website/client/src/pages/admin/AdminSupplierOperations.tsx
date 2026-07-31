import { useEffect, useState } from "react";

import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminPurchasing } from "@/lib/admin-access";
import {
  decideSupplierResponse,
  listSupplierResponseQueue,
  type SupplierResponseQueueItem,
} from "@/lib/admin-api";
import { isApiConfigured } from "@/lib/api";
import { useOperationalData } from "@/lib/op-status";
import { AdminShell } from "@/pages/admin/AdminShell";

export default function AdminSupplierOperations() {
  const { session, permissions, isSuperAdmin, roles, branchIds } = useAuth();
  const { branchIdFilter } = useAdminBranch();
  const token = session?.access_token;
  const canAccess = canAccessAdminPurchasing({ permissions, isSuperAdmin, roles, branchIds });
  const [message, setMessage] = useState<string | null>(null);

  const queueOp = useOperationalData(
    ({ signal, correlationId }) =>
      listSupplierResponseQueue(
        token!,
        branchIdFilter ? { branchId: branchIdFilter } : undefined,
        { signal, correlationId },
      ),
    [token, branchIdFilter],
    { enabled: Boolean(token) && canAccess && isApiConfigured, pollMs: 30_000 },
  );

  useEffect(() => {
    setMessage(null);
  }, [branchIdFilter]);

  async function onDecide(item: SupplierResponseQueueItem, decision: "accept_amendment" | "reject_amendment" | "note") {
    if (!token) return;
    const note =
      decision === "note" ? window.prompt("Internal note") : window.prompt("Optional internal note");
    try {
      await decideSupplierResponse(token, item.responseId, {
        decision,
        internalNote: note,
      });
      setMessage(`Recorded ${decision} for ${item.poNumber}.`);
      queueOp.retry();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Decision failed.");
    }
  }

  return (
    <AdminShell>
      <AdminSurface>
        <AdminSurfaceHeader
          title="Supplier Operations"
          description="Staff review of supplier portal responses. This is not the supplier-facing portal."
        />
        <AdminSurfaceBody>
          <OperationalStatusBanner state={queueOp.state} error={queueOp.error} />
          {message ? <p className="mb-3 text-sm text-zinc-700">{message}</p> : null}
          {!canAccess ? (
            <p className="text-sm text-zinc-600">You do not have purchasing access.</p>
          ) : (queueOp.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-zinc-600">No supplier responses in queue for this scope.</p>
          ) : (
            <ul className="space-y-3">
              {(queueOp.data ?? []).map((item) => (
                <li key={item.responseId} className="rounded-xl border px-3 py-3 text-sm">
                  <p className="font-semibold">
                    {item.poNumber} · {item.supplierName ?? item.supplierId}
                  </p>
                  <p className="text-zinc-600">
                    {item.responseType}
                    {item.reason ? ` — ${item.reason}` : ""}
                    {item.confirmedDeliveryDate
                      ? ` · delivery ${item.confirmedDeliveryDate}`
                      : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void onDecide(item, "accept_amendment")}
                    >
                      Accept amendment
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void onDecide(item, "reject_amendment")}
                    >
                      Reject amendment
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => void onDecide(item, "note")}
                    >
                      Add note
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSurfaceBody>
      </AdminSurface>
    </AdminShell>
  );
}

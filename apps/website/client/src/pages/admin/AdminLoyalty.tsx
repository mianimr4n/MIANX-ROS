import { useCallback, useEffect, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { RewardCatalogue } from "@/components/admin/loyalty/RewardCatalogue";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { canAccessAdminLoyalty, primaryRoleLabel } from "@/lib/admin-access";
import { listLoyaltyAccounts, type LoyaltyAccount } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

export default function AdminLoyalty() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const allowed = canAccessAdminLoyalty({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [accounts, setAccounts] = useState<LoyaltyAccount[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setAccounts(null);
      setError("Sign in required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listLoyaltyAccounts(token);
      setAccounts(rows);
    } catch (err) {
      setAccounts(null);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load loyalty accounts.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!gateReady || !allowed) return;
    void load();
  }, [allowed, gateReady, load]);

  if (!allowed) {
    return (
      <AdminShell title="Loyalty & Rewards">
        <p className="text-sm text-[var(--admin-muted)]">You do not have access to loyalty.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Loyalty & Rewards">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">Customers</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Loyalty &amp; Rewards</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · Live points ledger (1 point per 100 PKR on completed orders)
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
            LIVE accounts
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
      </header>

      <AdminSurface aria-labelledby="loyalty-accounts-heading" className="mb-6">
        <AdminSurfaceHeader
          title="Loyalty accounts"
          description="Persistent points balances from completed orders — no invented points."
        />
        <AdminSurfaceBody>
          <h2 id="loyalty-accounts-heading" className="sr-only">
            Loyalty accounts
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--admin-muted)]">Loading accounts…</p>
          ) : error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : !accounts || accounts.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">
              No loyalty accounts yet. Points appear after a completed order with a linked customer earns 1pt / 100 PKR.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Customer</th>
                    <th className="px-2 py-2 font-semibold">Phone</th>
                    <th className="px-2 py-2 font-semibold">Tier</th>
                    <th className="px-2 py-2 font-semibold tabular-nums">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-[var(--admin-border)]/60">
                      <td className="px-2 py-2 font-medium">{a.customerName ?? "—"}</td>
                      <td className="px-2 py-2 text-[var(--admin-muted)]">{a.customerPhone ?? "—"}</td>
                      <td className="px-2 py-2 capitalize">{a.tier}</td>
                      <td className="px-2 py-2 tabular-nums font-semibold">{a.pointsBalance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <RewardCatalogue />
    </AdminShell>
  );
}

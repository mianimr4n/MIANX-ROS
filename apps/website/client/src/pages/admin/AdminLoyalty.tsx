import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { RewardCatalogue } from "@/components/admin/loyalty/RewardCatalogue";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { canAccessAdminLoyalty, primaryRoleLabel } from "@/lib/admin-access";
import {
  adjustLoyaltyPoints,
  burnLoyaltyPoints,
  expireLoyaltyPoints,
  listLoyaltyAccounts,
  listLoyaltyTransactions,
  reverseLoyaltyTransaction,
  type LoyaltyAccount,
  type LoyaltyTransaction,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

type MutationKind = "burn" | "adjust" | "expire" | "reverse";

export default function AdminLoyalty() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const allowed = canAccessAdminLoyalty({ roles, permissions, isSuperAdmin });
  const canMutate =
    isSuperAdmin || permissions.includes("loyalty.manage") || permissions.includes("admin.access");
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [accounts, setAccounts] = useState<LoyaltyAccount[] | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterCustomerId, setFilterCustomerId] = useState("");

  const [mutationKind, setMutationKind] = useState<MutationKind>("burn");
  const [mutationCustomerId, setMutationCustomerId] = useState("");
  const [mutationPoints, setMutationPoints] = useState("");
  const [mutationNote, setMutationNote] = useState("");
  const [mutationOrderId, setMutationOrderId] = useState("");
  const [mutationTransactionId, setMutationTransactionId] = useState("");
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () => accounts?.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const loadAccounts = useCallback(async () => {
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

  const loadTransactions = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setTransactions(null);
      setTxnError("Sign in required.");
      return;
    }
    setTxnLoading(true);
    setTxnError(null);
    try {
      const rows = await listLoyaltyTransactions(token, {
        customerId: filterCustomerId.trim() || selectedAccount?.customerId || undefined,
        accountId: selectedAccountId ?? undefined,
      });
      setTransactions(rows);
    } catch (err) {
      setTransactions(null);
      setTxnError(err instanceof ApiRequestError ? err.message : "Failed to load loyalty transactions.");
    } finally {
      setTxnLoading(false);
    }
  }, [filterCustomerId, selectedAccount?.customerId, selectedAccountId, session?.access_token]);

  useEffect(() => {
    if (!gateReady || !allowed) return;
    void loadAccounts();
  }, [allowed, gateReady, loadAccounts]);

  useEffect(() => {
    if (!gateReady || !allowed) return;
    void loadTransactions();
  }, [allowed, gateReady, loadTransactions]);

  useEffect(() => {
    if (selectedAccount) {
      setMutationCustomerId(selectedAccount.customerId);
    }
  }, [selectedAccount]);

  async function onMutation(e: React.FormEvent) {
    e.preventDefault();
    const token = session?.access_token;
    if (!token) {
      setMutationError("Sign in required.");
      return;
    }
    if (!canMutate) {
      setMutationError("You need loyalty.manage to perform ledger mutations.");
      return;
    }
    const points = Number(mutationPoints);
    setMutationBusy(true);
    setMutationError(null);
    setMutationSuccess(null);
    try {
      if (mutationKind === "burn") {
        if (!mutationCustomerId.trim()) throw new Error("Customer ID is required.");
        if (!Number.isFinite(points) || points <= 0) throw new Error("Points must be a positive number.");
        const result = await burnLoyaltyPoints(token, {
          customerId: mutationCustomerId.trim(),
          points,
          orderId: mutationOrderId.trim() || null,
          note: mutationNote.trim() || null,
        });
        setMutationSuccess(`Burn recorded. Balance: ${result.pointsBalance} pts.`);
      } else if (mutationKind === "adjust") {
        if (!mutationCustomerId.trim()) throw new Error("Customer ID is required.");
        if (!Number.isFinite(points) || points === 0) throw new Error("Adjust points must be non-zero.");
        if (!mutationNote.trim()) throw new Error("Adjust note is required.");
        const result = await adjustLoyaltyPoints(token, {
          customerId: mutationCustomerId.trim(),
          points,
          note: mutationNote.trim(),
        });
        setMutationSuccess(`Adjust recorded. Balance: ${result.pointsBalance} pts.`);
      } else if (mutationKind === "expire") {
        if (!mutationCustomerId.trim()) throw new Error("Customer ID is required.");
        if (!Number.isFinite(points) || points <= 0) throw new Error("Points must be a positive number.");
        const result = await expireLoyaltyPoints(token, {
          customerId: mutationCustomerId.trim(),
          points,
          note: mutationNote.trim() || null,
        });
        setMutationSuccess(`Expire recorded. Balance: ${result.pointsBalance} pts.`);
      } else {
        if (!mutationTransactionId.trim()) throw new Error("Transaction ID is required.");
        if (!mutationNote.trim()) throw new Error("Reverse note is required.");
        const result = await reverseLoyaltyTransaction(token, {
          transactionId: mutationTransactionId.trim(),
          note: mutationNote.trim(),
        });
        setMutationSuccess(`Reverse recorded. Balance: ${result.pointsBalance} pts.`);
      }
      await Promise.all([loadAccounts(), loadTransactions()]);
    } catch (err) {
      setMutationError(err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : "Mutation failed.");
    } finally {
      setMutationBusy(false);
    }
  }

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
            LIVE accounts + ledger
          </span>
          <button
            type="button"
            onClick={() => {
              void loadAccounts();
              void loadTransactions();
            }}
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
                    <th className="px-2 py-2 font-semibold">Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
                      className={`border-b border-[var(--admin-border)]/60 ${selectedAccountId === a.id ? "bg-[var(--admin-soft)]" : ""}`}
                    >
                      <td className="px-2 py-2 font-medium">{a.customerName ?? "—"}</td>
                      <td className="px-2 py-2 text-[var(--admin-muted)]">{a.customerPhone ?? "—"}</td>
                      <td className="px-2 py-2 capitalize">{a.tier}</td>
                      <td className="px-2 py-2 tabular-nums font-semibold">{a.pointsBalance}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(a.id);
                            setFilterCustomerId("");
                          }}
                          className="text-xs font-semibold text-[var(--brand-red-dark)] underline-offset-2 hover:underline"
                        >
                          View ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface aria-labelledby="loyalty-ledger-heading" className="mb-6">
        <AdminSurfaceHeader
          title="Points ledger"
          description="Earn, burn, adjust, expire, and reverse transactions from the live API."
        />
        <AdminSurfaceBody>
          <h2 id="loyalty-ledger-heading" className="sr-only">
            Points ledger
          </h2>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Filter by customer ID
              <input
                value={filterCustomerId}
                onChange={(e) => {
                  setFilterCustomerId(e.target.value);
                  setSelectedAccountId(null);
                }}
                placeholder="UUID"
                className="mt-1 block min-h-10 w-full min-w-[220px] rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            {selectedAccount ? (
              <p className="text-xs text-[var(--admin-muted)]">
                Showing ledger for {selectedAccount.customerName ?? selectedAccount.customerId}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void loadTransactions()}
              className="min-h-10 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
            >
              Reload ledger
            </button>
          </div>
          {txnLoading ? (
            <p className="text-sm text-[var(--admin-muted)]">Loading transactions…</p>
          ) : txnError ? (
            <p className="text-sm text-red-700" role="alert">
              {txnError}
            </p>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">
              No ledger transactions yet. Select an account or filter by customer ID.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                  <tr>
                    <th className="px-2 py-2 font-semibold">When</th>
                    <th className="px-2 py-2 font-semibold">Type</th>
                    <th className="px-2 py-2 font-semibold tabular-nums">Points</th>
                    <th className="px-2 py-2 font-semibold">Order</th>
                    <th className="px-2 py-2 font-semibold">Note</th>
                    <th className="px-2 py-2 font-semibold">Reverse</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--admin-border)]/60">
                      <td className="px-2 py-2 text-xs text-[var(--admin-muted)]">
                        {new Date(t.createdAt).toLocaleString("en-PK")}
                      </td>
                      <td className="px-2 py-2 capitalize">{t.type}</td>
                      <td className="px-2 py-2 tabular-nums font-semibold">{t.points}</td>
                      <td className="px-2 py-2 font-mono text-xs">{t.orderId ? t.orderId.slice(0, 8) : "—"}</td>
                      <td className="px-2 py-2 text-[var(--admin-muted)]">{t.note ?? "—"}</td>
                      <td className="px-2 py-2">
                        {canMutate && t.type !== "reverse" && !t.reversesTransactionId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMutationKind("reverse");
                              setMutationTransactionId(t.id);
                              setMutationNote("");
                            }}
                            className="text-xs font-semibold text-[var(--brand-red-dark)] underline-offset-2 hover:underline"
                          >
                            Reverse
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface aria-labelledby="loyalty-mutations-heading" className="mb-6">
        <AdminSurfaceHeader
          title="Ledger mutations"
          description={
            canMutate
              ? "Burn, adjust, expire, or reverse points via the live loyalty API."
              : "View-only — loyalty.manage is required to mutate the ledger."
          }
        />
        <AdminSurfaceBody>
          <h2 id="loyalty-mutations-heading" className="sr-only">
            Ledger mutations
          </h2>
          {!canMutate ? (
            <p className="text-sm text-[var(--admin-muted)]">
              You can view accounts and the ledger, but burn/adjust/expire/reverse require loyalty.manage or admin.access.
            </p>
          ) : (
            <form onSubmit={(e) => void onMutation(e)} className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {(["burn", "adjust", "expire", "reverse"] as MutationKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setMutationKind(kind)}
                    className={`min-h-9 rounded-lg px-3 text-sm font-semibold capitalize ${
                      mutationKind === kind
                        ? "bg-[var(--admin-ink)] text-[var(--admin-panel)]"
                        : "border border-[var(--admin-border)] bg-white"
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
              {mutationKind === "reverse" ? (
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Transaction ID
                  <input
                    required
                    value={mutationTransactionId}
                    onChange={(e) => setMutationTransactionId(e.target.value)}
                    className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                  />
                </label>
              ) : (
                <>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    Customer ID
                    <input
                      required
                      value={mutationCustomerId}
                      onChange={(e) => setMutationCustomerId(e.target.value)}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    Points
                    <input
                      required
                      type="number"
                      value={mutationPoints}
                      onChange={(e) => setMutationPoints(e.target.value)}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                    />
                  </label>
                  {mutationKind === "burn" ? (
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      Order ID (optional)
                      <input
                        value={mutationOrderId}
                        onChange={(e) => setMutationOrderId(e.target.value)}
                        className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                      />
                    </label>
                  ) : null}
                </>
              )}
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Note {mutationKind === "adjust" || mutationKind === "reverse" ? "(required)" : "(optional)"}
                <input
                  required={mutationKind === "adjust" || mutationKind === "reverse"}
                  value={mutationNote}
                  onChange={(e) => setMutationNote(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                />
              </label>
              {mutationError ? (
                <p className="text-sm text-red-700" role="alert">
                  {mutationError}
                </p>
              ) : null}
              {mutationSuccess ? (
                <p className="text-sm text-emerald-800" role="status">
                  {mutationSuccess}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={mutationBusy}
                className="min-h-11 w-full max-w-xs rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
              >
                {mutationBusy ? "Saving…" : `Submit ${mutationKind}`}
              </button>
            </form>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <RewardCatalogue />
    </AdminShell>
  );
}

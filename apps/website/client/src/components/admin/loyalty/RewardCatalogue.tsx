import { useCallback, useEffect, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import {
  approveLoyaltyReward,
  createLoyaltyReward,
  listLoyaltyRewards,
  type LoyaltyReward,
  type LoyaltyRewardType,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

type Props = {
  canManage: boolean;
};

const REWARD_TYPES: LoyaltyRewardType[] = [
  "fixed_discount",
  "percentage_discount",
  "free_item",
  "category_reward",
  "delivery_fee_waiver",
];

/** LIVE rewards catalogue — list/create/approve via admin loyalty depth APIs. */
export function RewardCatalogue({ canManage }: Props) {
  const { session } = useAuth();
  const token = session?.access_token;

  const [rewards, setRewards] = useState<LoyaltyReward[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [rewardType, setRewardType] = useState<LoyaltyRewardType>("fixed_discount");
  const [pointsCost, setPointsCost] = useState("100");
  const [monetaryValue, setMonetaryValue] = useState("50");
  const [productRef, setProductRef] = useState("");
  const [categoryRef, setCategoryRef] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setRewards(null);
      setError("Sign in required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listLoyaltyRewards(token, { includeInactive: true });
      setRewards(rows);
    } catch (err) {
      setRewards(null);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load rewards catalogue.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canManage) return;
    const cost = Number(pointsCost);
    if (!Number.isFinite(cost) || cost <= 0) {
      setError("Points cost must be a positive number.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await createLoyaltyReward(token, {
        name: name.trim(),
        rewardType,
        pointsCost: cost,
        monetaryValue:
          rewardType === "fixed_discount" || rewardType === "percentage_discount"
            ? Number(monetaryValue)
            : null,
        productRef: rewardType === "free_item" ? productRef.trim() || null : null,
        categoryRef: rewardType === "category_reward" ? categoryRef.trim() || null : null,
      });
      setName("");
      setInfo("Reward created as draft — approve + activate before redemption.");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to create reward.");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(rewardId: string, activate: boolean) {
    if (!token || !canManage) return;
    setError(null);
    setInfo(null);
    try {
      await approveLoyaltyReward(token, rewardId, { approvalStatus: "approved", activate });
      setInfo(activate ? "Reward approved and activated." : "Reward approved (inactive until activated).");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to approve reward.");
    }
  }

  async function onSubmitApproval(rewardId: string) {
    if (!token || !canManage) return;
    setError(null);
    try {
      await approveLoyaltyReward(token, rewardId, { approvalStatus: "awaiting_approval" });
      setInfo("Reward submitted for approval.");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to submit reward.");
    }
  }

  return (
    <AdminSurface aria-labelledby="reward-catalogue-heading">
      <AdminSurfaceHeader
        title="Reward catalogue"
        description="Publishable rewards from the live loyalty depth API — only approved + active rewards redeem."
      />
      <AdminSurfaceBody>
        <h3 id="reward-catalogue-heading" className="sr-only">
          Reward catalogue
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
            LIVE catalogue API
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="mb-3 text-sm text-emerald-800" role="status">
            {info}
          </p>
        ) : null}

        {canManage ? (
          <form onSubmit={(e) => void onCreate(e)} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Type
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as LoyaltyRewardType)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                {REWARD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Points cost
              <input
                required
                type="number"
                min={1}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            {rewardType === "fixed_discount" || rewardType === "percentage_discount" ? (
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                {rewardType === "percentage_discount" ? "Percent value" : "PKR value"}
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={monetaryValue}
                  onChange={(e) => setMonetaryValue(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                />
              </label>
            ) : null}
            {rewardType === "free_item" ? (
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Product ref
                <input
                  required
                  value={productRef}
                  onChange={(e) => setProductRef(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                />
              </label>
            ) : null}
            {rewardType === "category_reward" ? (
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Category ref
                <input
                  required
                  value={categoryRef}
                  onChange={(e) => setCategoryRef(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                />
              </label>
            ) : null}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 w-full rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
              >
                {busy ? "Saving…" : "Create draft reward"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mb-4 text-sm text-[var(--admin-muted)]">
            Creating or approving rewards requires loyalty.manage.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading rewards…</p>
        ) : !rewards ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            <p className="font-semibold text-[var(--admin-ink)]">Rewards catalogue unavailable</p>
            <p className="mt-2">
              The catalogue API did not return data. No sample rewards are shown as live.
            </p>
          </div>
        ) : rewards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
            <p className="font-semibold text-[var(--admin-ink)]">No rewards configured</p>
            <p className="mt-2">
              Empty catalogue — create a draft reward, then approve and activate before customers can redeem.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {rewards.map((r) => (
              <li key={r.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {r.rewardType} · {r.pointsCost} pts · {r.approvalStatus}
                      {r.isActive ? " · active" : " · inactive"}
                      {r.monetaryValue != null ? ` · value ${r.monetaryValue}` : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      {r.approvalStatus === "draft" ? (
                        <button
                          type="button"
                          onClick={() => void onSubmitApproval(r.id)}
                          className="min-h-8 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-xs font-semibold"
                        >
                          Submit for approval
                        </button>
                      ) : null}
                      {r.approvalStatus === "draft" || r.approvalStatus === "awaiting_approval" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void onApprove(r.id, false)}
                            className="min-h-8 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-xs font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void onApprove(r.id, true)}
                            className="min-h-8 rounded-lg bg-[var(--admin-ink)] px-2 text-xs font-semibold text-[var(--admin-panel)]"
                          >
                            Approve + activate
                          </button>
                        </>
                      ) : null}
                      {r.approvalStatus === "approved" && !r.isActive ? (
                        <button
                          type="button"
                          onClick={() => void onApprove(r.id, true)}
                          className="min-h-8 rounded-lg bg-[var(--admin-ink)] px-2 text-xs font-semibold text-[var(--admin-panel)]"
                        >
                          Activate
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

import { useCallback, useEffect, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminMarketing, primaryRoleLabel } from "@/lib/admin-access";
import {
  createMarketingCoupon,
  listMarketingCoupons,
  type MarketingCoupon,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

export default function AdminMarketing() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const allowed = canAccessAdminMarketing({ roles, permissions, isSuperAdmin });
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [coupons, setCoupons] = useState<MarketingCoupon[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setCoupons(null);
      setError("Sign in required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMarketingCoupons(token, {
        branchId: branchIdFilter || undefined,
      });
      setCoupons(rows);
    } catch (err) {
      setCoupons(null);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load coupons.");
    } finally {
      setLoading(false);
    }
  }, [branchIdFilter, session?.access_token]);

  useEffect(() => {
    if (!gateReady || !allowed) return;
    void load();
  }, [allowed, gateReady, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = session?.access_token;
    if (!token) {
      setCreateError("Sign in required.");
      return;
    }
    const value = Number(discountValue);
    const min = Number(minOrder);
    if (!Number.isFinite(value) || value <= 0) {
      setCreateError("Discount value must be a positive number.");
      return;
    }
    setBusy(true);
    setCreateError(null);
    try {
      await createMarketingCoupon(token, {
        branchId: branchIdFilter || null,
        code,
        discountType,
        discountValue: value,
        minOrder: Number.isFinite(min) ? min : 0,
        status: "active",
      });
      setCode("");
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : "Failed to create coupon.");
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <AdminShell title="Marketing">
        <p className="text-sm text-[var(--admin-muted)]">You do not have access to marketing coupons.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Marketing">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">Commerce</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Marketing &amp; Coupons</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          {roleLabel} · {branchLabel} · Coupon master LIVE — checkout validation Planned for Phase 2
        </p>
        <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
          LIVE coupons
        </span>
      </header>

      <AdminSurface aria-labelledby="coupons-heading" className="mb-6">
        <AdminSurfaceHeader title="Coupons" description="Create and list coupon codes. Quote/checkout enforcement Planned for Phase 2." />
        <AdminSurfaceBody>
          <h2 id="coupons-heading" className="sr-only">
            Coupons
          </h2>

          <form onSubmit={(e) => void onCreate(e)} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Code
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Type
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed PKR</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Value
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Min order
              <input
                type="number"
                min={0}
                step="1"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 w-full rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
              >
                {busy ? "Saving…" : "Create coupon"}
              </button>
            </div>
          </form>
          {createError ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {createError}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-[var(--admin-muted)]">Loading coupons…</p>
          ) : error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : !coupons || coupons.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No coupons created yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {coupons.map((c) => (
                <li key={c.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2">
                  <p className="font-semibold">{c.code}</p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {c.discountType === "percent" ? `${c.discountValue}%` : `${c.discountValue} PKR`} · min{" "}
                    {c.minOrder} · {c.status}
                    {c.expiryDate ? ` · expires ${c.expiryDate}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSurfaceBody>
      </AdminSurface>
    </AdminShell>
  );
}

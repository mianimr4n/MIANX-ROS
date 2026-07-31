import { useCallback, useEffect, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { canAccessAdminMarketing, primaryRoleLabel } from "@/lib/admin-access";
import {
  createMarketingCampaign,
  createMarketingCoupon,
  createMarketingSuppression,
  listCampaignSubmissions,
  listCouponRedemptions,
  listMarketingCampaigns,
  listMarketingConsent,
  listMarketingCoupons,
  listMarketingSuppressions,
  patchMarketingConsent,
  patchMarketingCoupon,
  queueCampaignSubmissions,
  transitionMarketingCampaign,
  type CampaignChannel,
  type CampaignSubmission,
  type CampaignStatus,
  type CouponRedemption,
  type MarketingCampaign,
  type MarketingConsent,
  type MarketingCoupon,
  type MarketingSuppression,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { AdminShell } from "./AdminShell";

const CAMPAIGN_TRANSITIONS: Partial<Record<CampaignStatus, CampaignStatus[]>> = {
  draft: ["scheduled", "running", "cancelled"],
  scheduled: ["running", "paused", "cancelled"],
  running: ["paused", "completed", "cancelled"],
  paused: ["running", "cancelled"],
};

export default function AdminMarketing() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, label: branchLabel } = useAdminBranch();
  const allowed = canAccessAdminMarketing({ roles, permissions, isSuperAdmin });
  const canManage =
    isSuperAdmin || permissions.includes("marketing.manage") || permissions.includes("admin.access");
  const { gateReady } = useAdminAccessGate(allowed);
  const roleLabel = primaryRoleLabel(roles, isSuperAdmin);

  const [coupons, setCoupons] = useState<MarketingCoupon[] | null>(null);
  const [redemptions, setRedemptions] = useState<CouponRedemption[] | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[] | null>(null);
  const [suppressions, setSuppressions] = useState<MarketingSuppression[] | null>(null);
  const [consent, setConsent] = useState<MarketingConsent[] | null>(null);
  const [submissions, setSubmissions] = useState<CampaignSubmission[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelInfo, setPanelInfo] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [campaignChannel, setCampaignChannel] = useState<CampaignChannel>("whatsapp");
  const [campaignTemplate, setCampaignTemplate] = useState("");
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [queueCustomerIds, setQueueCustomerIds] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [suppressionCustomerId, setSuppressionCustomerId] = useState("");
  const [suppressionChannel, setSuppressionChannel] = useState("whatsapp");
  const [suppressionReason, setSuppressionReason] = useState("");

  const token = session?.access_token;

  const load = useCallback(async () => {
    if (!token) {
      setCoupons(null);
      setRedemptions(null);
      setCampaigns(null);
      setSuppressions(null);
      setConsent(null);
      setError("Sign in required.");
      return;
    }
    setLoading(true);
    setError(null);
    setPanelError(null);
    try {
      const [couponRows, redemptionRows, campaignRows, suppressionRows, consentRows] = await Promise.all([
        listMarketingCoupons(token, { branchId: branchIdFilter || undefined }),
        listCouponRedemptions(token, { branchId: branchIdFilter || undefined }),
        listMarketingCampaigns(token, { branchId: branchIdFilter || undefined }),
        listMarketingSuppressions(token),
        listMarketingConsent(token),
      ]);
      setCoupons(couponRows);
      setRedemptions(redemptionRows);
      setCampaigns(campaignRows);
      setSuppressions(suppressionRows);
      setConsent(consentRows);
    } catch (err) {
      setCoupons(null);
      setRedemptions(null);
      setCampaigns(null);
      setSuppressions(null);
      setConsent(null);
      setError(err instanceof ApiRequestError ? err.message : "Failed to load marketing data.");
    } finally {
      setLoading(false);
    }
  }, [branchIdFilter, token]);

  const loadSubmissions = useCallback(
    async (campaignId: string) => {
      if (!token) return;
      setPanelError(null);
      try {
        const rows = await listCampaignSubmissions(token, campaignId);
        setSubmissions(rows);
        setSelectedCampaignId(campaignId);
      } catch (err) {
        setSubmissions(null);
        setPanelError(err instanceof ApiRequestError ? err.message : "Failed to load campaign submissions.");
      }
    },
    [token],
  );

  useEffect(() => {
    if (!gateReady || !allowed) return;
    void load();
  }, [allowed, gateReady, load]);

  async function onCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
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

  async function onPatchCoupon(couponId: string, status: "inactive" | "expired") {
    if (!token || !canManage) return;
    try {
      await patchMarketingCoupon(token, couponId, { status });
      await load();
    } catch (err) {
      setPanelError(err instanceof ApiRequestError ? err.message : "Failed to update coupon.");
    }
  }

  async function onCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canManage) return;
    setCampaignBusy(true);
    setPanelError(null);
    try {
      await createMarketingCampaign(token, {
        branchId: branchIdFilter || null,
        name: campaignName,
        channel: campaignChannel,
        messageTemplate: campaignTemplate,
      });
      setCampaignName("");
      setCampaignTemplate("");
      await load();
    } catch (err) {
      setPanelError(err instanceof ApiRequestError ? err.message : "Failed to create campaign.");
    } finally {
      setCampaignBusy(false);
    }
  }

  async function onTransitionCampaign(campaignId: string, status: CampaignStatus) {
    if (!token || !canManage) return;
    setPanelError(null);
    try {
      await transitionMarketingCampaign(token, campaignId, {
        status,
        cancelReason: status === "cancelled" ? cancelReason : undefined,
      });
      if (status === "cancelled") setCancelReason("");
      await load();
    } catch (err) {
      setPanelError(err instanceof ApiRequestError ? err.message : "Failed to update campaign status.");
    }
  }

  async function onQueueCampaign(campaignId: string) {
    if (!token || !canManage) return;
    const customerIds = queueCustomerIds
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (customerIds.length === 0) {
      setPanelError("Enter at least one customer ID to queue.");
      return;
    }
    setPanelError(null);
    try {
      const result = await queueCampaignSubmissions(token, campaignId, customerIds);
      setQueueCustomerIds("");
      setPanelError(null);
      await loadSubmissions(campaignId);
      setPanelInfo(`Queued ${result.queued}, suppressed ${result.suppressed} — provider delivery is not configured.`);
    } catch (err) {
      setPanelError(err instanceof ApiRequestError ? err.message : "Failed to queue campaign submissions.");
    }
  }

  async function onCreateSuppression(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !canManage) return;
    setPanelError(null);
    try {
      await createMarketingSuppression(token, {
        customerId: suppressionCustomerId.trim(),
        channel: suppressionChannel,
        reason: suppressionReason.trim(),
      });
      setSuppressionCustomerId("");
      setSuppressionReason("");
      await load();
    } catch (err) {
      setPanelError(err instanceof ApiRequestError ? err.message : "Failed to create suppression.");
    }
  }

  async function onToggleConsent(customerId: string, marketingConsent: boolean) {
    if (!token || !canManage) return;
    setPanelError(null);
    try {
      await patchMarketingConsent(token, customerId, marketingConsent);
      await load();
    } catch (err) {
      setPanelError(err instanceof ApiRequestError ? err.message : "Failed to update consent.");
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
          {roleLabel} · {branchLabel} · Coupons, redemptions, and campaigns LIVE — messaging provider not configured
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
            LIVE marketing
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
            Provider delivery unavailable
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

      {panelError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {panelError}
        </p>
      ) : null}
      {panelInfo ? (
        <p className="mb-4 text-sm text-emerald-800" role="status">
          {panelInfo}
        </p>
      ) : null}

      <AdminSurface aria-labelledby="coupons-heading" className="mb-6">
        <AdminSurfaceHeader
          title="Coupons"
          description="Create, list, and deactivate coupon codes. Checkout validation uses the live validate API."
        />
        <AdminSurfaceBody>
          <h2 id="coupons-heading" className="sr-only">
            Coupons
          </h2>

          {canManage ? (
            <form onSubmit={(e) => void onCreateCoupon(e)} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          ) : (
            <p className="mb-4 text-sm text-[var(--admin-muted)]">Coupon creation requires marketing.manage.</p>
          )}
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
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.code}</p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {c.discountType === "percent" ? `${c.discountValue}%` : `${c.discountValue} PKR`} · min{" "}
                        {c.minOrder} · {c.status}
                        {c.expiryDate ? ` · expires ${c.expiryDate}` : ""}
                      </p>
                    </div>
                    {canManage && c.status === "active" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void onPatchCoupon(c.id, "inactive")}
                          className="min-h-8 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-xs font-semibold"
                        >
                          Deactivate
                        </button>
                        <button
                          type="button"
                          onClick={() => void onPatchCoupon(c.id, "expired")}
                          className="min-h-8 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-xs font-semibold"
                        >
                          Mark expired
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface aria-labelledby="redemptions-heading" className="mb-6">
        <AdminSurfaceHeader title="Redemptions" description="Recorded coupon redemptions from orders — no invented usage." />
        <AdminSurfaceBody>
          <h2 id="redemptions-heading" className="sr-only">
            Redemptions
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--admin-muted)]">Loading redemptions…</p>
          ) : !redemptions || redemptions.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No coupon redemptions recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {redemptions.map((r) => (
                <li key={r.id} className="rounded-xl border border-[var(--admin-border)] px-3 py-2">
                  <p className="font-semibold">{r.code}</p>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {r.discountApplied} PKR off · order {r.orderId.slice(0, 8)} · {r.status} ·{" "}
                    {new Date(r.createdAt).toLocaleString("en-PK")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <AdminSurface aria-labelledby="campaigns-heading" className="mb-6">
        <AdminSurfaceHeader
          title="Campaigns"
          description="Lifecycle management only — submissions stay queued/suppressed until a messaging provider is configured."
        />
        <AdminSurfaceBody>
          <h2 id="campaigns-heading" className="sr-only">
            Campaigns
          </h2>
          <p className="mb-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Messaging provider is not configured. Campaign queue creates submissions only — never claim delivered messages.
          </p>

          {canManage ? (
            <form onSubmit={(e) => void onCreateCampaign(e)} className="mb-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Name
                <input
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Channel
                <select
                  value={campaignChannel}
                  onChange={(e) => setCampaignChannel(e.target.value as CampaignChannel)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="push">Push</option>
                </select>
              </label>
              <label className="col-span-full text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Message template
                <textarea
                  required
                  value={campaignTemplate}
                  onChange={(e) => setCampaignTemplate(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-normal normal-case"
                />
              </label>
              <button
                type="submit"
                disabled={campaignBusy}
                className="min-h-11 max-w-xs rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
              >
                {campaignBusy ? "Saving…" : "Create campaign"}
              </button>
            </form>
          ) : null}

          {!campaigns || campaigns.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">No campaigns yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {campaigns.map((camp) => (
                <li key={camp.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{camp.name}</p>
                      <p className="mt-1 text-xs text-[var(--admin-muted)]">
                        {camp.channel} · {camp.status}
                        {camp.scheduledAt ? ` · scheduled ${camp.scheduledAt}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-amber-900">{camp.providerDeliveryMessage}</p>
                    </div>
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {(CAMPAIGN_TRANSITIONS[camp.status] ?? []).map((next) => (
                          <button
                            key={next}
                            type="button"
                            onClick={() => void onTransitionCampaign(camp.id, next)}
                            className="min-h-8 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-xs font-semibold capitalize"
                          >
                            → {next}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => void loadSubmissions(camp.id)}
                          className="min-h-8 rounded-lg border border-[var(--admin-border)] bg-white px-2 text-xs font-semibold"
                        >
                          Submissions
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {canManage && selectedCampaignId === camp.id ? (
                    <div className="mt-3 border-t border-[var(--admin-border)]/60 pt-3">
                      {camp.status === "cancelled" ? (
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                          Cancel reason (required for cancel transition)
                          <input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                          />
                        </label>
                      ) : null}
                      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Queue customer IDs (space/comma separated)
                        <input
                          value={queueCustomerIds}
                          onChange={(e) => setQueueCustomerIds(e.target.value)}
                          className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void onQueueCampaign(camp.id)}
                        className="mt-2 min-h-9 rounded-lg bg-[var(--admin-ink)] px-3 text-xs font-semibold text-[var(--admin-panel)]"
                      >
                        Queue submissions
                      </button>
                      {submissions && submissions.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-xs">
                          {submissions.map((s) => (
                            <li key={s.id} className="text-[var(--admin-muted)]">
                              {s.status}
                              {s.failureReason ? ` · ${s.failureReason}` : ""}
                              {s.providerMessageId ? "" : " · no provider message ID"}
                            </li>
                          ))}
                        </ul>
                      ) : submissions && submissions.length === 0 ? (
                        <p className="mt-2 text-xs text-[var(--admin-muted)]">No submissions for this campaign yet.</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </AdminSurfaceBody>
      </AdminSurface>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <AdminSurface aria-labelledby="consent-heading">
          <AdminSurfaceHeader title="Marketing consent" description="Customer opt-in/out from the live consent API." />
          <AdminSurfaceBody>
            <h2 id="consent-heading" className="sr-only">
              Marketing consent
            </h2>
            {!consent || consent.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">No consent records loaded.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                {consent.slice(0, 50).map((c) => (
                  <li key={c.customerId} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                    <p className="font-medium">{c.fullName ?? c.customerId.slice(0, 8)}</p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {c.phone ?? "—"} · consent {c.marketingConsent ? "yes" : "no"}
                      {c.suppressedChannels.length > 0 ? ` · suppressed: ${c.suppressedChannels.join(", ")}` : ""}
                    </p>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => void onToggleConsent(c.customerId, !c.marketingConsent)}
                        className="mt-2 text-xs font-semibold text-[var(--brand-red-dark)] underline-offset-2 hover:underline"
                      >
                        Set consent {c.marketingConsent ? "off" : "on"}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </AdminSurfaceBody>
        </AdminSurface>

        <AdminSurface aria-labelledby="suppressions-heading">
          <AdminSurfaceHeader title="Suppressions" description="Channel suppressions block campaign queueing." />
          <AdminSurfaceBody>
            <h2 id="suppressions-heading" className="sr-only">
              Suppressions
            </h2>
            {canManage ? (
              <form onSubmit={(e) => void onCreateSuppression(e)} className="mb-4 grid gap-2">
                <input
                  required
                  placeholder="Customer ID"
                  value={suppressionCustomerId}
                  onChange={(e) => setSuppressionCustomerId(e.target.value)}
                  className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 text-sm"
                />
                <select
                  value={suppressionChannel}
                  onChange={(e) => setSuppressionChannel(e.target.value)}
                  className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 text-sm"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="all">All</option>
                </select>
                <input
                  required
                  placeholder="Reason"
                  value={suppressionReason}
                  onChange={(e) => setSuppressionReason(e.target.value)}
                  className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 text-sm"
                />
                <button
                  type="submit"
                  className="min-h-10 rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-semibold text-[var(--admin-panel)]"
                >
                  Add suppression
                </button>
              </form>
            ) : null}
            {!suppressions || suppressions.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">No suppressions recorded.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                {suppressions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                    <p className="font-medium">{s.channel}</p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {s.customerId.slice(0, 8)} · {s.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminSurfaceBody>
        </AdminSurface>
      </div>
    </AdminShell>
  );
}

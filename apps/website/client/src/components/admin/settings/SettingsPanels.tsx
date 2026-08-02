import { useEffect, useState } from "react";

import type { Branch } from "@/lib/telepizza-types";
import { SEEDED_PERMISSIONS, SEEDED_ROLES } from "@/lib/admin-settings";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { OpeningDryRunPanel } from "@/components/admin/OpeningDryRunPanel";
import { OpeningGovernancePanel } from "@/components/admin/OpeningGovernancePanel";
import { OpeningOperationsPanel } from "@/components/admin/OpeningOperationsPanel";
import {
  SettingsFoundationPanel,
  SettingsReadOnlyNotice,
  SettingsScopeBadge,
  SettingsStatusBadge,
  SettingsUnavailablePanel,
} from "@/components/admin/settings/SettingsPrimitives";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ApiRequestError } from "@/lib/api";
import {
  fetchBranchProfile,
  fetchBranchSettings,
  fetchOrganizationSettings,
  updateBranchProfile,
  updateBranchSettings,
  updateOrganizationSettings,
  type BranchOperationalSettings,
  type BranchProfile,
  type OrganizationSettings as OrganizationSettingsRecord,
} from "@/lib/admin-api";
import { Link } from "wouter";
import { toast } from "sonner";

function settingsErr(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-ink)]";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]";

export function OrganizationSettings() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Sign in required to load organization settings.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchOrganizationSettings(token)
      .then((data: OrganizationSettingsRecord) => {
        if (cancelled) return;
        setForm({
          companyName: data.companyName ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(settingsErr(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const data = await updateOrganizationSettings(token, {
        companyName: form.companyName.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      });
      setForm({
        companyName: data.companyName ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        address: data.address ?? "",
      });
      setSavedAt(data.updatedAt);
      toast.success("Organization settings saved");
    } catch (err) {
      setError(settingsErr(err));
      toast.error(settingsErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSurface aria-labelledby="organization-settings-heading">
      <AdminSurfaceHeader
        title="Organization"
        description="Company name, phone, email, and address — persisted to organization_settings."
      />
      <AdminSurfaceBody>
        <h2 id="organization-settings-heading" className="sr-only">
          Organization settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification={error && !form.companyName ? "UNAVAILABLE" : "LIVE"} />
          <SettingsScopeBadge scope="Organization" />
        </div>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading organization…
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
          >
            <label className={labelClass}>
              Company name
              <input
                className={fieldClass}
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                required
                maxLength={200}
                autoComplete="organization"
              />
            </label>
            <label className={labelClass}>
              Phone
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                maxLength={30}
                autoComplete="tel"
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                maxLength={150}
                autoComplete="email"
              />
            </label>
            <label className={labelClass}>
              Address
              <textarea
                className={fieldClass}
                rows={3}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                maxLength={2000}
                autoComplete="street-address"
              />
            </label>
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {savedAt ? (
              <p className="text-sm text-emerald-800" role="status">
                Saved · {new Date(savedAt).toLocaleString()}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving || !token || !form.companyName.trim()}
              className="min-h-11 rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function BranchSettings({
  branches,
  loading,
}: {
  branches: Branch[];
  loading: boolean;
}) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [selectedId, setSelectedId] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<BranchProfile | null>(null);
  const [settings, setSettings] = useState<BranchOperationalSettings | null>(null);
  const [form, setForm] = useState({
    phone: "",
    email: "",
    address: "",
    opensAt: "",
    closesAt: "",
    deliveryRadiusKm: "",
    minimumOrderAmount: "",
    deliveryFee: "",
  });

  useEffect(() => {
    if (!selectedId && branches.length > 0) {
      setSelectedId(branches[0].id);
    }
  }, [branches, selectedId]);

  useEffect(() => {
    if (!token || !selectedId) {
      setProfile(null);
      setSettings(null);
      return;
    }
    let cancelled = false;
    setProfile(null);
    setSettings(null);
    setForm({
      phone: "",
      email: "",
      address: "",
      opensAt: "",
      closesAt: "",
      deliveryRadiusKm: "",
      minimumOrderAmount: "",
      deliveryFee: "",
    });
    setProfileLoading(true);
    setError(null);
    setSavedAt(null);
    void Promise.all([fetchBranchProfile(token, selectedId), fetchBranchSettings(token, selectedId)])
      .then(([profileData, settingsData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setSettings(settingsData);
        setForm({
          phone: profileData.phone ?? "",
          email: profileData.email ?? "",
          address: profileData.address ?? "",
          opensAt: settingsData.opensAt ?? "",
          closesAt: settingsData.closesAt ?? "",
          deliveryRadiusKm:
            settingsData.deliveryRadiusKm === null || settingsData.deliveryRadiusKm === undefined
              ? ""
              : String(settingsData.deliveryRadiusKm),
          minimumOrderAmount:
            settingsData.minimumOrderAmount === null || settingsData.minimumOrderAmount === undefined
              ? ""
              : String(settingsData.minimumOrderAmount),
          deliveryFee:
            settingsData.deliveryFee === null || settingsData.deliveryFee === undefined
              ? ""
              : String(settingsData.deliveryFee),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProfile(null);
          setSettings(null);
          setError(settingsErr(err));
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  const parseOptionalNumber = (raw: string, label: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${label} must be a non-negative number.`);
    }
    return n;
  };

  const toHhMm = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 5);
  };

  const onSave = async () => {
    if (!token || !selectedId) return;
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const [profileData, settingsData] = await Promise.all([
        updateBranchProfile(token, selectedId, {
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim(),
        }),
        updateBranchSettings(token, selectedId, {
          opensAt: toHhMm(form.opensAt),
          closesAt: toHhMm(form.closesAt),
          deliveryRadiusKm: parseOptionalNumber(form.deliveryRadiusKm, "Delivery radius"),
          minimumOrderAmount: parseOptionalNumber(form.minimumOrderAmount, "Minimum order"),
          deliveryFee: parseOptionalNumber(form.deliveryFee, "Delivery fee"),
        }),
      ]);
      setProfile(profileData);
      setSettings(settingsData);
      setForm({
        phone: profileData.phone ?? "",
        email: profileData.email ?? "",
        address: profileData.address ?? "",
        opensAt: settingsData.opensAt ?? "",
        closesAt: settingsData.closesAt ?? "",
        deliveryRadiusKm:
          settingsData.deliveryRadiusKm === null || settingsData.deliveryRadiusKm === undefined
            ? ""
            : String(settingsData.deliveryRadiusKm),
        minimumOrderAmount:
          settingsData.minimumOrderAmount === null || settingsData.minimumOrderAmount === undefined
            ? ""
            : String(settingsData.minimumOrderAmount),
        deliveryFee:
          settingsData.deliveryFee === null || settingsData.deliveryFee === undefined
            ? ""
            : String(settingsData.deliveryFee),
      });
      setSavedAt(settingsData.updatedAt);
      toast.success("Branch settings updated successfully");
    } catch (err) {
      setError(settingsErr(err));
      toast.error(settingsErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSurface aria-labelledby="branch-settings-heading">
      <AdminSurfaceHeader
        title="Branches"
        description="Update contact, hours, delivery radius, minimum order, and fee via live branch settings APIs."
      />
      <AdminSurfaceBody>
        <h2 id="branch-settings-heading" className="sr-only">
          Branch settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Branch" />
        </div>
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading branches…
          </p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No branches in current admin scope.</p>
        ) : (
          <div className="space-y-4">
            <label className={labelClass}>
              Branch
              <select
                className={fieldClass}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.shortName || branch.name} · {branch.status}
                  </option>
                ))}
              </select>
            </label>
            {profileLoading ? (
              <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
                Loading branch settings…
              </p>
            ) : profile && settings ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void onSave();
                }}
              >
                <p className="text-sm text-[var(--admin-muted)]">
                  {profile.name} · {profile.city}
                  {settings.hoursDaily ? ` · Hours: ${settings.hoursDaily}` : null}
                </p>
                <label className={labelClass}>
                  Phone
                  <input
                    className={fieldClass}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    maxLength={30}
                  />
                </label>
                <label className={labelClass}>
                  Email
                  <input
                    type="email"
                    className={fieldClass}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    maxLength={150}
                  />
                </label>
                <label className={labelClass}>
                  Address
                  <textarea
                    className={fieldClass}
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    required
                    maxLength={2000}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Opens at
                    <input
                      type="time"
                      className={fieldClass}
                      value={form.opensAt}
                      onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))}
                    />
                  </label>
                  <label className={labelClass}>
                    Closes at
                    <input
                      type="time"
                      className={fieldClass}
                      value={form.closesAt}
                      onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className={labelClass}>
                    Delivery radius (km)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className={fieldClass}
                      value={form.deliveryRadiusKm}
                      onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusKm: e.target.value }))}
                    />
                  </label>
                  <label className={labelClass}>
                    Minimum order (PKR)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={fieldClass}
                      value={form.minimumOrderAmount}
                      onChange={(e) => setForm((f) => ({ ...f, minimumOrderAmount: e.target.value }))}
                    />
                  </label>
                  <label className={labelClass}>
                    Delivery fee (PKR)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={fieldClass}
                      value={form.deliveryFee}
                      onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                    />
                  </label>
                </div>
                {error ? (
                  <p className="text-sm text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
                {savedAt ? (
                  <p className="text-sm text-emerald-800" role="status">
                    Saved · {new Date(savedAt).toLocaleString()}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !token ||
                    profileLoading ||
                    !profile ||
                    !settings ||
                    profile.id !== selectedId ||
                    settings.branchId !== selectedId ||
                    !form.address.trim()
                  }
                  className="min-h-11 rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-[var(--admin-muted)]" role="status">
                {error ?? "Branch settings unavailable."}
              </p>
            )}
          </div>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function RestaurantOperationsSettings() {
  return (
    <div className="space-y-6">
      <AdminSurface aria-labelledby="restaurant-ops-settings-heading">
        <AdminSurfaceHeader
          title="Restaurant Operations"
          description="Service modes stay foundation — opening payment, notification, and device verification persist below."
        />
        <AdminSurfaceBody>
          <h2 id="restaurant-ops-settings-heading" className="sr-only">
            Restaurant operations settings
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <SettingsStatusBadge classification="LIVE" />
            <SettingsScopeBadge scope="Branch" />
          </div>
          <p className="text-sm text-[var(--admin-muted)]">
            Use Save / Delete on notification channels and devices in Opening operations. Dine-in, pickup, delivery
            toggles and holiday calendars remain foundation. Secrets stay environment-managed.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
      <OpeningOperationsPanel />
      <OpeningGovernancePanel />
      <OpeningDryRunPanel />
    </div>
  );
}

export function OrderSettings() {
  return (
    <AdminSurface aria-labelledby="order-settings-heading">
      <AdminSurfaceHeader
        title="Orders"
        description="Order intake, confirmation, and pipeline — managed in the Orders workspace."
      />
      <AdminSurfaceBody>
        <h2 id="order-settings-heading" className="sr-only">
          Order settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/orders" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → Orders
          </Link>{" "}
          to confirm, prepare, and complete orders. Cancellation and refund policy toggles are Planned for Phase 2 —
          Settings will not invent those controls here.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function POSSettings() {
  return (
    <div className="space-y-6">
      <AdminSurface aria-labelledby="pos-settings-heading">
        <AdminSurfaceHeader
          title="POS"
          description="Receipts and offline mode stay foundation — device readiness is saved in Opening operations."
        />
        <AdminSurfaceBody>
          <h2 id="pos-settings-heading" className="sr-only">
            POS settings
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <SettingsStatusBadge classification="LIVE" />
            <SettingsScopeBadge scope="Branch" />
          </div>
          <p className="text-sm text-[var(--admin-muted)]">
            POS workstation uses live order APIs. Save / Delete device rows below — route availability alone never
            verifies hardware.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
      <OpeningOperationsPanel />
    </div>
  );
}

export function KitchenSettings() {
  return (
    <AdminSurface aria-labelledby="kitchen-settings-heading">
      <AdminSurfaceHeader
        title="Kitchen"
        description="Kitchen tickets and prep queue — managed in Kitchen Display."
      />
      <AdminSurfaceBody>
        <h2 id="kitchen-settings-heading" className="sr-only">
          Kitchen settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Branch" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/kitchen-dashboard" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → Kitchen
          </Link>{" "}
          for live tickets. Station routing, SLA timers, and printer configuration are Planned for Phase 2 — no fake
          toggles here.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function DeliverySettings() {
  const { session } = useAuth();
  const { allowedBranches, isLoading: branchesLoading } = useAdminBranch();
  const token = session?.access_token;
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [form, setForm] = useState({
    deliveryRadiusKm: "",
    minimumOrderAmount: "",
    deliveryFee: "",
  });
  const [loadedBranchId, setLoadedBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && allowedBranches.length > 0) {
      setSelectedId(allowedBranches[0].id);
    }
  }, [allowedBranches, selectedId]);

  useEffect(() => {
    if (!token || !selectedId) return;
    let cancelled = false;
    // Clear immediately so Save cannot write the previous branch's fee/radius onto the new id.
    setLoadedBranchId(null);
    setForm({
      deliveryRadiusKm: "",
      minimumOrderAmount: "",
      deliveryFee: "",
    });
    setLoading(true);
    setError(null);
    setSavedAt(null);
    void fetchBranchSettings(token, selectedId)
      .then((data: BranchOperationalSettings) => {
        if (cancelled) return;
        setForm({
          deliveryRadiusKm:
            data.deliveryRadiusKm === null || data.deliveryRadiusKm === undefined
              ? ""
              : String(data.deliveryRadiusKm),
          minimumOrderAmount:
            data.minimumOrderAmount === null || data.minimumOrderAmount === undefined
              ? ""
              : String(data.minimumOrderAmount),
          deliveryFee:
            data.deliveryFee === null || data.deliveryFee === undefined ? "" : String(data.deliveryFee),
        });
        setLoadedBranchId(data.branchId);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(settingsErr(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  const parseOptionalNumber = (raw: string, label: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${label} must be a non-negative number.`);
    }
    return n;
  };

  const onSave = async () => {
    if (!token || !selectedId) return;
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const data = await updateBranchSettings(token, selectedId, {
        deliveryRadiusKm: parseOptionalNumber(form.deliveryRadiusKm, "Delivery radius"),
        minimumOrderAmount: parseOptionalNumber(form.minimumOrderAmount, "Minimum order"),
        deliveryFee: parseOptionalNumber(form.deliveryFee, "Delivery fee"),
      });
      setForm({
        deliveryRadiusKm:
          data.deliveryRadiusKm === null || data.deliveryRadiusKm === undefined
            ? ""
            : String(data.deliveryRadiusKm),
        minimumOrderAmount:
          data.minimumOrderAmount === null || data.minimumOrderAmount === undefined
            ? ""
            : String(data.minimumOrderAmount),
        deliveryFee:
          data.deliveryFee === null || data.deliveryFee === undefined ? "" : String(data.deliveryFee),
      });
      setLoadedBranchId(data.branchId);
      setSavedAt(data.updatedAt);
      toast.success("Branch settings updated successfully");
    } catch (err) {
      setError(settingsErr(err));
      toast.error(settingsErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSurface aria-labelledby="delivery-settings-heading">
      <AdminSurfaceHeader
        title="Delivery"
        description="Per-branch delivery radius, minimum order, and fee."
      />
      <AdminSurfaceBody>
        <h2 id="delivery-settings-heading" className="sr-only">
          Delivery settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Branch" />
        </div>
        <p className="mb-4 text-sm text-[var(--admin-muted)]">
          Zone maps and dispatch algorithms remain out of scope. Fee is stored for operations configuration —
          live quote pricing still requires a separate pricing-engine wire-up.
        </p>
        {branchesLoading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading branches…</p>
        ) : allowedBranches.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No branches in current admin scope.</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
          >
            <label className={labelClass}>
              Branch
              <select
                className={fieldClass}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {allowedBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.shortName || branch.name}
                  </option>
                ))}
              </select>
            </label>
            {loading ? (
              <p className="text-sm text-[var(--admin-muted)]">Loading delivery settings…</p>
            ) : (
              <>
                <label className={labelClass}>
                  Delivery radius (km)
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className={fieldClass}
                    value={form.deliveryRadiusKm}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusKm: e.target.value }))}
                  />
                </label>
                <label className={labelClass}>
                  Minimum order (PKR)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={fieldClass}
                    value={form.minimumOrderAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minimumOrderAmount: e.target.value }))}
                  />
                </label>
                <label className={labelClass}>
                  Delivery fee (PKR)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={fieldClass}
                    value={form.deliveryFee}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                  />
                </label>
              </>
            )}
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {savedAt ? (
              <p className="text-sm text-emerald-800" role="status">
                Saved · {new Date(savedAt).toLocaleString()}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={
                saving || !token || !selectedId || loading || loadedBranchId !== selectedId
              }
              className="min-h-11 rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function MenuSettings() {
  return (
    <AdminSurface aria-labelledby="menu-settings-heading">
      <AdminSurfaceHeader
        title="Menu"
        description="Prices, availability, and categories are managed in Menu Management — live write APIs."
      />
      <AdminSurfaceBody>
        <h2 id="menu-settings-heading" className="sr-only">
          Menu settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/menu" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → Menu
          </Link>{" "}
          to save SKU prices and create categories.
          Publishing matrices and tax classes remain Planned for Phase 2.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function InventorySettings() {
  return (
    <AdminSurface aria-labelledby="inventory-settings-heading">
      <AdminSurfaceHeader
        title="Inventory"
        description="Stock items, movements, adjustments, and waste — managed in Inventory."
      />
      <AdminSurfaceBody>
        <h2 id="inventory-settings-heading" className="sr-only">
          Inventory settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Branch" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/inventory" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → Inventory
          </Link>{" "}
          to add stock, post adjustments, and review low-stock alerts. Policy toggles (negative stock, valuation
          method, reorder automation) are Planned for Phase 2 — Settings will not invent those controls.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PurchasingSettings() {
  return (
    <AdminSurface aria-labelledby="purchasing-settings-heading">
      <AdminSurfaceHeader
        title="Purchasing"
        description="Suppliers, purchase orders, approvals, GRN, invoices, and payments."
      />
      <AdminSurfaceBody>
        <h2 id="purchasing-settings-heading" className="sr-only">
          Purchasing settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/purchasing" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → Purchasing
          </Link>{" "}
          to manage suppliers and the procurement loop. Approval-limit and matching-tolerance configuration is Planned
          for Phase 2 — Settings will not fabricate those controls.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReportsSettings() {
  return (
    <AdminSurface aria-labelledby="reports-settings-heading">
      <AdminSurfaceHeader title="Reports" description="Sales analytics and CSV export — managed in Reports." />
      <AdminSurfaceBody>
        <h2 id="reports-settings-heading" className="sr-only">
          Reports settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/reports" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → Reports
          </Link>{" "}
          for sales analytics. Custom report builders and scheduled exports are Planned for Phase 2.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function HrSettings() {
  return (
    <AdminSurface aria-labelledby="hr-settings-heading">
      <AdminSurfaceHeader title="HR" description="Team directory and workforce tools — managed in HR." />
      <AdminSurfaceBody>
        <h2 id="hr-settings-heading" className="sr-only">
          HR settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="LIVE" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <p className="text-sm text-[var(--admin-muted)]">
          Use{" "}
          <Link href="/admin/hr" className="font-semibold text-[var(--admin-ink)] underline">
            Admin → HR
          </Link>{" "}
          for the employee directory, attendance, shifts, payroll calculation, and deactivate. Settings payroll policy
          toggles remain Planned.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function FinanceTaxSettings() {
  return (
    <SettingsUnavailablePanel
      title="Finance & Tax"
      description="Fiscal year, VAT/GST rates, and account mapping."
      body="Tax rate and fiscal-year controls in Settings remain Planned. Use Admin → Finance for CoA, journals, TB/P&L (Partial LIVE). Settings will never invent tax rates."
      scope="Organization"
    />
  );
}

export function PaymentSettings() {
  return (
    <div className="space-y-6">
      <AdminSurface aria-labelledby="payment-settings-heading">
        <AdminSurfaceHeader
          title="Payments"
          description="Accepted methods, provider metadata, terminal and cash procedure — secrets never rendered."
        />
        <AdminSurfaceBody>
          <h2 id="payment-settings-heading" className="sr-only">
            Payment settings
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <SettingsStatusBadge classification="LIVE" />
            <SettingsScopeBadge scope="Branch" />
          </div>
          <p className="text-sm text-[var(--admin-muted)]">
            Provider credentials stay Environment Managed. Opening operations below persist verification metadata —
            never API keys, card numbers, or CVV. Local mock checks do not satisfy Production readiness.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
      <OpeningOperationsPanel />
    </div>
  );
}

export function CustomerLoyaltySettings() {
  return (
    <SettingsFoundationPanel
      title="Customers & Loyalty"
      description="Guest checkout, consent, earning and redemption rules."
      body="Points ledger, tiers, and rewards are managed in Admin → Loyalty. Settings earning/redemption policy controls remain Planned — this panel will not invent policy fields."
      scope="Organization"
    />
  );
}

export function CommunicationSettings() {
  return (
    <div className="space-y-6">
      <AdminSurface aria-labelledby="communication-settings-heading">
        <AdminSurfaceHeader
          title="Communications"
          description="Email, SMS, WhatsApp, and push notification channels — persist per purpose below."
        />
        <AdminSurfaceBody>
          <h2 id="communication-settings-heading" className="sr-only">
            Communication settings
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <SettingsStatusBadge classification="LIVE" />
            <SettingsScopeBadge scope="Branch" />
          </div>
          <p className="text-sm text-[var(--admin-muted)]">
            Add a channel, then use Save / Delete on the row. Provider credentials are environment-managed. WhatsApp is
            never CONNECTED without verified provider metadata. No live customer notifications are sent from this
            surface.
          </p>
        </AdminSurfaceBody>
      </AdminSurface>
      <OpeningOperationsPanel />
    </div>
  );
}

export function UsersAccessSettings({
  roles,
  permissions,
  isSuperAdmin,
}: {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}) {
  return (
    <AdminSurface aria-labelledby="users-access-settings-heading">
      <AdminSurfaceHeader
        title="Users & Access"
        description="See who can access Admin for your organization. Role changes are managed in HR."
      />
      <AdminSurfaceBody>
        <h2 id="users-access-settings-heading" className="sr-only">
          Users and access settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="READ-ONLY" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <SettingsReadOnlyNotice message="Reuse existing access roles. Workforce records belong in HR. Settings shows application access only — no invented roles." />
        <div className="mb-4 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm">
          <p className="font-semibold">Current session grants</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            What this signed-in account can access right now.
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Super-admin: {isSuperAdmin ? "yes" : "no"} · Roles: {roles.join(", ") || "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Access grants on this session: {permissions.length}
          </p>
          <p className="sr-only">
            Permissions ({permissions.length}): {permissions.length ? permissions.join(", ") : "—"}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">UI-visible application roles</h3>
            <p className="mb-2 text-xs text-[var(--admin-muted)]">
              Canonical staff role codes available to staff UIs — not a count of DB roles rows.
            </p>
            <ul className="space-y-2">
              {SEEDED_ROLES.map((role) => (
                <li key={role.code} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{role.code}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">UI permission reference</h3>
            <p className="mb-2 text-xs text-[var(--admin-muted)]">
              UI_VISIBLE subset — not the complete seeded role_permissions catalog.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--admin-border)]">
              <table className="min-w-full text-left text-xs">
                <caption className="sr-only">Seeded permissions</caption>
                <thead className="sticky top-0 bg-[var(--admin-soft)] text-[var(--admin-muted)]">
                  <tr>
                    <th scope="col" className="px-2 py-2 font-semibold">
                      Code
                    </th>
                    <th scope="col" className="px-2 py-2 font-semibold">
                      Module
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SEEDED_PERMISSIONS.map((perm) => (
                    <tr key={perm.code} className="border-t border-[var(--admin-border)]">
                      <td className="px-2 py-2 font-mono">{perm.code}</td>
                      <td className="px-2 py-2">{perm.module}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function LocalizationSettings() {
  return (
    <SettingsFoundationPanel
      title="Localization"
      description="Language, currency, timezone, and number formats."
      body="Operational dashboards hardcode Asia/Karachi and PKR display conventions. No localization persistence API — Settings will not silently change global formatting."
      scope="Organization"
    />
  );
}

export function IntegrationSettings() {
  const cards = [
    { name: "WhatsApp", status: "Not configured" },
    { name: "Email provider", status: "Environment managed" },
    { name: "SMS provider", status: "Not configured" },
    { name: "Payment gateways", status: "Environment managed" },
    { name: "Maps", status: "Unsupported in Admin UI" },
    { name: "Kitchen printers", status: "Unsupported" },
    { name: "Accounting software", status: "Unsupported" },
    { name: "Webhooks", status: "Not configured" },
  ];

  return (
    <AdminSurface aria-labelledby="integration-settings-heading">
      <AdminSurfaceHeader
        title="Integrations"
        description="Honest provider status — never Connected from package or placeholder env alone."
      />
      <AdminSurfaceBody>
        <h2 id="integration-settings-heading" className="sr-only">
          Integration settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="FOUNDATION" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.name} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
              <p className="text-sm font-semibold">{card.name}</p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">{card.status}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">No secrets shown</p>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SecurityAuditSettings() {
  return (
    <SettingsFoundationPanel
      title="Security & Audit"
      description="Password policy, MFA, sessions, and audit logging."
      body="A frontend toggle without backend enforcement is not a security control. Session and MFA posture remain with the auth provider until admin-writable security APIs exist."
      scope="Organization"
    />
  );
}

export function DataPrivacySettings() {
  return (
    <SettingsFoundationPanel
      title="Data & Privacy"
      description="Consent, retention, export, and deletion."
      body="Do not claim GDPR/PCI/ISO compliance from UI alone. Destructive deletion controls stay unavailable without verified backend flows and confirmations."
      scope="Organization"
    />
  );
}

export function AdvancedSettings() {
  return (
    <AdminSurface aria-labelledby="advanced-settings-heading">
      <AdminSurfaceHeader title="Advanced" description="Environment notes — no dangerous controls." />
      <AdminSurfaceBody>
        <h2 id="advanced-settings-heading" className="sr-only">
          Advanced settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="READ-ONLY" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Operations timezone</dt>
            <dd className="mt-1 font-semibold">Asia/Karachi</dd>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Admin access model</dt>
            <dd className="mt-1 font-semibold">Role-based staff access</dd>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Feature flags</dt>
            <dd className="mt-1 text-[var(--admin-muted)]">Planned for Phase 2</dd>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Maintenance mode</dt>
            <dd className="mt-1 text-[var(--admin-muted)]">Planned for Phase 2</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          Secrets, infrastructure endpoints, and environment dumps are never shown here.
        </p>
        <p className="sr-only">API surface /api/v1</p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

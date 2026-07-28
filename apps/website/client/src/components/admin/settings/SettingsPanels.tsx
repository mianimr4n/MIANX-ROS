import type { Branch } from "@/lib/telepizza-types";
import { SEEDED_PERMISSIONS, SEEDED_ROLES } from "@/lib/admin-settings";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { OpeningGovernancePanel } from "@/components/admin/OpeningGovernancePanel";
import { OpeningOperationsPanel } from "@/components/admin/OpeningOperationsPanel";
import {
  SettingsFoundationPanel,
  SettingsReadOnlyNotice,
  SettingsScopeBadge,
  SettingsStatusBadge,
} from "@/components/admin/settings/SettingsPrimitives";

export function OrganizationSettings() {
  return (
    <SettingsFoundationPanel
      title="Organization"
      description="Legal business profile, brand assets, and organization defaults."
      body="No organization / tenant settings table or write API exists. Legal name, tax registration, support contacts, logo, default currency, and timezone cannot be persisted from Admin Settings."
      scope="Organization"
    />
  );
}

export function BranchSettings({
  branches,
  loading,
}: {
  branches: Branch[];
  loading: boolean;
}) {
  return (
    <AdminSurface aria-labelledby="branch-settings-heading">
      <AdminSurfaceHeader
        title="Branches"
        description="Verified branch catalog — read-only until branch write APIs ship."
      />
      <AdminSurfaceBody>
        <h2 id="branch-settings-heading" className="sr-only">
          Branch settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="READ-ONLY" />
          <SettingsScopeBadge scope="Branch" />
        </div>
        <SettingsReadOnlyNotice message="GET /api/v1/branches provides directory fields. Opening hours JSON is not fully exposed as structured admin hours — display uses catalog hours string. No PATCH branch profile API." />
        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading branches…
          </p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No branches in current admin scope.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Branch directory</caption>
              <thead className="bg-[var(--admin-soft)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    City
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Phone
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-t border-[var(--admin-border)]">
                    <td className="px-3 py-2 font-medium">{branch.shortName || branch.name}</td>
                    <td className="px-3 py-2">{branch.city}</td>
                    <td className="px-3 py-2">{branch.phone || "—"}</td>
                    <td className="px-3 py-2 capitalize">{branch.status}</td>
                    <td className="px-3 py-2 text-xs text-[var(--admin-muted)]">{branch.hours || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          Editable fields (address, email, coordinates, tax profile, capability flags) require future branch settings write
          APIs — Foundation.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function RestaurantOperationsSettings() {
  return (
    <div className="space-y-6">
      <SettingsFoundationPanel
        title="Restaurant Operations"
        description="Service modes, holiday closures, and opening verification workflows."
        body="Dine-in, pickup, delivery toggles and holiday calendars remain foundation. Opening payment, notification, device, SOP, training, and governance verification is persisted below — secrets stay environment-managed."
        scope="Branch"
      />
      <OpeningOperationsPanel />
      <OpeningGovernancePanel />
    </div>
  );
}

export function OrderSettings() {
  return (
    <SettingsFoundationPanel
      title="Orders"
      description="Order numbering, auto-accept, cancellation and refund rules."
      body="Order status workflows are implemented in backend transition services — not configurable from Settings. Frontend must not invent cancellation or refund policy."
      scope="Organization"
    />
  );
}

export function POSSettings() {
  return (
    <div className="space-y-6">
      <SettingsFoundationPanel
        title="POS"
        description="Receipts, cash drawer, offline mode, and printer routing."
        body="POS workstation uses live order APIs. Device and card-terminal readiness is recorded in Opening Operations below — route availability alone never verifies hardware."
        scope="Branch"
      />
      <OpeningOperationsPanel />
    </div>
  );
}

export function KitchenSettings() {
  return (
    <SettingsFoundationPanel
      title="Kitchen"
      description="Stations, ticket sorting, prep SLA, and auto-bump."
      body="Kitchen tickets API exists for operations — station routing, SLA, and printer settings lack a configuration API."
      scope="Branch"
    />
  );
}

export function DeliverySettings() {
  return (
    <SettingsFoundationPanel
      title="Delivery"
      description="Zones, fees, dispatch strategy, and COD policy."
      body="Delivery assignments are operational. Service areas, fee matrices, and dispatch algorithms are not Settings-writable. Map zones will not be invented in UI."
      scope="Branch"
    />
  );
}

export function MenuSettings() {
  return (
    <SettingsFoundationPanel
      title="Menu"
      description="Publishing behaviour, tax-inclusive pricing, channel availability."
      body="Menu catalog is managed in Menu Management. Settings does not replace the catalog editor. Publishing and channel policies require configuration APIs."
      scope="Organization"
    />
  );
}

export function InventorySettings() {
  return (
    <SettingsFoundationPanel
      title="Inventory"
      description="Tracking, negative stock, valuation, and reorder defaults."
      body="Inventory module is Foundation — no stock ledger. Policy toggles cannot be enforced without inventory backend."
      scope="Branch"
    />
  );
}

export function PurchasingSettings() {
  return (
    <SettingsFoundationPanel
      title="Purchasing"
      description="Approval limits, PO numbering, and matching tolerance."
      body="Purchasing module is Foundation — no supplier or PO backend. Approval chains will not be fabricated."
      scope="Organization"
    />
  );
}

export function FinanceTaxSettings() {
  return (
    <SettingsFoundationPanel
      title="Finance & Tax"
      description="Fiscal year, VAT/GST rates, and account mapping."
      body="Finance module is Foundation — no chart of accounts or tax engine. Settings will never invent tax rates or claim legal compliance."
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
            <SettingsStatusBadge classification="FOUNDATION" />
            <SettingsScopeBadge scope="Branch" />
          </div>
          <p className="text-sm text-[var(--admin-muted)]">
            Provider credentials stay environment-managed. This surface stores verification metadata only — never API
            keys, card numbers, or CVV. Local mock checks do not satisfy Production readiness.
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
      body="Loyalty ledger is absent. Points, tiers, and reward expiry settings cannot be invented. Marketing consent fields exist on customers — policy configuration API does not."
      scope="Organization"
    />
  );
}

export function CommunicationSettings() {
  return (
    <div className="space-y-6">
      <SettingsFoundationPanel
        title="Communications"
        description="Email, SMS, WhatsApp, and push notification channels."
        body="Provider credentials are environment-managed. WhatsApp is never CONNECTED without verified provider metadata. Local verification only does not satisfy Production readiness. No live customer notifications are sent from this surface."
        scope="Branch"
      />
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
        description="Separates current session grants from the UI role/permission reference — not the full DB RBAC catalog."
      />
      <AdminSurfaceBody>
        <h2 id="users-access-settings-heading" className="sr-only">
          Users and access settings
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="READ-ONLY" />
          <SettingsScopeBadge scope="Organization" />
        </div>
        <SettingsReadOnlyNotice message="Reuse existing RBAC. Workforce records belong in HR. Settings shows application access only — no invented roles." />
        <div className="mb-4 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm">
          <p className="font-semibold">Current session grants</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            From /auth/me — not the complete Seeded RBAC catalog.
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Super-admin: {isSuperAdmin ? "yes" : "no"} · Roles: {roles.join(", ") || "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
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
      <AdminSurfaceHeader title="Advanced" description="Diagnostics metadata — no dangerous controls." />
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
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">API surface</dt>
            <dd className="mt-1 font-semibold">/api/v1</dd>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Admin ERP timezone (ops)</dt>
            <dd className="mt-1 font-semibold">Asia/Karachi (derived display)</dd>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Feature flags</dt>
            <dd className="mt-1 text-[var(--admin-muted)]">Foundation — no flag admin API</dd>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">Maintenance mode</dt>
            <dd className="mt-1 text-[var(--admin-muted)]">Unavailable — no safe control</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          Secrets, infrastructure endpoints, and full env dumps are never exposed in this panel.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

/** Settings & Configuration helpers — no invented settings, secrets, or fake providers. */

import type { Branch } from "@/lib/telepizza-types";
import { SEEDED_PERMISSIONS, SEEDED_ROLES } from "@/lib/admin-hr";

export type SettingsClassification = "LIVE" | "READ-ONLY" | "DERIVED" | "FOUNDATION" | "UNAVAILABLE";

export type SettingsCategoryId =
  | "organization"
  | "branches"
  | "operations"
  | "orders"
  | "pos"
  | "kitchen"
  | "delivery"
  | "menu"
  | "inventory"
  | "purchasing"
  | "finance"
  | "payments"
  | "loyalty"
  | "communications"
  | "access"
  | "localization"
  | "integrations"
  | "security"
  | "privacy"
  | "advanced";

export type SettingsCategory = {
  id: SettingsCategoryId;
  label: string;
  description: string;
  classification: SettingsClassification;
  keywords: string[];
};

export type SettingsCapabilityRow = {
  domain: string;
  capability: string;
  source: string;
  readApi: string;
  writeApi: string;
  permission: string;
  scope: string;
  sensitive: boolean;
  classification: SettingsClassification;
  decision: string;
};

export type SettingsInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation" | "read-only" | "live";
};

export type SettingsIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing" | "environment";
  note: string;
};

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: "organization",
    label: "Organization",
    description: "Legal identity, brand, and defaults",
    classification: "LIVE",
    keywords: ["organization", "legal", "brand", "logo", "timezone", "currency"],
  },
  {
    id: "branches",
    label: "Branches",
    description: "Branch directory and operating profile",
    classification: "LIVE",
    keywords: ["branch", "store", "hours", "address", "phone", "status"],
  },
  {
    id: "operations",
    label: "Restaurant Operations",
    description: "Service modes and operating hours policy",
    classification: "FOUNDATION",
    keywords: ["dine-in", "pickup", "delivery", "hours", "holiday"],
  },
  {
    id: "orders",
    label: "Orders",
    description: "Order rules and acceptance policy",
    classification: "FOUNDATION",
    keywords: ["order", "cancel", "refund", "minimum", "workflow"],
  },
  {
    id: "pos",
    label: "POS",
    description: "Counter, receipts, and hardware routing",
    classification: "FOUNDATION",
    keywords: ["pos", "receipt", "cash", "drawer", "printer"],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    description: "KDS behaviour and prep SLAs",
    classification: "FOUNDATION",
    keywords: ["kitchen", "ticket", "station", "sla", "bump"],
  },
  {
    id: "delivery",
    label: "Delivery",
    description: "Zones, fees, and dispatch policy",
    classification: "LIVE",
    keywords: ["delivery", "zone", "fee", "rider", "cod"],
  },
  {
    id: "menu",
    label: "Menu",
    description: "Publishing and availability behaviour",
    classification: "LIVE",
    keywords: ["menu", "publish", "pricing", "availability"],
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock policy and valuation defaults",
    classification: "UNAVAILABLE",
    keywords: ["inventory", "stock", "reorder", "waste"],
  },
  {
    id: "purchasing",
    label: "Purchasing",
    description: "PO approvals and receiving policy",
    classification: "FOUNDATION",
    keywords: ["purchasing", "supplier", "approval", "po"],
  },
  {
    id: "finance",
    label: "Finance & Tax",
    description: "Fiscal and tax configuration",
    classification: "UNAVAILABLE",
    keywords: ["finance", "tax", "vat", "gst", "ledger"],
  },
  {
    id: "payments",
    label: "Payments",
    description: "Payment methods and provider status",
    classification: "FOUNDATION",
    keywords: ["payment", "cash", "card", "gateway", "wallet"],
  },
  {
    id: "loyalty",
    label: "Customers & Loyalty",
    description: "Consent, loyalty, and coupon policy",
    classification: "FOUNDATION",
    keywords: ["loyalty", "points", "consent", "coupon"],
  },
  {
    id: "communications",
    label: "Communications",
    description: "Email, SMS, WhatsApp, push",
    classification: "FOUNDATION",
    keywords: ["email", "sms", "whatsapp", "notification", "push"],
  },
  {
    id: "access",
    label: "Users & Access",
    description: "Roles, permissions, and admin access",
    classification: "READ-ONLY",
    keywords: ["user", "role", "permission", "rbac", "access"],
  },
  {
    id: "localization",
    label: "Localization",
    description: "Language, currency, and formats",
    classification: "FOUNDATION",
    keywords: ["language", "locale", "currency", "timezone", "format"],
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Provider readiness without secrets",
    classification: "FOUNDATION",
    keywords: ["integration", "webhook", "provider", "api"],
  },
  {
    id: "security",
    label: "Security & Audit",
    description: "Security posture and audit controls",
    classification: "FOUNDATION",
    keywords: ["security", "mfa", "session", "audit", "password"],
  },
  {
    id: "privacy",
    label: "Data & Privacy",
    description: "Consent, retention, and deletion",
    classification: "FOUNDATION",
    keywords: ["privacy", "consent", "retention", "gdpr", "deletion"],
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Diagnostics and environment metadata",
    classification: "READ-ONLY",
    keywords: ["feature", "flag", "environment", "api", "version", "maintenance"],
  },
];

export function capabilityMatrix(): SettingsCapabilityRow[] {
  return [
    {
      domain: "Branches",
      capability: "Branch profile + hours / delivery commercial settings",
      source: "public.branches (opening_hours + delivery columns)",
      readApi: "GET /api/v1/admin/branches/:id/settings",
      writeApi: "PUT /api/v1/admin/branches/:id/settings",
      permission: "branch.manage | admin.access",
      scope: "Branch",
      sensitive: false,
      classification: "LIVE",
      decision: "Owner can update hours, radius, min order, and fee from Settings",
    },
    {
      domain: "Users & Access",
      capability: "Seeded roles and permissions + session grants",
      source: "migrations seed + /auth/me",
      readApi: "/auth/me (session)",
      writeApi: "None in Settings (invites via staff API)",
      permission: "admin.access",
      scope: "Organization",
      sensitive: false,
      classification: "READ-ONLY",
      decision: "Show seeded RBAC; never invent codes",
    },
    {
      domain: "Organization",
      capability: "Company name, phone, email, address",
      source: "public.organization_settings",
      readApi: "GET /api/v1/admin/settings/organization",
      writeApi: "PUT /api/v1/admin/settings/organization",
      permission: "admin.access",
      scope: "Organization",
      sensitive: false,
      classification: "LIVE",
      decision: "Persist organization profile via Supabase-backed admin API",
    },
    {
      domain: "Orders / POS / Kitchen / Delivery",
      capability: "Operational policy configuration",
      source: "Hardcoded workflows in services",
      readApi: "None for settings",
      writeApi: "None",
      permission: "admin.access (proposed)",
      scope: "Organization / Branch",
      sensitive: false,
      classification: "FOUNDATION",
      decision: "Do not mutate workflows from Settings UI",
    },
    {
      domain: "Finance & Tax",
      capability: "VAT/GST rates, fiscal year, COA mapping",
      source: "Absent (Finance unavailable)",
      readApi: "None",
      writeApi: "None",
      permission: "payment.read (proposed finance)",
      scope: "Organization",
      sensitive: false,
      classification: "UNAVAILABLE",
      decision: "Never invent tax rates — coming soon",
    },
    {
      domain: "Payments",
      capability: "Gateway credentials and method toggles",
      source: "Environment / absent admin API",
      readApi: "None safe for secrets",
      writeApi: "None",
      permission: "admin.access",
      scope: "Organization / Branch",
      sensitive: true,
      classification: "UNAVAILABLE",
      decision: "Status-only; never render secrets",
    },
    {
      domain: "Integrations",
      capability: "WhatsApp, SMS, email, maps providers",
      source: "Environment-managed",
      readApi: "None",
      writeApi: "None",
      permission: "admin.access",
      scope: "Organization",
      sensitive: true,
      classification: "FOUNDATION",
      decision: "Honest not-configured / environment-managed status",
    },
    {
      domain: "Security",
      capability: "Password policy, MFA, session duration",
      source: "Auth provider / absent admin controls",
      readApi: "None",
      writeApi: "None",
      permission: "admin.access",
      scope: "Organization",
      sensitive: false,
      classification: "FOUNDATION",
      decision: "Frontend toggle without enforcement is not a control",
    },
  ];
}

export function integrationChecks(): SettingsIntegrationCheck[] {
  return [
    {
      id: "branches-read",
      label: "Branch catalog read",
      status: "present",
      note: "GET /api/v1/branches returns verified branch rows for directory scope.",
    },
    {
      id: "branch-write",
      label: "Branch settings write API",
      status: "present",
      note: "GET/PUT /api/v1/admin/branches/:id/settings updates hours, radius, min order, and fee.",
    },
    {
      id: "organization",
      label: "Organization profile",
      status: "present",
      note: "GET/PUT /api/v1/admin/settings/organization backed by public.organization_settings.",
    },
    {
      id: "rbac-seed",
      label: "RBAC UI reference",
      status: "present",
      note: "Settings shows UI-visible role codes + session grants — not the full DB role_permissions catalog.",
    },
    {
      id: "settings-persist",
      label: "Feature-flag / advanced settings persistence",
      status: "missing",
      note: "No feature-flag admin write routes — Coming Soon.",
    },
    {
      id: "payments",
      label: "Payment provider admin",
      status: "environment",
      note: "Secrets must stay Environment Managed — never expose in Admin UI.",
    },
    {
      id: "whatsapp",
      label: "WhatsApp provider",
      status: "missing",
      note: "WhatsApp conversation backend was Foundation — not a connected provider.",
    },
    {
      id: "loyalty",
      label: "Loyalty rules engine",
      status: "missing",
      note: "Loyalty ledger absent — earning/redemption settings unavailable.",
    },
    {
      id: "tax",
      label: "Tax configuration",
      status: "missing",
      note: "orders.tax_amount exists — not a tax settings engine.",
    },
    {
      id: "permission",
      label: "Settings permission",
      status: "partial",
      note: "Gated on admin.access — no dedicated settings.manage seeded.",
    },
  ];
}

export function searchSettingsCategories(query: string): SettingsCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return SETTINGS_CATEGORIES;
  return SETTINGS_CATEGORIES.filter(
    (cat) =>
      cat.label.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}

export function buildConfigurationInsights(input: {
  branchCount: number;
  branchLabel: string;
  roleCount: number;
  permissionCount: number;
}): SettingsInsightItem[] {
  const items: SettingsInsightItem[] = [
    {
      id: "org-profile",
      title: "Organization profile is live",
      detail: "Company name, phone, email, and address persist via GET/PUT /admin/settings/organization.",
      source: "live",
    },
    {
      id: "branches-live",
      title: `${input.branchCount} branch(es) editable in scope`,
      detail: `Current scope: ${input.branchLabel}. Hours, radius, min order, and fee save via PUT /admin/branches/:id/settings.`,
      source: "live",
    },
    {
      id: "rbac",
      title: `UI-visible roles: ${input.roleCount} · UI permission reference: ${input.permissionCount}`,
      detail:
        "Not the complete Seeded RBAC catalog (DB baseline). Current session grants appear separately under Users & Access — do not conflate with seed counts.",
      source: "derived",
    },
    {
      id: "payments",
      title: "Payment provider is not configured in Admin UI",
      detail: "Secrets stay Environment Managed. Admin Settings will not claim Connected without verified status API.",
      source: "foundation",
    },
    {
      id: "whatsapp",
      title: "WhatsApp backend is unavailable for configuration",
      detail: "Conversation provider settings and credentials are not editable from this workspace.",
      source: "foundation",
    },
    {
      id: "loyalty",
      title: "Loyalty ledger is unavailable",
      detail: "Earning and redemption rules require a points ledger — Foundation until backend ships.",
      source: "foundation",
    },
    {
      id: "tax",
      title: "Tax configuration is missing",
      detail: "No VAT/GST rate table or filing configuration — Finance Foundation applies.",
      source: "foundation",
    },
    {
      id: "security",
      title: "Security controls are environment managed",
      detail: "Password policy and MFA are not admin-writable toggles without backend enforcement.",
      source: "foundation",
    },
  ];
  return items.slice(0, 8);
}

export function summarizeBranches(branches: Branch[]) {
  return {
    total: branches.length,
    operating: branches.filter((b) => b.status === "operating").length,
    comingSoon: branches.filter((b) => b.status === "coming-soon").length,
    inactive: branches.filter((b) => b.status === "inactive").length,
  };
}

export { SEEDED_ROLES, SEEDED_PERMISSIONS };

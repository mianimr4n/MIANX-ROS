/**
 * POLISH-01 — Admin navigation presentation helpers.
 * Authorization remains in admin-access.ts (getAdminNavItems / filterVisibleAdminNav).
 */
import type { AdminNavItem, AdminNavKey } from "@/lib/admin-access";

export const ADMIN_NAV_GROUP_ORDER = [
  "Overview",
  "Operations",
  "Commerce",
  "Customers",
  "Management",
  "Intelligence",
  "System",
] as const;

export type AdminNavGroup = (typeof ADMIN_NAV_GROUP_ORDER)[number];

/** Keywords for module navigator only (no business-record search). */
export const ADMIN_NAV_KEYWORDS: Record<AdminNavKey, string[]> = {
  "kitchen-home": ["kds", "kitchen board", "tickets"],
  "branch-home": ["branch manager", "bm"],
  dashboard: ["executive", "owner", "command center", "occ"],
  orders: ["order list", "fulfillment"],
  kitchen: ["kitchen erp", "prep"],
  delivery: ["dispatch", "riders"],
  pos: ["point of sale", "cashier", "till"],
  "floor-console": ["live floor", "tables", "dine-in"],
  reservations: ["booking", "bookings"],
  waitlist: ["queue", "walk-in"],
  "floor-plan": ["tables layout"],
  menu: ["catalog", "products", "sku"],
  inventory: ["stock", "recipes"],
  purchasing: ["suppliers", "po", "grn"],
  promotions: ["marketing", "coupons", "campaigns"],
  customers: ["crm", "customer"],
  loyalty: ["rewards", "points"],
  whatsapp: ["wa", "messaging"],
  support: ["helpdesk"],
  branches: ["locations"],
  staff: ["hr", "employees", "workforce", "schedule"],
  finance: ["ledger", "accounting", "pnl"],
  reports: ["analytics", "bi", "export"],
  "ai-team": ["mianx", "ai"],
  "ai-command-center": ["ai cc"],
  integrations: ["providers"],
  settings: ["configuration", "org", "preferences"],
};

export function groupAdminNavItems(items: AdminNavItem[]) {
  return ADMIN_NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
}

export function isAdminNavItemActive(location: string, item: AdminNavItem): boolean {
  if (item.href === "/admin/branch") {
    return location === "/admin/branch" || location.startsWith("/admin/branch/");
  }
  if (item.href === "/admin/dashboard") {
    return location === "/admin" || location.startsWith("/admin/dashboard");
  }
  if (item.href === "/admin/crm") {
    return (
      location === "/admin/crm" ||
      location.startsWith("/admin/crm/") ||
      location === "/admin/customers" ||
      location.startsWith("/admin/customers/")
    );
  }
  if (item.href === "/admin/marketing") {
    return (
      location === "/admin/marketing" ||
      location.startsWith("/admin/marketing/") ||
      location === "/admin/promotions" ||
      location.startsWith("/admin/promotions/")
    );
  }
  if (item.href === "/admin/hr") {
    return (
      location === "/admin/hr" ||
      location.startsWith("/admin/hr/") ||
      location === "/admin/staff" ||
      location.startsWith("/admin/staff/")
    );
  }
  return location === item.href || location.startsWith(`${item.href}/`);
}

export function resolveAdminNavTitle(path: string, title?: string): string {
  if (title) return title;
  if (path.startsWith("/admin/orders/")) return "Order detail";
  if (path.startsWith("/admin/orders")) return "Orders";
  if (path.startsWith("/admin/kitchen-dashboard")) return "Kitchen board";
  if (path.startsWith("/admin/kitchen")) return "Kitchen (ERP)";
  if (path.startsWith("/admin/branch")) return "Branch dashboard";
  if (path.startsWith("/admin/dashboard") || path === "/admin") return "Executive dashboard";
  if (path.startsWith("/admin/unauthorized")) return "Unauthorized";
  if (path.startsWith("/admin/crm") || path.startsWith("/admin/customers")) return "CRM";
  if (path.startsWith("/admin/marketing") || path.startsWith("/admin/promotions")) {
    return "Marketing & Coupons";
  }
  if (path.startsWith("/admin/hr") || path.startsWith("/admin/staff")) return "Staff schedule";
  if (path.startsWith("/admin/settings")) return "Settings";
  if (path.startsWith("/admin/whatsapp")) return "WhatsApp Order Center";
  if (path.startsWith("/admin/purchasing")) return "Purchasing & Suppliers";
  if (path.startsWith("/admin/loyalty")) return "Loyalty & Rewards";
  if (path.startsWith("/admin/ai-team")) return "Mianx.ai Team";
  const match = path.match(/^\/admin\/([^/]+)/);
  if (!match?.[1]) return "Admin";
  return match[1]
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function filterAdminNavByQuery(items: AdminNavItem[], query: string): AdminNavItem[] {
  const q = query.trim().toLowerCase();
  const available = items.filter((item) => item.available);
  if (!q) return available;
  return available.filter((item) => {
    const keywords = ADMIN_NAV_KEYWORDS[item.key] ?? [];
    const haystack = [item.label, item.href, item.group, ...keywords].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function assertUniqueAdminNavKeys(items: Array<{ key: string }>): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const item of items) {
    if (seen.has(item.key)) dupes.push(item.key);
    seen.add(item.key);
  }
  return dupes;
}

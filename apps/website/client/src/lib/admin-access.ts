/**
 * Admin ERP permission helpers — roles/permissions come only from /auth/me.
 * UI filtering is convenience; backend authorization remains mandatory.
 */

import { isStaffPrincipal } from "@/lib/staff-access";

export type AdminPrincipalInput = {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  branchIds?: string[];
};

export function canAccessAdmin(input: AdminPrincipalInput): boolean {
  return isStaffPrincipal(input);
}

export function canReadOrders(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("order.manage") || input.permissions.includes("order.read");
}

/** Admin order list/detail + dashboard APIs are gated on order.manage (Sprint 4.5). */
export function canAccessAdminOrdersApi(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("order.manage");
}

export function canManageOrders(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("order.manage");
}

export function canReadBranches(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("branch.read") ||
    input.permissions.includes("branch.manage")
  );
}

export function canManageMenu(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("menu.write");
}

export function canReadFinance(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("payment.read") ||
    input.permissions.includes("payment.manage")
  );
}

export function canAccessAdminSettings(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("admin.access");
}

export function canViewAllBranches(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("branch.manage");
}

export function primaryRoleLabel(roles: string[], isSuperAdmin: boolean): string {
  if (isSuperAdmin || roles.includes("super-admin")) return "Super Admin";
  if (roles.includes("branch-manager")) return "Branch Manager";
  if (roles.includes("kitchen")) return "Kitchen";
  if (roles.includes("cashier")) return "Cashier";
  if (roles.includes("rider")) return "Rider";
  if (roles.includes("customer-support")) return "Support Agent";
  return roles[0] ?? "Staff";
}

export type AdminNavKey =
  | "dashboard"
  | "orders"
  | "kitchen"
  | "delivery"
  | "menu"
  | "inventory"
  | "promotions"
  | "customers"
  | "support"
  | "branches"
  | "staff"
  | "finance"
  | "reports"
  | "ai-command-center"
  | "integrations"
  | "settings";

export type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  /** True when the S1 surface is implemented and the principal may use it. */
  available: boolean;
  group: string;
};

const NAV_BLUEPRINT: Array<Omit<AdminNavItem, "available"> & { requiresOrdersApi?: boolean }> = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", group: "Overview", requiresOrdersApi: true },
  { key: "orders", label: "Orders", href: "/admin/orders", group: "Operations", requiresOrdersApi: true },
  { key: "kitchen", label: "Kitchen", href: "/admin/kitchen", group: "Operations" },
  { key: "delivery", label: "Delivery", href: "/admin/delivery", group: "Operations" },
  { key: "menu", label: "Menu", href: "/admin/menu", group: "Commerce" },
  { key: "inventory", label: "Inventory", href: "/admin/inventory", group: "Commerce" },
  { key: "promotions", label: "Promotions", href: "/admin/promotions", group: "Commerce" },
  { key: "customers", label: "Customers", href: "/admin/customers", group: "Customers" },
  { key: "support", label: "Support", href: "/admin/support", group: "Customers" },
  { key: "branches", label: "Branches", href: "/admin/branches", group: "Management" },
  { key: "staff", label: "Staff", href: "/admin/staff", group: "Management" },
  { key: "finance", label: "Finance", href: "/admin/finance", group: "Management" },
  { key: "reports", label: "Reports", href: "/admin/reports", group: "Management" },
  { key: "ai-command-center", label: "AI Command Center", href: "/admin/ai-command-center", group: "Intelligence" },
  { key: "integrations", label: "Integrations", href: "/admin/integrations", group: "System" },
  { key: "settings", label: "Settings", href: "/admin/settings", group: "System" },
];

export function getAdminNavItems(input: AdminPrincipalInput): AdminNavItem[] {
  const ordersApi = canAccessAdminOrdersApi(input);
  return NAV_BLUEPRINT.map((item) => ({
    key: item.key,
    label: item.label,
    href: item.href,
    group: item.group,
    available: Boolean(item.requiresOrdersApi && ordersApi),
  }));
}

/** Nav entries shown in the shell. Active S1 modules require order.manage. */
export function filterVisibleAdminNav(input: AdminPrincipalInput): AdminNavItem[] {
  const ordersApi = canAccessAdminOrdersApi(input);
  return getAdminNavItems(input).filter((item) => {
    if (item.key === "dashboard" || item.key === "orders") {
      return ordersApi;
    }
    return true;
  });
}

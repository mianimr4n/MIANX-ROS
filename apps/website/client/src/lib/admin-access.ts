/**
 * Admin ERP permission helpers — roles/permissions come only from /auth/me.
 * UI filtering is convenience; backend authorization remains mandatory.
 */

import { isStaffPrincipal, canAccessKitchen as canAccessKitchenRole, canAccessDispatch } from "@/lib/staff-access";

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

/** Loyalty workspace uses order-derived customer intelligence (same gate as CRM). */
export function canAccessAdminLoyalty(input: AdminPrincipalInput): boolean {
  return canAccessAdminOrdersApi(input);
}

/** WhatsApp Order Center uses order-derived WhatsApp-attributed orders (same gate as orders API). */
export function canAccessAdminWhatsApp(input: AdminPrincipalInput): boolean {
  return canAccessAdminOrdersApi(input);
}

/** Menu Management catalog workspace — menu.write permission (matches backend intent). */
export function canAccessAdminMenu(input: AdminPrincipalInput): boolean {
  return canManageMenu(input);
}

/** Inventory workspace — branch.manage until inventory.manage permission is seeded. */
export function canAccessAdminInventory(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("branch.manage");
}

/** Purchasing workspace — branch.manage until purchasing.manage permission is seeded. */
export function canAccessAdminPurchasing(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("branch.manage");
}

/** Finance workspace — payment.read / payment.manage (customer payment ops; not GL). */
export function canAccessAdminFinance(input: AdminPrincipalInput): boolean {
  return canReadFinance(input);
}

/** Reports & BI workspace — order.manage (operations dashboard API); reports.read not seeded. */
export function canAccessAdminReports(input: AdminPrincipalInput): boolean {
  return canAccessAdminOrdersApi(input);
}

/** HR & Workforce workspace — staff.read / staff.manage (no invented hr.manage). */
export function canAccessAdminHr(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("staff.read") ||
    input.permissions.includes("staff.manage")
  );
}

export function canManageOrders(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("order.manage");
}

/** Kitchen tickets API: kitchen / branch-manager / super-admin (matches backend assertKitchenActor). */
export function canAccessAdminKitchen(input: AdminPrincipalInput): boolean {
  return canAccessKitchenRole(input);
}

/** Delivery assignments require delivery.read (or assign/update / dispatch roles). */
export function canAccessAdminDelivery(input: AdminPrincipalInput): boolean {
  return canAccessDispatch(input);
}

export function canAssignDeliveries(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("delivery.assign");
}

export function canUpdateDeliveries(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("delivery.update") ||
    input.permissions.includes("delivery.assign")
  );
}

/** POS workstation: cashiers / BM / SA / order.manage staff. */
export function canAccessAdminPos(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.roles.includes("cashier") ||
    input.roles.includes("branch-manager") ||
    input.permissions.includes("order.manage")
  );
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

/**
 * Whether the admin branch selector may use aggregate mode (`branchIdFilter = null`).
 *
 * - Super-admin: organization-wide (every branch in the tenant).
 * - Other staff: only when they hold **more than one** verified `branchIds` membership.
 *   Aggregate then means those assigned branches only — never the full system.
 *
 * Renamed from `canViewAllBranches` because that name implied system-wide access for
 * every caller. Browser filtering is convenience only; the API still enforces scope.
 */
export function canViewMultipleAssignedBranches(input: AdminPrincipalInput): boolean {
  if (input.isSuperAdmin) return true;
  return (input.branchIds?.length ?? 0) > 1;
}

/** Branch Manager operational home (`/admin/branch`). Owner (super-admin) may also enter. */
export function canAccessBranchManagerDashboard(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.roles.includes("branch-manager");
}

/** Non-owner branch managers must not see Owner ERP control-center modules in the shell. */
export function isBranchManagerOnly(input: AdminPrincipalInput): boolean {
  return !input.isSuperAdmin && input.roles.includes("branch-manager");
}

/**
 * Kitchen Manager / Kitchen Display home (`/admin/kitchen-dashboard`).
 * Matches backend kitchen actor: kitchen role, branch-manager, or super-admin.
 * Cashier is excluded even when they hold order.manage.
 */
export function canAccessKitchenManagerDashboard(input: AdminPrincipalInput): boolean {
  return canAccessAdminKitchen(input);
}

/** Kitchen-role staff who are not Owner and not Branch Manager — KDS is their home. */
export function isKitchenOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("kitchen") &&
    !input.roles.includes("branch-manager")
  );
}

/** Cashier-role staff without manager/kitchen roles — POS is their home (D2 staff dashboard). */
export function isCashierOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("cashier") &&
    !input.roles.includes("branch-manager") &&
    !input.roles.includes("kitchen")
  );
}

/** Rider-role staff without other operational roles — Delivery is their home (D2 staff dashboard). */
export function isRiderOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("rider") &&
    !input.roles.includes("branch-manager") &&
    !input.roles.includes("kitchen") &&
    !input.roles.includes("cashier")
  );
}

export function primaryRoleLabel(roles: string[], isSuperAdmin: boolean): string {
  if (isSuperAdmin || roles.includes("super-admin")) return "Super Admin";
  if (roles.includes("branch-manager")) return "Branch Manager";
  if (roles.includes("kitchen")) return "Kitchen Manager";
  if (roles.includes("cashier")) return "Cashier";
  if (roles.includes("rider")) return "Rider";
  if (roles.includes("customer-support")) return "Support Agent";
  return roles[0] ?? "Staff";
}

export type AdminNavKey =
  | "kitchen-home"
  | "branch-home"
  | "dashboard"
  | "orders"
  | "kitchen"
  | "delivery"
  | "pos"
  | "menu"
  | "inventory"
  | "purchasing"
  | "promotions"
  | "customers"
  | "loyalty"
  | "whatsapp"
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

const NAV_BLUEPRINT: Array<
  Omit<AdminNavItem, "available"> & {
    requiresKitchenHome?: boolean;
    requiresBranchHome?: boolean;
    requiresOrdersApi?: boolean;
    requiresKitchen?: boolean;
    requiresDelivery?: boolean;
    requiresPos?: boolean;
    requiresMenu?: boolean;
    requiresInventory?: boolean;
    requiresPurchasing?: boolean;
    requiresFinance?: boolean;
    requiresReports?: boolean;
    requiresHr?: boolean;
    requiresSettings?: boolean;
    ownerOnly?: boolean;
  }
> = [
  { key: "kitchen-home", label: "Kitchen board", href: "/admin/kitchen-dashboard", group: "Overview", requiresKitchenHome: true },
  { key: "branch-home", label: "Branch dashboard", href: "/admin/branch", group: "Overview", requiresBranchHome: true },
  { key: "dashboard", label: "Executive dashboard", href: "/admin/dashboard", group: "Overview", requiresOrdersApi: true, ownerOnly: true },
  { key: "orders", label: "Orders", href: "/admin/orders", group: "Operations", requiresOrdersApi: true },
  { key: "kitchen", label: "Kitchen (ERP)", href: "/admin/kitchen", group: "Operations", requiresKitchen: true },
  { key: "delivery", label: "Delivery", href: "/admin/delivery", group: "Operations", requiresDelivery: true },
  { key: "pos", label: "POS", href: "/admin/pos", group: "Operations", requiresPos: true },
  { key: "whatsapp", label: "WhatsApp Order Center", href: "/admin/whatsapp", group: "Operations", requiresOrdersApi: true, ownerOnly: true },
  { key: "menu", label: "Menu", href: "/admin/menu", group: "Commerce", requiresMenu: true, ownerOnly: true },
  { key: "inventory", label: "Inventory", href: "/admin/inventory", group: "Commerce", requiresInventory: true },
  { key: "purchasing", label: "Purchasing & Suppliers", href: "/admin/purchasing", group: "Commerce", requiresPurchasing: true, ownerOnly: true },
  { key: "promotions", label: "Promotions", href: "/admin/promotions", group: "Commerce", ownerOnly: true },
  { key: "customers", label: "CRM", href: "/admin/crm", group: "Customers", requiresOrdersApi: true },
  { key: "loyalty", label: "Loyalty & Rewards", href: "/admin/loyalty", group: "Customers", requiresOrdersApi: true, ownerOnly: true },
  { key: "support", label: "Support", href: "/admin/support", group: "Customers", ownerOnly: true },
  { key: "branches", label: "Branches", href: "/admin/branches", group: "Management", ownerOnly: true },
  { key: "staff", label: "Staff schedule", href: "/admin/hr", group: "Management", requiresHr: true },
  { key: "finance", label: "Finance", href: "/admin/finance", group: "Management", requiresFinance: true, ownerOnly: true },
  { key: "reports", label: "Reports", href: "/admin/reports", group: "Management", requiresReports: true },
  { key: "ai-command-center", label: "AI Command Center", href: "/admin/ai-command-center", group: "Intelligence", ownerOnly: true },
  { key: "integrations", label: "Integrations", href: "/admin/integrations", group: "System", ownerOnly: true },
  { key: "settings", label: "Settings", href: "/admin/settings", group: "System", requiresSettings: true, ownerOnly: true },
];

export function getAdminNavItems(input: AdminPrincipalInput): AdminNavItem[] {
  const kitchenHome = canAccessKitchenManagerDashboard(input);
  const branchHome = canAccessBranchManagerDashboard(input);
  const ordersApi = canAccessAdminOrdersApi(input);
  const kitchenApi = canAccessAdminKitchen(input);
  const deliveryApi = canAccessAdminDelivery(input);
  const posApi = canAccessAdminPos(input);
  const menuApi = canManageMenu(input);
  const inventoryApi = canAccessAdminInventory(input);
  const purchasingApi = canAccessAdminPurchasing(input);
  const financeApi = canAccessAdminFinance(input);
  const reportsApi = canAccessAdminReports(input);
  const hrApi = canAccessAdminHr(input);
  const settingsApi = canAccessAdminSettings(input);
  const bmOnly = isBranchManagerOnly(input);
  const kitchenOnly = isKitchenOnly(input);

  return NAV_BLUEPRINT.map((item) => {
    if ((bmOnly || kitchenOnly) && item.ownerOnly) {
      return { key: item.key, label: item.label, href: item.href, group: item.group, available: false };
    }
    return {
      key: item.key,
      label: item.label,
      href: item.href,
      group: item.group,
      available: Boolean(
        (item.requiresKitchenHome && kitchenHome) ||
          (item.requiresBranchHome && branchHome) ||
          (item.requiresOrdersApi && ordersApi) ||
          (item.requiresKitchen && kitchenApi) ||
          (item.requiresDelivery && deliveryApi) ||
          (item.requiresPos && posApi) ||
          (item.requiresMenu && menuApi) ||
          (item.requiresInventory && inventoryApi) ||
          (item.requiresPurchasing && purchasingApi) ||
          (item.requiresFinance && financeApi) ||
          (item.requiresReports && reportsApi) ||
          (item.requiresHr && hrApi) ||
          (item.requiresSettings && settingsApi),
      ),
    };
  });
}

/** Nav entries shown in the shell. Active modules require matching capability. */
export function filterVisibleAdminNav(input: AdminPrincipalInput): AdminNavItem[] {
  const kitchenHome = canAccessKitchenManagerDashboard(input);
  const branchHome = canAccessBranchManagerDashboard(input);
  const ordersApi = canAccessAdminOrdersApi(input);
  const kitchenApi = canAccessAdminKitchen(input);
  const deliveryApi = canAccessAdminDelivery(input);
  const posApi = canAccessAdminPos(input);
  const menuApi = canManageMenu(input);
  const inventoryApi = canAccessAdminInventory(input);
  const purchasingApi = canAccessAdminPurchasing(input);
  const financeApi = canAccessAdminFinance(input);
  const reportsApi = canAccessAdminReports(input);
  const hrApi = canAccessAdminHr(input);
  const settingsApi = canAccessAdminSettings(input);
  const bmOnly = isBranchManagerOnly(input);
  const kitchenOnly = isKitchenOnly(input);
  const cashierOnly = isCashierOnly(input);
  const riderOnly = isRiderOnly(input);

  return getAdminNavItems(input).filter((item) => {
    if (kitchenOnly) {
      const allowed: AdminNavKey[] = ["kitchen-home"];
      return allowed.includes(item.key) && kitchenHome;
    }

    if (cashierOnly) {
      // D2 staff shell: cashier home is POS — no Owner dashboards or financial metrics.
      const allowed: AdminNavKey[] = ["pos", "orders"];
      if (!allowed.includes(item.key)) return false;
      if (item.key === "pos") return posApi;
      return ordersApi;
    }

    if (riderOnly) {
      // D2 staff shell: rider home is Delivery — assigned deliveries and status actions only.
      const allowed: AdminNavKey[] = ["delivery"];
      return allowed.includes(item.key) && deliveryApi;
    }

    if (bmOnly && item.key !== "branch-home") {
      // Branch Manager shell: only branch ops modules — no Owner control-center chrome.
      const allowed: AdminNavKey[] = [
        "branch-home",
        "kitchen-home",
        "orders",
        "kitchen",
        "delivery",
        "pos",
        "customers",
        "inventory",
        "staff",
        "reports",
      ];
      if (!allowed.includes(item.key)) return false;
    }

    if (item.key === "kitchen-home") return kitchenHome;
    if (item.key === "branch-home") return branchHome;
    if (item.key === "dashboard") return !bmOnly && !kitchenOnly && ordersApi;
    if (
      item.key === "orders" ||
      item.key === "customers" ||
      item.key === "loyalty" ||
      item.key === "whatsapp"
    ) {
      return ordersApi;
    }
    if (item.key === "kitchen") return kitchenApi && !kitchenOnly;
    if (item.key === "delivery") return deliveryApi;
    if (item.key === "pos") return posApi;
    if (item.key === "menu") return menuApi;
    if (item.key === "inventory") return inventoryApi;
    if (item.key === "purchasing") return purchasingApi;
    if (item.key === "finance") return financeApi;
    if (item.key === "reports") return reportsApi;
    if (item.key === "staff") return hrApi;
    if (item.key === "settings") return settingsApi;
    // Coming soon / reserved — Owner shell only
    return !bmOnly && !kitchenOnly;
  });
}

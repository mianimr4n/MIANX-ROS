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

/** Inventory workspace — inventory.manage or branch.manage (legacy gate) or admin.access. */
export function canAccessAdminInventory(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("inventory.manage") ||
    input.permissions.includes("admin.access") ||
    input.permissions.includes("branch.manage")
  );
}

/** Purchasing workspace — purchasing.manage or branch.manage (legacy) or admin.access. */
export function canAccessAdminPurchasing(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("purchasing.manage") ||
    input.permissions.includes("admin.access") ||
    input.permissions.includes("branch.manage")
  );
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

/** Mianx.ai Team Center — super-admin only (Owner/Founder are display labels). */
export function canAccessAiTeam(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin;
}

/** D3 — table service reads (live floor, reservations, waitlist): reservation.read. */
export function canAccessTableService(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("reservation.read") ||
    input.permissions.includes("reservation.manage") ||
    input.permissions.includes("dinein.manage")
  );
}

/** D3 — create/edit reservations, waitlist, blackouts: reservation.manage. */
export function canManageReservations(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("reservation.manage");
}

/** D3 — seat guests, transfer tables, request bill, close sessions: dinein.manage. */
export function canSeatGuests(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("dinein.manage");
}

/** D3 — floor/area/table/combination configuration: floor.manage. */
export function canManageFloorConfiguration(input: AdminPrincipalInput): boolean {
  return input.isSuperAdmin || input.permissions.includes("floor.manage");
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

/** Cashier-role staff without manager/kitchen roles — D4 home `/admin/home/cashier`. */
export function isCashierOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("cashier") &&
    !input.roles.includes("branch-manager") &&
    !input.roles.includes("kitchen")
  );
}

/** Rider-role staff without other operational roles — D4 home `/admin/home/delivery`. */
export function isRiderOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("rider") &&
    !input.roles.includes("branch-manager") &&
    !input.roles.includes("kitchen") &&
    !input.roles.includes("cashier")
  );
}

/** D3/D4 — host/front-desk staff without manager roles: home `/admin/home/host`. */
export function isHostOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("host") &&
    !input.roles.includes("branch-manager") &&
    !input.roles.includes("kitchen") &&
    !input.roles.includes("cashier")
  );
}

/** D3/D4 — waiter staff without manager roles: home `/admin/home/waiter`. */
export function isWaiterOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("waiter") &&
    !input.roles.includes("host") &&
    !input.roles.includes("branch-manager") &&
    !input.roles.includes("kitchen") &&
    !input.roles.includes("cashier")
  );
}

/** Admin configuration role without Super Admin / Branch Manager. */
export function isAdminConfigOnly(input: AdminPrincipalInput): boolean {
  return (
    !input.isSuperAdmin &&
    input.roles.includes("admin") &&
    !input.roles.includes("branch-manager")
  );
}

/**
 * Configuration home capability — settings, menu, floor config, HR, admin role, or admin.access.
 * Does not require an unseeded admin-only role; specialized ops roles still prefer their own homes.
 */
export function canAccessConfigurationHome(input: AdminPrincipalInput): boolean {
  return (
    input.isSuperAdmin ||
    input.roles.includes("admin") ||
    canAccessAdminSettings(input) ||
    canManageMenu(input) ||
    canManageFloorConfiguration(input) ||
    canAccessAdminHr(input)
  );
}

/** Configuration-capable staff who are not SA / BM / kitchen / cashier / rider / host / waiter. */
export function isConfigurationHomeCandidate(input: AdminPrincipalInput): boolean {
  if (input.isSuperAdmin || input.roles.includes("super-admin")) return false;
  if (input.roles.includes("branch-manager")) return false;
  if (input.roles.includes("kitchen")) return false;
  if (input.roles.includes("cashier")) return false;
  if (input.roles.includes("rider")) return false;
  if (input.roles.includes("host")) return false;
  if (input.roles.includes("waiter")) return false;
  return canAccessConfigurationHome(input);
}

/**
 * Staff without a specialized opening home (cashier/host/waiter/kitchen/rider/BM/admin).
 * Support agents land here unless they also hold a specialized role above.
 */
export function isGeneralStaff(input: AdminPrincipalInput): boolean {
  if (input.isSuperAdmin) return false;
  if (input.roles.includes("branch-manager")) return false;
  if (input.roles.includes("kitchen")) return false;
  if (input.roles.includes("cashier")) return false;
  if (input.roles.includes("rider")) return false;
  if (input.roles.includes("host")) return false;
  if (input.roles.includes("waiter")) return false;
  if (input.roles.includes("admin")) return false;
  if (isConfigurationHomeCandidate(input)) return false;
  return input.roles.length > 0 || input.permissions.length > 0;
}

/**
 * D4 — canonical post-login / `/admin` home for the verified principal.
 * Uses repository role codes only (no invented aliases).
 */
export function resolveStaffHome(input: AdminPrincipalInput): string {
  if (input.isSuperAdmin || input.roles.includes("super-admin")) return "/admin/dashboard";
  if (isKitchenOnly(input)) return "/admin/kitchen-dashboard";
  if (isBranchManagerOnly(input)) return "/admin/branch";
  if (isCashierOnly(input)) return "/admin/home/cashier";
  if (isRiderOnly(input)) return "/admin/home/delivery";
  if (isHostOnly(input)) return "/admin/home/host";
  if (isWaiterOnly(input)) return "/admin/home/waiter";
  // Canonical customer-support lands on staff/support home (order lookup + reservations),
  // not the executive dashboard — even when order.manage is granted.
  if (input.roles.includes("customer-support")) return "/admin/home/staff";
  if (isAdminConfigOnly(input) || isConfigurationHomeCandidate(input)) return "/admin/home/config";
  if (canAccessAdminOrdersApi(input)) return "/admin/dashboard";
  return "/admin/home/staff";
}

export function primaryRoleLabel(roles: string[], isSuperAdmin: boolean): string {
  if (isSuperAdmin || roles.includes("super-admin")) return "Super Admin";
  if (roles.includes("branch-manager")) return "Branch Manager";
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("kitchen")) return "Kitchen Manager";
  if (roles.includes("host")) return "Host";
  if (roles.includes("waiter")) return "Waiter";
  if (roles.includes("cashier")) return "Cashier";
  if (roles.includes("rider")) return "Delivery";
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
  | "floor-console"
  | "reservations"
  | "waitlist"
  | "floor-plan"
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
  | "ai-team"
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
    requiresTableService?: boolean;
    requiresFloorConfig?: boolean;
    requiresAiTeam?: boolean;
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
  { key: "floor-console", label: "Live floor", href: "/admin/floor", group: "Operations", requiresTableService: true },
  { key: "reservations", label: "Reservations", href: "/admin/reservations", group: "Operations", requiresTableService: true },
  { key: "waitlist", label: "Waitlist", href: "/admin/waitlist", group: "Operations", requiresTableService: true },
  { key: "floor-plan", label: "Floor plan", href: "/admin/floor-plan", group: "Management", requiresFloorConfig: true },
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
  { key: "ai-team", label: "Mianx.ai Team", href: "/admin/ai-team", group: "Intelligence", requiresAiTeam: true, ownerOnly: true },
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
  const tableServiceApi = canAccessTableService(input);
  const floorConfigApi = canManageFloorConfiguration(input);
  const aiTeamApi = canAccessAiTeam(input);
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
          (item.requiresSettings && settingsApi) ||
          (item.requiresTableService && tableServiceApi) ||
          (item.requiresFloorConfig && floorConfigApi) ||
          (item.requiresAiTeam && aiTeamApi),
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
  const adminConfigOnly = isAdminConfigOnly(input) || isConfigurationHomeCandidate(input);
  const generalStaff = isGeneralStaff(input);

  return getAdminNavItems(input).filter((item) => {
    if (kitchenOnly) {
      const allowed: AdminNavKey[] = ["kitchen-home"];
      return allowed.includes(item.key) && kitchenHome;
    }

    if (cashierOnly) {
      // D4 cashier home is `/admin/home/cashier`; nav stays POS + permitted ops.
      // D3: cashiers may also see the live floor to attach dine-in orders to sessions.
      const allowed: AdminNavKey[] = ["pos", "orders", "floor-console"];
      if (!allowed.includes(item.key)) return false;
      if (item.key === "pos") return posApi;
      if (item.key === "floor-console") return canAccessTableService(input);
      return ordersApi;
    }

    if (riderOnly) {
      // D4 rider home is `/admin/home/delivery`; nav stays Delivery console.
      const allowed: AdminNavKey[] = ["delivery"];
      return allowed.includes(item.key) && deliveryApi;
    }

    if (isHostOnly(input)) {
      // D4 host home is `/admin/home/host`; nav stays front-desk modules.
      const allowed: AdminNavKey[] = ["reservations", "waitlist", "floor-console"];
      return allowed.includes(item.key) && canAccessTableService(input);
    }

    if (isWaiterOnly(input)) {
      // D4 waiter home is `/admin/home/waiter`; nav stays floor + permitted orders.
      if (item.key === "floor-console") return canAccessTableService(input);
      if (item.key === "pos") return posApi;
      if (item.key === "orders") return ordersApi;
      return false;
    }

    if (adminConfigOnly) {
      const allowed: AdminNavKey[] = ["settings", "menu", "floor-plan", "staff", "branches"];
      if (!allowed.includes(item.key)) return false;
      if (item.key === "settings") return settingsApi;
      if (item.key === "menu") return menuApi;
      if (item.key === "floor-plan") return canManageFloorConfiguration(input);
      if (item.key === "staff") return hrApi;
      return true;
    }

    if (generalStaff) {
      // General staff: only modules their permissions already unlock.
      return item.available;
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
        "floor-console",
        "reservations",
        "waitlist",
        "floor-plan",
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
    if (item.key === "floor-console" || item.key === "reservations" || item.key === "waitlist") {
      return canAccessTableService(input);
    }
    if (item.key === "floor-plan") return canManageFloorConfiguration(input);
    if (item.key === "ai-team") return canAccessAiTeam(input);
    // Coming soon / reserved — Owner shell only
    return !bmOnly && !kitchenOnly;
  });
}

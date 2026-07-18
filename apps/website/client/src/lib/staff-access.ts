/** Staff ops access helpers — roles/permissions come only from /auth/me. */

const STAFF_ROLES = new Set([
  "super-admin",
  "branch-manager",
  "kitchen",
  "cashier",
  "rider",
  "customer-support",
]);

export function isStaffPrincipal(input: {
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}): boolean {
  if (input.isSuperAdmin) return true;
  if (input.roles.some((role) => STAFF_ROLES.has(role) && role !== "customer")) return true;
  return input.permissions.some(
    (p) =>
      p.startsWith("order.") ||
      p.startsWith("delivery.") ||
      p.startsWith("staff.") ||
      p.startsWith("menu."),
  );
}

export function canManageOrders(input: { permissions: string[]; isSuperAdmin: boolean }): boolean {
  return input.isSuperAdmin || input.permissions.includes("order.manage");
}

export function canAccessKitchen(input: { roles: string[]; isSuperAdmin: boolean }): boolean {
  return (
    input.isSuperAdmin ||
    input.roles.includes("kitchen") ||
    input.roles.includes("branch-manager")
  );
}

export function canAccessDispatch(input: {
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
}): boolean {
  return (
    input.isSuperAdmin ||
    input.permissions.includes("delivery.read") ||
    input.permissions.includes("delivery.assign") ||
    input.permissions.includes("delivery.update") ||
    input.roles.includes("rider") ||
    input.roles.includes("branch-manager")
  );
}

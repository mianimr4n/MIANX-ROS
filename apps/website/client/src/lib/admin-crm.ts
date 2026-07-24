/** CRM helpers — customers derived from admin order contacts (no inventing CRM DB). */

import type { AdminOrderListItem } from "@/lib/admin-api";

export type CrmCustomer = {
  id: string;
  phone: string;
  displayName: string;
  orderCount: number;
  lifetimeSpend: number;
  averageSpend: number;
  lastOrderAt: string;
  firstOrderAt: string;
  lastOrderNumber: string;
  lastOrderId: string;
  lastStatus: string;
  lastOrderSource: string;
  branchIds: string[];
  primaryBranchId: string | null;
  orders: AdminOrderListItem[];
};

export function normalizePhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits || phone.trim().toLowerCase() || "unknown";
}

export function isKarachiToday(iso: string, now = new Date()): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  try {
    return formatter.format(new Date(iso)) === formatter.format(now);
  } catch {
    return false;
  }
}

export function aggregateCustomersFromOrders(orders: AdminOrderListItem[]): CrmCustomer[] {
  const map = new Map<string, CrmCustomer>();

  for (const order of orders) {
    const phone = order.contactPhone?.trim() || "";
    const key = normalizePhoneKey(phone || order.contactName || order.id);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: key,
        phone: phone || "—",
        displayName: order.contactName?.trim() || "Guest",
        orderCount: 1,
        lifetimeSpend: order.totalAmount,
        averageSpend: order.totalAmount,
        lastOrderAt: order.createdAt,
        firstOrderAt: order.createdAt,
        lastOrderNumber: order.orderNumber,
        lastOrderId: order.id,
        lastStatus: order.status,
        lastOrderSource: order.orderSource,
        branchIds: [order.branchId],
        primaryBranchId: order.branchId,
        orders: [order],
      });
      continue;
    }

    existing.orderCount += 1;
    existing.lifetimeSpend += order.totalAmount;
    existing.averageSpend = existing.lifetimeSpend / existing.orderCount;
    existing.orders.push(order);
    if (!existing.branchIds.includes(order.branchId)) {
      existing.branchIds.push(order.branchId);
    }
    if (order.createdAt > existing.lastOrderAt) {
      existing.lastOrderAt = order.createdAt;
      existing.lastOrderNumber = order.orderNumber;
      existing.lastOrderId = order.id;
      existing.lastStatus = order.status;
      existing.lastOrderSource = order.orderSource;
      existing.primaryBranchId = order.branchId;
      if (order.contactName?.trim()) existing.displayName = order.contactName.trim();
      if (phone) existing.phone = phone;
    }
    if (order.createdAt < existing.firstOrderAt) {
      existing.firstOrderAt = order.createdAt;
    }
  }

  for (const customer of Array.from(map.values())) {
    customer.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return Array.from(map.values()).sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt));
}

export type CrmKpiSnapshot = {
  totalCustomers: number;
  activeCustomers: number;
  newToday: number;
  repeatCustomers: number;
  averageOrderValue: number | null;
  lifetimeValueAvg: number | null;
};

/** Active = ordered in last 30 days (Asia/Karachi window from lastOrderAt). */
export function buildCrmKpis(customers: CrmCustomer[], now = Date.now()): CrmKpiSnapshot {
  const activeCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const activeCustomers = customers.filter((c) => new Date(c.lastOrderAt).getTime() >= activeCutoff).length;
  const newToday = customers.filter((c) => isKarachiToday(c.firstOrderAt)).length;
  const repeatCustomers = customers.filter((c) => c.orderCount >= 2).length;
  const spendSamples = customers.map((c) => c.averageSpend).filter((n) => n > 0);
  const ltvSamples = customers.map((c) => c.lifetimeSpend).filter((n) => n > 0);
  return {
    totalCustomers: customers.length,
    activeCustomers,
    newToday,
    repeatCustomers,
    averageOrderValue:
      spendSamples.length > 0
        ? Math.round(spendSamples.reduce((a, b) => a + b, 0) / spendSamples.length)
        : null,
    lifetimeValueAvg:
      ltvSamples.length > 0 ? Math.round(ltvSamples.reduce((a, b) => a + b, 0) / ltvSamples.length) : null,
  };
}

export function daysSince(iso: string, now = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / (24 * 60 * 60 * 1000)));
}

export function currentShiftLabel(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Karachi",
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value ?? "12",
  );
  if (hour < 16) return "Day shift (display only)";
  return "Evening shift (display only)";
}

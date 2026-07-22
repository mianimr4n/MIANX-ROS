/** Loyalty helpers — order-derived intelligence only; no invented points ledger. */

import {
  aggregateCustomersFromOrders,
  daysSince,
  type CrmCustomer,
} from "@/lib/admin-crm";
import type { AdminOrderListItem } from "@/lib/admin-api";

export type LoyaltyClassification =
  | "repeat"
  | "frequent"
  | "recently_active"
  | "inactive"
  | "high_value"
  | "single";

export type LoyaltyKpiSnapshot = {
  derivedCustomers: number;
  repeatCustomers: number;
  activeMembers: number;
  loyaltyRevenue: number;
  averageLifetimeSpend: number | null;
};

export type LoyaltyActivityEvent = {
  id: string;
  at: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  branchId: string;
  kind: "order_completed" | "repeat_purchase" | "customer_returned";
  label: string;
  detail: string;
};

export type LoyaltyInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation";
};

const HIGH_VALUE_THRESHOLD = 5000;

export function classifyCustomer(customer: CrmCustomer): LoyaltyClassification[] {
  const tags: LoyaltyClassification[] = [];
  if (customer.orderCount >= 3) tags.push("frequent");
  else if (customer.orderCount >= 2) tags.push("repeat");
  if (daysSince(customer.lastOrderAt) <= 7 && customer.orderCount >= 1) tags.push("recently_active");
  if (daysSince(customer.lastOrderAt) > 30) tags.push("inactive");
  if (customer.lifetimeSpend >= HIGH_VALUE_THRESHOLD) tags.push("high_value");
  if (customer.orderCount === 1) tags.push("single");
  return tags;
}

export function classificationLabel(tag: LoyaltyClassification): string {
  switch (tag) {
    case "frequent":
      return "Frequent customer";
    case "repeat":
      return "Repeat customer";
    case "recently_active":
      return "Recently active";
    case "inactive":
      return "Inactive";
    case "high_value":
      return "High-value (spend threshold)";
    case "single":
      return "Single order";
    default:
      return tag;
  }
}

export function buildLoyaltyKpis(customers: CrmCustomer[]): LoyaltyKpiSnapshot {
  const activeCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const spendSamples = customers.map((c) => c.lifetimeSpend).filter((n) => n > 0);
  return {
    derivedCustomers: customers.length,
    repeatCustomers: customers.filter((c) => c.orderCount >= 2).length,
    activeMembers: customers.filter((c) => new Date(c.lastOrderAt).getTime() >= activeCutoff).length,
    loyaltyRevenue: customers.reduce((sum, c) => sum + c.lifetimeSpend, 0),
    averageLifetimeSpend:
      spendSamples.length > 0
        ? Math.round(spendSamples.reduce((a, b) => a + b, 0) / spendSamples.length)
        : null,
  };
}

export function buildLoyaltyActivity(orders: AdminOrderListItem[]): LoyaltyActivityEvent[] {
  const customers = aggregateCustomersFromOrders(orders);
  const allEvents: LoyaltyActivityEvent[] = [];

  for (const customer of customers) {
    const sorted = [...customer.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 0; i < sorted.length; i += 1) {
      const order = sorted[i];
      const prev = i > 0 ? sorted[i - 1] : null;

      if (order.status === "completed" || order.status === "delivered") {
        allEvents.push({
          id: `${order.id}-completed`,
          at: order.updatedAt || order.createdAt,
          orderNumber: order.orderNumber,
          orderId: order.id,
          customerName: order.contactName?.trim() || "Guest",
          branchId: order.branchId,
          kind: "order_completed",
          label: "Completed order",
          detail: "Order-derived activity — not a points issuance event.",
        });
      }

      if (i >= 1) {
        allEvents.push({
          id: `${order.id}-repeat`,
          at: order.createdAt,
          orderNumber: order.orderNumber,
          orderId: order.id,
          customerName: order.contactName?.trim() || "Guest",
          branchId: order.branchId,
          kind: "repeat_purchase",
          label: "Repeat purchase",
          detail: "Rule-based: customer placed another order in the loaded window.",
        });
      }

      if (prev && daysSince(prev.createdAt, new Date(order.createdAt).getTime()) > 30) {
        allEvents.push({
          id: `${order.id}-returned`,
          at: order.createdAt,
          orderNumber: order.orderNumber,
          orderId: order.id,
          customerName: order.contactName?.trim() || "Guest",
          branchId: order.branchId,
          kind: "customer_returned",
          label: "Customer returned after inactivity",
          detail: "Rule-based: gap of 30+ days since prior order in window.",
        });
      }
    }
  }

  return allEvents.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}

export function buildLoyaltyInsights(
  customers: CrmCustomer[],
  branchLabelById: Record<string, string>,
): LoyaltyInsightItem[] {
  const items: LoyaltyInsightItem[] = [];
  const repeat = customers.filter((c) => c.orderCount >= 2).length;
  const inactiveRepeat = customers.filter((c) => c.orderCount >= 2 && daysSince(c.lastOrderAt) > 30).length;

  if (repeat > 0) {
    items.push({
      id: "repeat",
      title: `${repeat} customers in the loaded order window have placed more than one order.`,
      detail: "Rule-based Summary from phone-normalized order contacts.",
      source: "derived",
    });
  }

  if (inactiveRepeat > 0) {
    items.push({
      id: "inactive-repeat",
      title: `${inactiveRepeat} repeat customers have not ordered recently.`,
      detail: "Inactive = no order in 30+ days within the loaded window.",
      source: "derived",
    });
  }

  const byBranch = new Map<string, number>();
  for (const customer of customers.filter((c) => c.orderCount >= 2)) {
    const branchId = customer.primaryBranchId ?? "unknown";
    byBranch.set(branchId, (byBranch.get(branchId) ?? 0) + 1);
  }
  const topBranch = Array.from(byBranch.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topBranch && topBranch[1] >= 2) {
    const branchName = branchLabelById[topBranch[0]] ?? topBranch[0].slice(0, 8);
    items.push({
      id: "branch-concentration",
      title: `Repeat customers are concentrated in ${branchName}.`,
      detail: "Derived from primary branch on each customer's latest order.",
      source: "derived",
    });
  }

  items.push({
    id: "identity",
    title: "Customer identity is currently derived from phone numbers in orders.",
    detail: "No persistent loyalty member ID or points ledger exists yet.",
    source: "foundation",
  });

  items.push({
    id: "points-gap",
    title: "Points and reward-redemption data are not yet available.",
    detail: "Requires loyalty_accounts, loyalty_ledger_entries, and admin read APIs.",
    source: "foundation",
  });

  if (items.filter((i) => i.source === "derived").length === 0) {
    return [
      {
        id: "calm",
        title: "No repeat-customer patterns in the current order window.",
        detail: "Mianx.ai surfaces rule-based summaries as repeat behaviour appears.",
        source: "foundation",
      },
      items.find((i) => i.id === "identity")!,
      items.find((i) => i.id === "points-gap")!,
    ];
  }

  return items.slice(0, 6);
}

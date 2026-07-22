/** WhatsApp Order Center helpers — order-derived ops only; no invented messaging. */

import type { AdminOrderDetail, AdminOrderListItem } from "@/lib/admin-api";
import { aggregateCustomersFromOrders, normalizePhoneKey, type CrmCustomer } from "@/lib/admin-crm";

export type WhatsAppKpiSnapshot = {
  whatsappOrders: number;
  whatsappRevenue: number;
  activeOrders: number;
  pendingOrders: number;
  averageOrderValue: number | null;
};

export type WhatsAppActivityEvent = {
  id: string;
  at: string;
  orderNumber: string;
  orderId: string;
  label: string;
  detail: string;
  kind: "order" | "status";
};

export type WhatsAppInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation";
};

export type IntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "missing" | "derived";
  note: string;
};

export const WHATSAPP_ORDER_SOURCE = "whatsapp" as const;

export function buildWhatsAppKpis(orders: AdminOrderListItem[]): WhatsAppKpiSnapshot {
  const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const active = orders.filter((o) => !["completed", "cancelled", "delivered"].includes(o.status)).length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const amounts = orders.map((o) => o.totalAmount).filter((n) => n > 0);
  return {
    whatsappOrders: orders.length,
    whatsappRevenue: revenue,
    activeOrders: active,
    pendingOrders: pending,
    averageOrderValue:
      amounts.length > 0 ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : null,
  };
}

export function findCustomerForOrder(
  orders: AdminOrderListItem[],
  order: AdminOrderListItem | null,
): CrmCustomer | null {
  if (!order) return null;
  const customers = aggregateCustomersFromOrders(orders);
  const phoneKey = normalizePhoneKey(order.contactPhone || order.contactName || order.id);
  return customers.find((c) => c.id === phoneKey) ?? null;
}

export function buildWhatsAppActivity(detail: AdminOrderDetail | null): WhatsAppActivityEvent[] {
  if (!detail) return [];
  const events: WhatsAppActivityEvent[] = [
    {
      id: `${detail.id}-created`,
      at: detail.createdAt,
      orderNumber: detail.orderNumber,
      orderId: detail.id,
      label: "Order created",
      detail: `LIVE ORDER EVENT · source ${detail.orderSource}`,
      kind: "order",
    },
  ];
  for (const entry of detail.statusHistory ?? []) {
    events.push({
      id: `${detail.id}-${entry.createdAt}-${entry.toStatus}`,
      at: entry.createdAt,
      orderNumber: detail.orderNumber,
      orderId: detail.id,
      label: `Status → ${entry.toStatus}`,
      detail: entry.note ? `LIVE ORDER EVENT · ${entry.note}` : "LIVE ORDER EVENT",
      kind: "status",
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export function buildWhatsAppInsights(
  orders: AdminOrderListItem[],
  branchLabelById: Record<string, string>,
): WhatsAppInsightItem[] {
  const items: WhatsAppInsightItem[] = [];
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const customers = aggregateCustomersFromOrders(orders);
  const repeat = customers.filter((c) => c.orderCount >= 2).length;

  if (preparing > 0) {
    items.push({
      id: "preparing",
      title: `${preparing} WhatsApp-attributed orders are currently preparing.`,
      detail: "Rule-based Summary from loaded order window.",
      source: "derived",
    });
  }
  if (pending > 0) {
    items.push({
      id: "pending",
      title: `${pending} WhatsApp-attributed orders are awaiting staff action.`,
      detail: "Derived from order status in the current branch scope.",
      source: "derived",
    });
  }
  if (repeat > 0) {
    items.push({
      id: "repeat",
      title: `${repeat} customers in the loaded window have multiple WhatsApp-attributed orders.`,
      detail: "Phone-normalized order contacts — not persistent CRM IDs.",
      source: "derived",
    });
  }

  const byBranch = new Map<string, number>();
  for (const order of orders) {
    byBranch.set(order.branchId, (byBranch.get(order.branchId) ?? 0) + 1);
  }
  const top = Array.from(byBranch.entries()).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) {
    items.push({
      id: "branch",
      title: `Most WhatsApp-attributed orders in the current view belong to ${branchLabelById[top[0]] ?? top[0].slice(0, 8)}.`,
      detail: "Derived from order.branchId in loaded window.",
      source: "derived",
    });
  }

  items.push({
    id: "conversation-gap",
    title: "Conversation storage is unavailable, so response-time metrics cannot be calculated.",
    detail: "No inbound/outbound message persistence or provider webhooks in this repository.",
    source: "foundation",
  });

  items.push({
    id: "identity-gap",
    title: "Several orders may be missing a normalized customer name if contact data was not captured.",
    detail: "Rule-based note — verify contact_name and contact_phone on WhatsApp-attributed orders.",
    source: "foundation",
  });

  if (items.filter((i) => i.source === "derived").length === 0) {
    return [
      {
        id: "calm",
        title: "No WhatsApp-attributed orders in the current loaded window.",
        detail: "Customer wa.me handoffs are external until provider inbox ships.",
        source: "foundation",
      },
      items.find((i) => i.id === "conversation-gap")!,
    ];
  }

  return items.slice(0, 6);
}

export function integrationChecks(): IntegrationCheck[] {
  return [
    {
      id: "provider",
      label: "Provider credentials",
      status: "missing",
      note: "No Meta Cloud API / WABA configuration in client or verified server env exposure.",
    },
    {
      id: "webhook",
      label: "Inbound webhook",
      status: "missing",
      note: "No WhatsApp webhook route in backend/api.",
    },
    {
      id: "inbound-storage",
      label: "Inbound message storage",
      status: "missing",
      note: "No conversations/messages tables in migrations.",
    },
    {
      id: "outbound",
      label: "Outbound send API",
      status: "missing",
      note: "No staff send-message endpoint.",
    },
    {
      id: "status-webhook",
      label: "Message status webhook",
      status: "missing",
      note: "No delivered/read receipt persistence.",
    },
    {
      id: "templates",
      label: "Template sync",
      status: "missing",
      note: "No approved template catalogue API.",
    },
    {
      id: "phone-normalization",
      label: "Phone normalization",
      status: "partial",
      note: "E.164 helpers exist for profile/checkout; order contacts store raw phone strings.",
    },
    {
      id: "order-source",
      label: "WhatsApp order source",
      status: "present",
      note: "orders.order_source includes whatsapp; admin list filter supported.",
    },
    {
      id: "customer-linkage",
      label: "Customer linkage",
      status: "derived",
      note: "Phone grouping from orders only — no conversation link table.",
    },
    {
      id: "audit",
      label: "Messaging audit trail",
      status: "missing",
      note: "Order status history exists; message audit does not.",
    },
  ];
}

export function externalWhatsAppHandoffUrl(phoneDisplay: string, text?: string): string {
  const international = phoneDisplay.replace(/\D/g, "").replace(/^0/, "92");
  const base = `https://wa.me/${international}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

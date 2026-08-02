/**
 * Operational timeline — privacy-safe derived events from recent admin lists.
 * Not a complete audit trail; no PII (no employee names, phones, order contents).
 */

import type {
  OperationalTimeline,
  TimelineEvent,
  WhatChangedDomain,
  WhatChangedSeverity,
} from "./types";

export const TIMELINE_BOUNDED_COUNT = 20;

export type TimelineOrderLike = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type TimelineMovementLike = {
  id: string;
  movementType: string;
  createdAt: string;
};

export type TimelinePurchaseLike = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type TimelineKitchenLike = {
  id: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  acceptedAt?: string | null;
  readyAt?: string | null;
};

export type TimelineDeliveryLike = {
  id: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
};

export type TimelineBuildInput = {
  branchId: string | null;
  branchName: string;
  orders: TimelineOrderLike[] | null;
  ordersFailed: boolean;
  movements: TimelineMovementLike[] | null;
  movementsFailed: boolean;
  purchaseOrders: TimelinePurchaseLike[] | null;
  purchasingFailed: boolean;
  kitchenTickets: TimelineKitchenLike[] | null;
  kitchenFailed: boolean;
  deliveryAssignments: TimelineDeliveryLike[] | null;
  deliveryFailed: boolean;
  /** HR list may exist but must never contribute employee identity. */
  hrAvailable: boolean;
  hrFailed: boolean;
  financeRestricted: boolean;
  domainFilter?: WhatChangedDomain | "all";
  severityFilter?: WhatChangedSeverity | "all";
  windowStartMs?: number | null;
  nowMs?: number;
  bound?: number;
};

function event(
  partial: Omit<TimelineEvent, "organizationId" | "correlationReferenceSafe" | "actorType" | "actorDisplaySafe"> & {
    actorDisplaySafe?: string;
  },
): TimelineEvent {
  return {
    ...partial,
    organizationId: null,
    correlationReferenceSafe: null,
    actorType: "unavailable",
    actorDisplaySafe: partial.actorDisplaySafe ?? "Actor unavailable",
  };
}

function sortKey(a: TimelineEvent, b: TimelineEvent): number {
  const t = String(b.occurredAt).localeCompare(String(a.occurredAt));
  if (t !== 0) return t;
  return a.id.localeCompare(b.id);
}

export function buildOperationalTimeline(input: TimelineBuildInput): OperationalTimeline {
  const bound = input.bound ?? TIMELINE_BOUNDED_COUNT;
  const events: TimelineEvent[] = [];
  const unavailableDomains: string[] = [];
  const limitations: string[] = [
    "Timeline shows recent records currently visible in admin lists — not a complete organization audit stream.",
    "Events are DERIVED from current list payloads; they are not append-only persisted domain events.",
    "Settings / configuration history is not available yet.",
  ];

  if (input.ordersFailed) unavailableDomains.push("Orders");
  if (input.kitchenFailed) unavailableDomains.push("Kitchen");
  if (input.deliveryFailed) unavailableDomains.push("Delivery");
  if (input.movementsFailed) unavailableDomains.push("Inventory");
  if (input.purchasingFailed) unavailableDomains.push("Purchasing");
  if (input.hrFailed) unavailableDomains.push("People");
  if (input.financeRestricted) {
    unavailableDomains.push("Finance (permission-restricted)");
    limitations.push("Finance activity is omitted — permission-restricted on this session.");
  } else {
    unavailableDomains.push("Finance (no Owner timeline feed in this slice)");
  }
  unavailableDomains.push("Configuration (not present)");

  if (!input.ordersFailed && input.orders) {
    for (const order of input.orders.slice(0, 8)) {
      events.push(
        event({
          id: `order-status-${order.id}`,
          eventType: "orders.recent_status",
          domain: "orders",
          title: "Order activity",
          summary: `Recent order with status ${String(order.status)}.`,
          occurredAt: order.updatedAt || order.createdAt,
          branchId: input.branchId,
          branchName: input.branchName,
          entityType: "order",
          severity: ["cancelled", "failed"].includes(String(order.status)) ? "WARNING" : "INFORMATION",
          source: "Admin orders list",
          trustState: "DERIVED",
          persistenceState: "DERIVED",
          drillDown: { href: "/admin/orders", label: "Open Orders for order activity" },
          limitation: "Order identifiers and contents are omitted from this summary.",
        }),
      );
    }
  }

  if (!input.kitchenFailed && input.kitchenTickets) {
    for (const ticket of input.kitchenTickets.slice(0, 6)) {
      const at =
        ticket.readyAt || ticket.acceptedAt || ticket.updatedAt || ticket.createdAt || null;
      if (!at) continue;
      const delayed = ["queued", "accepted", "preparing"].includes(String(ticket.status));
      events.push(
        event({
          id: `kitchen-${ticket.id}`,
          eventType: "kitchen.ticket_state",
          domain: "kitchen",
          title: delayed ? "Kitchen ticket in progress" : "Kitchen ticket update",
          summary: `Kitchen ticket status ${String(ticket.status)}.`,
          occurredAt: at,
          branchId: input.branchId,
          branchName: input.branchName,
          entityType: "kitchen_ticket",
          severity: delayed ? "WARNING" : "INFORMATION",
          source: "Kitchen ticket list",
          trustState: "DERIVED",
          persistenceState: "DERIVED",
          drillDown: {
            href: "/admin/kitchen-dashboard",
            label: "Open Kitchen for ticket activity",
          },
        }),
      );
    }
  }

  if (!input.deliveryFailed && input.deliveryAssignments) {
    for (const a of input.deliveryAssignments.slice(0, 6)) {
      const at = a.deliveredAt || a.pickedUpAt || a.assignedAt || a.updatedAt || a.createdAt || null;
      if (!at) continue;
      const active = ["pending", "assigned", "picked-up"].includes(String(a.status));
      events.push(
        event({
          id: `delivery-${a.id}`,
          eventType: "delivery.assignment_state",
          domain: "delivery",
          title: active ? "Active delivery" : "Delivery update",
          summary: `Delivery assignment status ${String(a.status)}.`,
          occurredAt: at,
          branchId: input.branchId,
          branchName: input.branchName,
          entityType: "delivery_assignment",
          severity: active ? "WARNING" : "INFORMATION",
          source: "Delivery assignment list",
          trustState: "DERIVED",
          persistenceState: "DERIVED",
          drillDown: { href: "/admin/delivery", label: "Open Delivery for assignment activity" },
          limitation: "Rider identity and location are not shown.",
        }),
      );
    }
  }

  if (!input.movementsFailed && input.movements) {
    for (const m of input.movements.slice(0, 5)) {
      events.push(
        event({
          id: `stock-${m.id}`,
          eventType: "inventory.movement",
          domain: "inventory",
          title: "Stock movement",
          summary: `Inventory movement type ${String(m.movementType)}.`,
          occurredAt: m.createdAt,
          branchId: input.branchId,
          branchName: input.branchName,
          entityType: "stock_movement",
          severity: "INFORMATION",
          source: "Inventory movements list",
          trustState: "DERIVED",
          persistenceState: "DERIVED",
          drillDown: { href: "/admin/inventory", label: "Open Inventory for stock activity" },
          limitation: "Item SKU detail omitted from Owner timeline summary.",
        }),
      );
    }
  }

  if (!input.purchasingFailed && input.purchaseOrders) {
    for (const po of input.purchaseOrders.slice(0, 5)) {
      events.push(
        event({
          id: `po-${po.id}`,
          eventType: "purchasing.po_state",
          domain: "purchasing",
          title: "Purchase order update",
          summary: `Purchase order status ${String(po.status)}.`,
          occurredAt: po.updatedAt || po.createdAt,
          branchId: input.branchId,
          branchName: input.branchName,
          entityType: "purchase_order",
          severity: ["submitted", "pending_approval", "pending"].includes(String(po.status))
            ? "WARNING"
            : "INFORMATION",
          source: "Purchasing PO list",
          trustState: "DERIVED",
          persistenceState: "DERIVED",
          drillDown: { href: "/admin/purchasing", label: "Open Purchasing for PO activity" },
          limitation: "Supplier invoice and bank details are never shown here.",
        }),
      );
    }
  }

  if (input.hrAvailable && !input.hrFailed) {
    limitations.push(
      "People domain: employee identity is intentionally omitted; no HR person events are listed in this foundation slice.",
    );
  }

  // Deduplicate by id
  const byId = new Map<string, TimelineEvent>();
  for (const e of events) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  let list = Array.from(byId.values()).sort(sortKey);

  if (input.windowStartMs != null) {
    list = list.filter((e) => Date.parse(e.occurredAt) >= input.windowStartMs!);
  }

  if (input.domainFilter && input.domainFilter !== "all") {
    list = list.filter((e) => e.domain === input.domainFilter);
  }
  if (input.severityFilter && input.severityFilter !== "all") {
    list = list.filter((e) => e.severity === input.severityFilter);
  }

  const totalCandidateCount = list.length;
  const sliced = list.slice(0, bound);

  const sourceFailures = [
    input.ordersFailed,
    input.kitchenFailed,
    input.deliveryFailed,
    input.movementsFailed,
    input.purchasingFailed,
  ];
  const totalFailure = sourceFailures.every(Boolean);
  const partialFailure = sourceFailures.some(Boolean) && !totalFailure;

  return {
    events: sliced,
    truncated: totalCandidateCount > bound,
    boundedCount: bound,
    totalCandidateCount,
    emptyHonestMessage: totalFailure
      ? "Supported activity sources failed to load — this is not an empty day."
      : "No supported activity events were found for this window.",
    limitations,
    partialFailure,
    totalFailure,
    unavailableDomains: Array.from(new Set(unavailableDomains)),
  };
}

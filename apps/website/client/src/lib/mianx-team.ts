/**
 * Mianx.ai Team — typed fourteen-agent registry (no autonomous runtime).
 */

/** Minimal shared-model shapes — keep Node tests free of Vite path aliases. */
export type MianxReadinessItem = {
  id: string;
  category: string;
  status: string;
  problem: string;
  nextAction: string;
  sourceType?: string;
};

export type MianxOpeningPercentage = {
  completed: number;
  total: number;
  percent: number | null;
  label: string;
  live: boolean;
  error: boolean;
  offline: boolean;
};

export type MianxOwnerDecision = {
  title?: string;
  whyItMatters: string;
  nextAction: string;
};

export type AgentStatus =
  | "COMPLETE"
  | "ACTIVE"
  | "BLOCKED"
  | "WAITING_ON_HUMAN"
  | "FOUNDATION"
  | "UNAVAILABLE"
  | "OFFLINE"
  | "ERROR";

export type AgentSourceType =
  | "LIVE_API"
  | "DERIVED_API"
  | "RELEASE_EVIDENCE"
  | "CONFIGURED_PLAN"
  | "FOUNDATION";

export type MianxAgentId =
  | "chief-of-staff"
  | "opening-readiness"
  | "branch-operations"
  | "order-control"
  | "kitchen-control"
  | "delivery-control"
  | "pos-cash"
  | "dine-in-reservations"
  | "menu-pricing"
  | "customer-support"
  | "inventory-purchasing"
  | "finance-payments"
  | "security-access"
  | "reliability-deployment";

export type MianxAgentDefinition = {
  id: MianxAgentId;
  name: string;
  department: string;
  mission: string;
};

export const MIANX_AGENT_REGISTRY: readonly MianxAgentDefinition[] = [
  {
    id: "chief-of-staff",
    name: "Mianx.ai Chief of Staff",
    department: "Command",
    mission: "coordinate the opening plan and surface Owner decisions",
  },
  {
    id: "opening-readiness",
    name: "Opening Readiness Lead",
    department: "Opening",
    mission: "track people, providers, devices and branch prerequisites",
  },
  {
    id: "branch-operations",
    name: "Branch Operations Agent",
    department: "Branches",
    mission: "monitor branch operating status and readiness",
  },
  {
    id: "order-control",
    name: "Order Control Agent",
    department: "Orders",
    mission: "monitor pending, confirmed and active order truth",
  },
  {
    id: "kitchen-control",
    name: "Kitchen Control Agent",
    department: "Kitchen",
    mission: "monitor kitchen tickets, queue and preparation states",
  },
  {
    id: "delivery-control",
    name: "Delivery Control Agent",
    department: "Delivery",
    mission: "monitor delivery assignments and rider readiness",
  },
  {
    id: "pos-cash",
    name: "POS & Cash Agent",
    department: "POS",
    mission: "monitor POS/menu readiness without claiming accounting settlement",
  },
  {
    id: "dine-in-reservations",
    name: "Dine-in & Reservations Agent",
    department: "Floor",
    mission: "monitor tables, reservations and waitlist readiness",
  },
  {
    id: "menu-pricing",
    name: "Menu & Pricing Agent",
    department: "Menu",
    mission: "monitor menu accessibility, availability and canonical prices",
  },
  {
    id: "customer-support",
    name: "Customer Support Agent",
    department: "Support",
    mission: "monitor support and customer-contact readiness",
  },
  {
    id: "inventory-purchasing",
    name: "Inventory & Purchasing Agent",
    department: "Supply",
    mission: "report current FOUNDATION state and implementation dependencies",
  },
  {
    id: "finance-payments",
    name: "Finance & Payments Agent",
    department: "Finance",
    mission: "distinguish operational totals from accounting and payment readiness",
  },
  {
    id: "security-access",
    name: "Security & Access Agent",
    department: "Security",
    mission: "report RBAC, Founder access and staff-account readiness",
  },
  {
    id: "reliability-deployment",
    name: "Reliability & Deployment Agent",
    department: "Platform",
    mission: "report website/API health, releases and unresolved runtime failures",
  },
] as const;

export type MianxAgentCard = MianxAgentDefinition & {
  status: AgentStatus;
  verifiedSignal: string;
  currentProblem: string;
  nextAction: string;
  humanApprovalRequired: boolean;
  sourceType: AgentSourceType;
  lastUpdatedIso: string;
};

export type MianxTeamSignals = {
  nowIso: string;
  branchLabel: string;
  branchStatus: string | null;
  northernBypassStatus: string | null;
  /** order.status=pending only — never activeOrders fallback. */
  ordersPending: number | null;
  ordersError: boolean;
  /** Actual kitchen_tickets row count from /kitchen/tickets. */
  kitchenTickets: number | null;
  kitchenError: boolean;
  /** Assignment rows in assigned/picked-up — not order.status=dispatched KPI. */
  deliveriesActive: number | null;
  /** Provisional delivery records (pending order + pending delivery). */
  deliveriesProvisional: number | null;
  deliveryError: boolean;
  reservationsCount: number | null;
  reservationsError: boolean;
  waitlistCount: number | null;
  waitlistError: boolean;
  openingGrade: string | null;
  /** @deprecated Prefer readinessItems + criticalBlockerCount — kept unused. */
  openingBlockers?: number | null;
  openingError: boolean;
  healthOk: boolean | null;
  healthError: boolean;
  healthOffline?: boolean;
  isSuperAdmin: boolean;
  /** Shared opening-readiness model — drives Owner-facing agents. */
  readinessItems?: MianxReadinessItem[] | null;
  openingPercentage?: MianxOpeningPercentage | null;
  /** Precomputed from shared model — never raw API blockers.length. */
  openingCriticalBlockers?: number | null;
  openingWaitingOnHuman?: number | null;
  openingNextDecision?: MianxOwnerDecision | null;
};

function itemById(items: MianxReadinessItem[] | null | undefined, id: string) {
  return items?.find((i) => i.id === id) ?? null;
}

function peopleWaiting(items: MianxReadinessItem[] | null | undefined) {
  if (!items) return null;
  const people = items.filter((i) => i.category === "PEOPLE" && i.status !== "COMPLETE");
  return people;
}

function card(
  def: MianxAgentDefinition,
  partial: Omit<MianxAgentCard, keyof MianxAgentDefinition>,
): MianxAgentCard {
  return { ...def, ...partial };
}

/** Build honest agent cards from verified signals — never invent LIVE zeros on error. */
export function buildMianxAgentCards(signals: MianxTeamSignals): MianxAgentCard[] {
  const updated = signals.nowIso;
  const byId = new Map(MIANX_AGENT_REGISTRY.map((d) => [d.id, d]));

  const defs = MIANX_AGENT_REGISTRY;
  return defs.map((def) => {
    switch (def.id) {
      case "chief-of-staff": {
        const pct = signals.openingPercentage;
        const waitingPeople = peopleWaiting(signals.readinessItems);
        return card(def, {
          status: waitingPeople && waitingPeople.length > 0 ? "WAITING_ON_HUMAN" : "ACTIVE",
          verifiedSignal: pct?.label ?? "Opening mission tracked in Team Center",
          currentProblem:
            waitingPeople && waitingPeople.length > 0
              ? "Owner decisions still gate staffing, devices, payments, and go/no-go."
              : "Owner decisions still gate remaining opening blockers.",
          nextAction: "Review Owner Decision Queue and clear WAITING_ON_HUMAN items",
          humanApprovalRequired: true,
          sourceType: "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
      }
      case "opening-readiness": {
        if (signals.openingError) {
          return card(def, {
            status: "UNAVAILABLE",
            verifiedSignal: "Opening readiness API error — not LIVE",
            currentProblem: "Could not load opening readiness for the selected branch",
            nextAction: "Retry opening readiness and confirm branch selection",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        const items = signals.readinessItems ?? null;
        if (!items || items.length === 0) {
          return card(def, {
            status: "ACTIVE",
            verifiedSignal: "Opening readiness not yet loaded",
            currentProblem: "No verified readiness grade for the selected branch",
            nextAction: "Open Branch readiness and complete staffing/device checks",
            humanApprovalRequired: true,
            sourceType: "CONFIGURED_PLAN",
            lastUpdatedIso: updated,
          });
        }
        const critical = signals.openingCriticalBlockers ?? 0;
        const waiting = signals.openingWaitingOnHuman ?? 0;
        const next = signals.openingNextDecision ?? null;
        const pctLabel = signals.openingPercentage?.label ?? "Required opening checks incomplete";
        if (waiting > 0 || critical > 0) {
          return card(def, {
            status: "WAITING_ON_HUMAN",
            verifiedSignal: `${pctLabel} · critical blockers ${critical} · waiting on human ${waiting}`,
            currentProblem:
              next?.whyItMatters ??
              "Shared readiness model still has unresolved required opening checks.",
            nextAction: next?.nextAction ?? "Resolve Owner Decision Queue items on this page",
            humanApprovalRequired: true,
            sourceType: "DERIVED_API",
            lastUpdatedIso: updated,
          });
        }
        return card(def, {
          status: "ACTIVE",
          verifiedSignal: pctLabel,
          currentProblem: "Continue monitoring people, devices, and providers",
          nextAction: "Confirm opening-day staffing roster and go/no-go evidence",
          humanApprovalRequired: true,
          sourceType: "DERIVED_API",
          lastUpdatedIso: updated,
        });
      }
      case "branch-operations": {
        const northern = itemById(signals.readinessItems, "gov-northern-bypass");
        return card(def, {
          status: signals.branchStatus === "coming-soon" ? "BLOCKED" : "ACTIVE",
          verifiedSignal: `${signals.branchLabel}: ${signals.branchStatus ?? "unknown"}; Northern Bypass: ${signals.northernBypassStatus ?? "unknown"}`,
          currentProblem:
            northern?.status === "COMPLETE"
              ? "Northern Bypass correctly remains coming-soon"
              : northern?.problem ?? "Confirm branch operating status matches Production",
          nextAction: northern?.nextAction ?? "Keep Northern Bypass coming-soon; operate Royal Orchard only",
          humanApprovalRequired: true,
          sourceType: "DERIVED_API",
          lastUpdatedIso: updated,
        });
      }
      case "order-control":
        if (signals.ordersError) {
          return card(def, {
            status: "ERROR",
            verifiedSignal: "Orders API error — not LIVE",
            currentProblem: "Order counts unavailable; refusing fake LIVE zero",
            nextAction: "Retry orders API and verify staff order.manage access",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        return card(def, {
          status: "ACTIVE",
          verifiedSignal:
            signals.ordersPending == null
              ? "Pending confirmation signal not loaded"
              : `Pending customer confirmation: ${signals.ordersPending}`,
          currentProblem:
            "Pending confirmation is not a kitchen ticket and must not show Queued / Waiting for rider",
          nextAction: "Review Orders console; protect TP-260727-000001 until intentional confirm",
          humanApprovalRequired: false,
          sourceType: signals.ordersPending == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "kitchen-control":
        if (signals.kitchenError) {
          return card(def, {
            status: "ERROR",
            verifiedSignal: "Kitchen tickets API error — not LIVE",
            currentProblem: "Kitchen ticket counts unavailable — refusing fake LIVE zero",
            nextAction: "Retry kitchen tickets API",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        return card(def, {
          status: "ACTIVE",
          verifiedSignal:
            signals.kitchenTickets == null
              ? "Kitchen tickets signal not loaded"
              : `Actual kitchen tickets: ${signals.kitchenTickets}`,
          currentProblem: "KDS queue is kitchen_tickets only — pending orders without tickets stay out",
          nextAction: "Open Kitchen board and verify zero-ticket honesty",
          humanApprovalRequired: false,
          sourceType: signals.kitchenTickets == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "delivery-control":
        if (signals.deliveryError) {
          return card(def, {
            status: "ERROR",
            verifiedSignal: "Delivery assignments API error — not LIVE",
            currentProblem: "Delivery assignments unavailable — refusing fake LIVE zero",
            nextAction: "Retry delivery API and confirm rider staffing",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        return card(def, {
          status: "ACTIVE",
          verifiedSignal:
            signals.deliveriesActive == null
              ? "Delivery assignments signal not loaded"
              : `Active dispatched deliveries: ${signals.deliveriesActive}; Provisional delivery records: ${signals.deliveriesProvisional ?? 0}`,
          currentProblem:
            "Provisional delivery rows for unconfirmed orders are not active and not late",
          nextAction: "Open Delivery console; assign only when order is ready",
          humanApprovalRequired: true,
          sourceType: signals.deliveriesActive == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "pos-cash": {
        const pos = itemById(signals.readinessItems, "device-pos");
        const pay = itemById(signals.readinessItems, "payments-provider");
        return card(def, {
          status: pos?.status === "COMPLETE" && pay?.status === "COMPLETE" ? "ACTIVE" : "WAITING_ON_HUMAN",
          verifiedSignal: pos
            ? `POS device: ${pos.status}; payment provider: ${pay?.status ?? "unknown"}`
            : "POS route available for authorized cashiers/BM/SA",
          currentProblem:
            pos?.problem ?? "POS readiness is operational — not accounting settlement or provider verification",
          nextAction: pos?.nextAction ?? "Spot-check POS + menu reachability on Royal Orchard devices",
          humanApprovalRequired: true,
          sourceType: pos?.sourceType === "FOUNDATION" ? "FOUNDATION" : "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
      }
      case "dine-in-reservations":
        if (signals.reservationsError || signals.waitlistError) {
          return card(def, {
            status: "UNAVAILABLE",
            verifiedSignal: "Reservations/waitlist API error — not LIVE",
            currentProblem: "Table-service list APIs failed; no fake EMPTY",
            nextAction: "Retry reservations/waitlist with limit<=100",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        {
          const floor = itemById(signals.readinessItems, "floor-plan");
          const policy = itemById(signals.readinessItems, "booking-policy");
          const incomplete = [floor, policy].some((i) => i && i.status !== "COMPLETE");
          return card(def, {
            status: incomplete ? "WAITING_ON_HUMAN" : "ACTIVE",
            verifiedSignal: `Reservations ${signals.reservationsCount ?? "—"} · Waitlist ${signals.waitlistCount ?? "—"}`,
            currentProblem:
              incomplete
                ? floor?.problem ?? policy?.problem ?? "Floor/booking setup incomplete"
                : "Confirm intentional bookings vs EMPTY for opening day",
            nextAction:
              incomplete
                ? floor?.nextAction ?? policy?.nextAction ?? "Configure floor, tables, and booking policy"
                : "Review Reservations and Waitlist for Royal Orchard",
            humanApprovalRequired: incomplete,
            sourceType:
              signals.reservationsCount == null && signals.waitlistCount == null
                ? "CONFIGURED_PLAN"
                : "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
      case "menu-pricing":
        return card(def, {
          status: "ACTIVE",
          verifiedSignal: "Canonical menu catalog served via API + Admin Menu",
          currentProblem: "Confirm availability flags for opening day SKUs",
          nextAction: "Open Menu Management and verify canonical prices",
          humanApprovalRequired: false,
          sourceType: "RELEASE_EVIDENCE",
          lastUpdatedIso: updated,
        });
      case "customer-support": {
        const support = itemById(signals.readinessItems, "people-customer-support");
        return card(def, {
          status: support?.status === "COMPLETE" ? "ACTIVE" : "WAITING_ON_HUMAN",
          verifiedSignal: support
            ? `Customer-support coverage: ${support.status}`
            : "Support surface present for Owner shell",
          currentProblem: support?.problem ?? "Customer-contact staffing still Owner-owned",
          nextAction: support?.nextAction ?? "Confirm WhatsApp/support coverage for opening week",
          humanApprovalRequired: true,
          sourceType: (support?.sourceType as AgentSourceType | undefined) ?? "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
      }
      case "inventory-purchasing":
        return card(def, {
          status: "FOUNDATION",
          verifiedSignal: "No stock ledger / purchasing settlement backend",
          currentProblem: "Inventory & purchasing remain FOUNDATION modules",
          nextAction: "Approve inventory domain before claiming LIVE stock counts",
          humanApprovalRequired: true,
          sourceType: "FOUNDATION",
          lastUpdatedIso: updated,
        });
      case "finance-payments":
        return card(def, {
          status: "FOUNDATION",
          verifiedSignal: "Operational payment totals may exist; GL ledger does not",
          currentProblem: "Do not treat Finance UI as accounting settlement",
          nextAction: "Separate ops totals from accounting readiness decisions",
          humanApprovalRequired: true,
          sourceType: "FOUNDATION",
          lastUpdatedIso: updated,
        });
      case "security-access":
        return card(def, {
          status: signals.isSuperAdmin ? "ACTIVE" : "BLOCKED",
          verifiedSignal: "Canonical roles only; Owner/Founder are labels for super-admin",
          currentProblem: "Staff account coverage for opening roles must be confirmed",
          nextAction: "Review HR/staff invites for kitchen, cashier, rider, host, waiter",
          humanApprovalRequired: true,
          sourceType: "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
      case "reliability-deployment":
        if (signals.healthOffline) {
          return card(def, {
            status: "OFFLINE",
            verifiedSignal: "Health OFFLINE — not LIVE",
            currentProblem: "System health poll is offline",
            nextAction: "Retry system health when network recovers",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        if (signals.healthError) {
          return card(def, {
            status: "ERROR",
            verifiedSignal: "Health signal ERROR — not LIVE",
            currentProblem: "Could not read API/system health",
            nextAction: "Retry system health from Executive Dashboard",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        return card(def, {
          status: signals.healthOk === false ? "BLOCKED" : "ACTIVE",
          verifiedSignal:
            signals.healthOk == null
              ? "Health not loaded"
              : signals.healthOk
                ? "API health OK"
                : "API health degraded",
          currentProblem: "Watch Vercel/Render deploys after merges; no manual deploy in this slice",
          nextAction: "Confirm website + API health before opening day",
          humanApprovalRequired: false,
          sourceType: signals.healthOk == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      default: {
        const _exhaustive: never = def.id;
        void _exhaustive;
        void byId;
        return card(def, {
          status: "UNAVAILABLE",
          verifiedSignal: "Unknown agent",
          currentProblem: "Registry mismatch",
          nextAction: "Fix agent registry",
          humanApprovalRequired: true,
          sourceType: "FOUNDATION",
          lastUpdatedIso: updated,
        });
      }
    }
  });
}

export function summarizeAgentStatuses(cards: MianxAgentCard[]) {
  const counts: Record<AgentStatus, number> = {
    COMPLETE: 0,
    ACTIVE: 0,
    BLOCKED: 0,
    WAITING_ON_HUMAN: 0,
    FOUNDATION: 0,
    UNAVAILABLE: 0,
    OFFLINE: 0,
    ERROR: 0,
  };
  for (const c of cards) counts[c.status] += 1;
  const decisionPending = cards.filter((c) => c.humanApprovalRequired).length;
  return { counts, decisionPending };
}

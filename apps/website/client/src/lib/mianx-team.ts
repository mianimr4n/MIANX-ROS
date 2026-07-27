/**
 * Mianx.ai Team — typed fourteen-agent registry (no autonomous runtime).
 */

export type AgentStatus =
  | "COMPLETE"
  | "ACTIVE"
  | "BLOCKED"
  | "WAITING_ON_HUMAN"
  | "FOUNDATION"
  | "UNAVAILABLE";

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
  ordersPending: number | null;
  ordersError: boolean;
  kitchenTickets: number | null;
  kitchenError: boolean;
  deliveriesActive: number | null;
  deliveryError: boolean;
  reservationsCount: number | null;
  reservationsError: boolean;
  waitlistCount: number | null;
  waitlistError: boolean;
  openingGrade: string | null;
  openingBlockers: number | null;
  openingError: boolean;
  healthOk: boolean | null;
  healthError: boolean;
  isSuperAdmin: boolean;
};

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
      case "chief-of-staff":
        return card(def, {
          status: "ACTIVE",
          verifiedSignal: "Opening mission tracked in Team Center",
          currentProblem: "Orders/Kitchen/Delivery truth alignment still pending on this branch",
          nextAction: "Review Owner Decision Queue and clear WAITING_ON_HUMAN items",
          humanApprovalRequired: true,
          sourceType: "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
      case "opening-readiness":
        if (signals.openingError) {
          return card(def, {
            status: "UNAVAILABLE",
            verifiedSignal: "Opening readiness API error",
            currentProblem: "Could not load opening readiness for the selected branch",
            nextAction: "Retry opening readiness and confirm branch selection",
            humanApprovalRequired: false,
            sourceType: "LIVE_API",
            lastUpdatedIso: updated,
          });
        }
        if (signals.openingGrade == null) {
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
        return card(def, {
          status: (signals.openingBlockers ?? 0) > 0 ? "WAITING_ON_HUMAN" : "ACTIVE",
          verifiedSignal: `Grade ${signals.openingGrade}; blockers ${signals.openingBlockers ?? 0}`,
          currentProblem:
            (signals.openingBlockers ?? 0) > 0
              ? "Stored opening checks still incomplete"
              : "Continue monitoring people, devices, and providers",
          nextAction:
            (signals.openingBlockers ?? 0) > 0
              ? "Complete opening readiness blockers on Branch dashboard"
              : "Confirm opening-day staffing roster",
          humanApprovalRequired: (signals.openingBlockers ?? 0) > 0,
          sourceType: "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "branch-operations":
        return card(def, {
          status: signals.branchStatus === "coming-soon" ? "BLOCKED" : "ACTIVE",
          verifiedSignal: `${signals.branchLabel}: ${signals.branchStatus ?? "unknown"}; Northern Bypass: ${signals.northernBypassStatus ?? "unknown"}`,
          currentProblem:
            signals.northernBypassStatus === "coming-soon"
              ? "Northern Bypass correctly remains coming-soon"
              : "Confirm branch operating status matches Production",
          nextAction: "Keep Northern Bypass coming-soon; operate Royal Orchard only",
          humanApprovalRequired: false,
          sourceType: "DERIVED_API",
          lastUpdatedIso: updated,
        });
      case "order-control":
        if (signals.ordersError) {
          return card(def, {
            status: "UNAVAILABLE",
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
              ? "Orders signal not loaded"
              : `Pending orders (scope): ${signals.ordersPending}`,
          currentProblem: "Pending orders must not invent kitchen tickets before confirmation",
          nextAction: "Review Orders console; protect TP-260727-000001 until intentional confirm",
          humanApprovalRequired: false,
          sourceType: signals.ordersPending == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "kitchen-control":
        if (signals.kitchenError) {
          return card(def, {
            status: "UNAVAILABLE",
            verifiedSignal: "Kitchen API error — not LIVE",
            currentProblem: "Kitchen ticket counts unavailable",
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
              ? "Kitchen signal not loaded"
              : `Kitchen tickets (scope): ${signals.kitchenTickets}`,
          currentProblem: "Ticket truth must follow confirmed orders only",
          nextAction: "Open Kitchen board and verify queue honesty",
          humanApprovalRequired: false,
          sourceType: signals.kitchenTickets == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "delivery-control":
        if (signals.deliveryError) {
          return card(def, {
            status: "UNAVAILABLE",
            verifiedSignal: "Delivery API error — not LIVE",
            currentProblem: "Delivery assignments unavailable",
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
              ? "Delivery signal not loaded"
              : `Active deliveries (scope): ${signals.deliveriesActive}`,
          currentProblem: "Rider readiness must be verified before opening peak",
          nextAction: "Open Delivery console and confirm rider coverage",
          humanApprovalRequired: true,
          sourceType: signals.deliveriesActive == null ? "CONFIGURED_PLAN" : "LIVE_API",
          lastUpdatedIso: updated,
        });
      case "pos-cash":
        return card(def, {
          status: "ACTIVE",
          verifiedSignal: "POS route available for authorized cashiers/BM/SA",
          currentProblem: "POS readiness is operational — not accounting settlement",
          nextAction: "Spot-check POS + menu reachability on Royal Orchard devices",
          humanApprovalRequired: false,
          sourceType: "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
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
        return card(def, {
          status: "ACTIVE",
          verifiedSignal: `Reservations ${signals.reservationsCount ?? "—"} · Waitlist ${signals.waitlistCount ?? "—"}`,
          currentProblem: "Confirm intentional bookings vs EMPTY for opening day",
          nextAction: "Review Reservations and Waitlist for Royal Orchard",
          humanApprovalRequired: false,
          sourceType:
            signals.reservationsCount == null && signals.waitlistCount == null
              ? "CONFIGURED_PLAN"
              : "LIVE_API",
          lastUpdatedIso: updated,
        });
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
      case "customer-support":
        return card(def, {
          status: "ACTIVE",
          verifiedSignal: "Support surface present for Owner shell",
          currentProblem: "Customer-contact staffing still Owner-owned",
          nextAction: "Confirm WhatsApp/support coverage for opening week",
          humanApprovalRequired: true,
          sourceType: "CONFIGURED_PLAN",
          lastUpdatedIso: updated,
        });
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
        if (signals.healthError) {
          return card(def, {
            status: "UNAVAILABLE",
            verifiedSignal: "Health signal error — not LIVE",
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
  const counts = {
    COMPLETE: 0,
    ACTIVE: 0,
    BLOCKED: 0,
    WAITING_ON_HUMAN: 0,
    FOUNDATION: 0,
    UNAVAILABLE: 0,
  };
  for (const c of cards) counts[c.status] += 1;
  const decisionPending = cards.filter((c) => c.humanApprovalRequired).length;
  const total = cards.length || 1;
  const readinessPct = Math.round(
    ((counts.COMPLETE + counts.ACTIVE * 0.7 + counts.FOUNDATION * 0.2) / total) * 100,
  );
  return { counts, decisionPending, readinessPct: Math.min(100, Math.max(0, readinessPct)) };
}

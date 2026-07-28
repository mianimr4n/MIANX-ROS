/**
 * Opening readiness command center — single typed registry shared by
 * /admin/ai-team, /admin/dashboard, and /admin/branch.
 *
 * Software delivery completion ≠ restaurant opening readiness.
 * Percentages are deterministic and never invent LIVE from CONFIGURED_PLAN.
 */

export const OPENING_CANONICAL_PEOPLE_ROLES = [
  "branch-manager",
  "cashier",
  "kitchen",
  "rider",
  "host",
  "waiter",
  "customer-support",
] as const;

export const OPENING_FORBIDDEN_ROLE_CODES = ["owner", "founder", "general-staff", "delivery"] as const;

export type ReadinessCategory =
  | "BRANCH"
  | "PEOPLE"
  | "FLOOR_AND_BOOKING"
  | "PAYMENTS"
  | "NOTIFICATIONS"
  | "DEVICES"
  | "MENU"
  | "OPERATIONS"
  | "TRAINING"
  | "RELIABILITY"
  | "GOVERNANCE";

export type ReadinessStatus =
  | "COMPLETE"
  | "ACTIVE"
  | "BLOCKED"
  | "WAITING_ON_HUMAN"
  | "FOUNDATION"
  | "UNAVAILABLE"
  | "ERROR"
  | "OFFLINE";

export type ReadinessSourceType =
  | "LIVE_API"
  | "DERIVED_API"
  | "RELEASE_EVIDENCE"
  | "CONFIGURED_PLAN"
  | "FOUNDATION";

export type BranchApplicability = "royal-orchard" | "any-operating" | "all-branches" | "northern-bypass";

export type BlockingSeverity = "critical" | "high" | "medium" | "low" | "none";

export type OpeningReadinessItemId =
  | "branch-status-operating"
  | "branch-phone"
  | "branch-hours"
  | "menu-assigned"
  | "people-branch-manager"
  | "people-cashier"
  | "people-kitchen"
  | "people-rider"
  | "people-host"
  | "people-waiter"
  | "people-customer-support"
  | "floor-plan"
  | "floor-tables"
  | "booking-policy"
  | "reservations-route"
  | "waitlist-route"
  | "payments-methods-decided"
  | "payments-provider"
  | "payments-card-terminal"
  | "payments-cash-sop"
  | "notif-customer"
  | "notif-kitchen"
  | "notif-rider"
  | "notif-escalation"
  | "device-pos"
  | "device-kds"
  | "device-printer"
  | "device-card-terminal"
  | "device-rider"
  | "device-internet"
  | "device-backup-internet"
  | "device-ups"
  | "ops-order-confirm-sop"
  | "ops-kitchen-sop"
  | "ops-delivery-sop"
  | "ops-cancel-refund-sop"
  | "ops-opening-checklist"
  | "ops-closing-checklist"
  | "training-bm"
  | "training-cashier"
  | "training-kitchen"
  | "training-rider"
  | "training-host-waiter"
  | "training-e2e"
  | "reliability-website"
  | "reliability-api"
  | "reliability-rollback"
  | "reliability-incident"
  | "gov-founder-approval"
  | "gov-owner-handover"
  | "gov-northern-bypass";

export type OpeningReadinessDefinition = {
  id: OpeningReadinessItemId;
  category: ReadinessCategory;
  title: string;
  description: string;
  requiredForOpening: boolean;
  branchApplicability: BranchApplicability;
  sourceType: ReadinessSourceType;
  contributesToPercentage: boolean;
  blockingSeverity: BlockingSeverity;
  ownerDecision: boolean;
  deepLink: string;
  /** Default problem when incomplete — evaluation may override. */
  defaultProblem: string;
  defaultNextAction: string;
};

/** Static registry — evaluation fills status/problem/nextAction. */
export const OPENING_READINESS_DEFINITIONS: readonly OpeningReadinessDefinition[] = [
  {
    id: "branch-status-operating",
    category: "BRANCH",
    title: "Royal Orchard status operating",
    description: "Branch operational status must be operating for launch.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: false,
    deepLink: "/admin/branch",
    defaultProblem: "Branch is not operating.",
    defaultNextAction: "Confirm Royal Orchard status remains operating in branch settings.",
  },
  {
    id: "branch-phone",
    category: "BRANCH",
    title: "Real phone configured",
    description: "Public branch phone must be a real configured number.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: false,
    deepLink: "/admin/branch",
    defaultProblem: "Phone number missing or placeholder.",
    defaultNextAction: "Set the real Royal Orchard contact phone.",
  },
  {
    id: "branch-hours",
    category: "BRANCH",
    title: "Real operating hours configured",
    description: "Published operating hours must be present.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: false,
    deepLink: "/admin/branch",
    defaultProblem: "Operating hours missing.",
    defaultNextAction: "Configure Royal Orchard opening hours.",
  },
  {
    id: "menu-assigned",
    category: "MENU",
    title: "Menu assigned and available",
    description: "Canonical menu must be assigned to the branch.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: false,
    deepLink: "/admin/menu",
    defaultProblem: "Menu not assigned or unavailable.",
    defaultNextAction: "Open Menu Management and verify Royal Orchard catalog.",
  },
  {
    id: "people-branch-manager",
    category: "PEOPLE",
    title: "Branch manager assigned",
    description: "Named branch-manager on Royal Orchard scope.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem: "No branch-manager assigned to Royal Orchard.",
    defaultNextAction: "Founder invites a named branch-manager for Royal Orchard.",
  },
  {
    id: "people-cashier",
    category: "PEOPLE",
    title: "Cashier assigned",
    description: "Named cashier on Royal Orchard scope.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem: "No cashier assigned to Royal Orchard.",
    defaultNextAction: "Founder invites a named cashier for Royal Orchard.",
  },
  {
    id: "people-kitchen",
    category: "PEOPLE",
    title: "Kitchen assigned",
    description: "Named kitchen staff on Royal Orchard scope.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem: "No kitchen staff assigned to Royal Orchard.",
    defaultNextAction: "Founder invites named kitchen staff for Royal Orchard.",
  },
  {
    id: "people-rider",
    category: "PEOPLE",
    title: "Rider assigned",
    description: "Named rider on Royal Orchard scope.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem: "No rider assigned to Royal Orchard.",
    defaultNextAction: "Founder invites a named rider for Royal Orchard.",
  },
  {
    id: "people-host",
    category: "PEOPLE",
    title: "Host assigned",
    description: "Named host on Royal Orchard scope.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem: "No host assigned to Royal Orchard.",
    defaultNextAction: "Founder invites a named host for Royal Orchard.",
  },
  {
    id: "people-waiter",
    category: "PEOPLE",
    title: "Waiter assigned",
    description: "Named waiter on Royal Orchard scope.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem: "No waiter assigned to Royal Orchard.",
    defaultNextAction: "Founder invites a named waiter for Royal Orchard.",
  },
  {
    id: "people-customer-support",
    category: "PEOPLE",
    title: "Customer-support coverage assigned",
    description: "Named customer-support coverage for opening week.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/hr",
    defaultProblem:
      "Customer-support assignment is not probed by the readiness API — Founder must assign named coverage.",
    defaultNextAction: "Founder invites named customer-support using the canonical role.",
  },
  {
    id: "floor-plan",
    category: "FLOOR_AND_BOOKING",
    title: "Floor plan configured",
    description: "Active restaurant floor exists for the branch.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/floor",
    defaultProblem: "Floor plan not configured.",
    defaultNextAction: "Configure Royal Orchard floor plan.",
  },
  {
    id: "floor-tables",
    category: "FLOOR_AND_BOOKING",
    title: "Tables configured",
    description: "Active tables exist for the branch.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/floor",
    defaultProblem: "Tables not configured.",
    defaultNextAction: "Add active tables for Royal Orchard.",
  },
  {
    id: "booking-policy",
    category: "FLOOR_AND_BOOKING",
    title: "Booking policy configured",
    description: "Branch booking policy row present.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/reservations",
    defaultProblem: "Booking policy not configured.",
    defaultNextAction: "Approve and save Royal Orchard booking policy.",
  },
  {
    id: "reservations-route",
    category: "FLOOR_AND_BOOKING",
    title: "Reservations route healthy",
    description: "Reservations list API succeeds for the branch.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/reservations",
    defaultProblem: "Reservations API unavailable.",
    defaultNextAction: "Open Reservations and retry with limit ≤ 100.",
  },
  {
    id: "waitlist-route",
    category: "FLOOR_AND_BOOKING",
    title: "Waitlist route healthy",
    description: "Waitlist list API succeeds for the branch.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/waitlist",
    defaultProblem: "Waitlist API unavailable.",
    defaultNextAction: "Open Waitlist and retry with limit ≤ 100.",
  },
  {
    id: "payments-methods-decided",
    category: "PAYMENTS",
    title: "Accepted payment methods decided",
    description: "Founder decides cash/card/other methods for opening.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Payment methods not recorded as Founder-approved.",
    defaultNextAction: "Decide accepted payment methods for Royal Orchard opening day.",
  },
  {
    id: "payments-provider",
    category: "PAYMENTS",
    title: "Payment provider verified",
    description: "Provider credentials verified — not order.payment_status.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/settings",
    defaultProblem: "No verified payment-provider settings API — not accounting from order rows.",
    defaultNextAction: "Verify payment provider outside Admin UI; do not invent Connected status.",
  },
  {
    id: "payments-card-terminal",
    category: "PAYMENTS",
    title: "Card terminal verification",
    description: "Physical card terminal verified onsite.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Card terminal not verified onsite.",
    defaultNextAction: "Verify the Royal Orchard card terminal before opening day.",
  },
  {
    id: "payments-cash-sop",
    category: "PAYMENTS",
    title: "Cash handling / reconciliation SOP",
    description: "Cash drawer and reconciliation procedure agreed.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Cash handling SOP not confirmed.",
    defaultNextAction: "Confirm cash handling and reconciliation procedure with branch manager.",
  },
  {
    id: "notif-customer",
    category: "NOTIFICATIONS",
    title: "Customer order notification channel",
    description: "Customer order updates channel selected — do not claim WhatsApp connected.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "DERIVED_API",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/settings",
    defaultProblem: "Customer notification channel not verified.",
    defaultNextAction: "Configure customer notification channel without claiming WhatsApp Connected.",
  },
  {
    id: "notif-kitchen",
    category: "NOTIFICATIONS",
    title: "Kitchen notification method",
    description: "How kitchen is notified of new tickets.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: true,
    deepLink: "/admin/kitchen",
    defaultProblem: "Kitchen notification method not confirmed.",
    defaultNextAction: "Confirm KDS/audio/staff method for new tickets.",
  },
  {
    id: "notif-rider",
    category: "NOTIFICATIONS",
    title: "Rider notification method",
    description: "How riders receive dispatch assignments.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: true,
    deepLink: "/admin/delivery",
    defaultProblem: "Rider notification method not confirmed.",
    defaultNextAction: "Confirm how riders receive assignment alerts.",
  },
  {
    id: "notif-escalation",
    category: "NOTIFICATIONS",
    title: "Escalation contact",
    description: "Named escalation contact for opening incidents.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Escalation contact not named.",
    defaultNextAction: "Name Founder/BM escalation contact for opening week.",
  },
  {
    id: "device-pos",
    category: "DEVICES",
    title: "POS device verified",
    description: "Onsite POS hardware verified — not frontend route availability.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/pos",
    defaultProblem: "POS device not verified onsite.",
    defaultNextAction: "Verify POS device on Royal Orchard floor before opening.",
  },
  {
    id: "device-kds",
    category: "DEVICES",
    title: "KDS device verified",
    description: "Onsite kitchen display verified.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/kitchen-dashboard",
    defaultProblem: "KDS device not verified onsite.",
    defaultNextAction: "Verify kitchen display hardware onsite.",
  },
  {
    id: "device-printer",
    category: "DEVICES",
    title: "Receipt printer verified",
    description: "Receipt printer prints a test ticket.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/pos",
    defaultProblem: "Receipt printer not verified.",
    defaultNextAction: "Print a test receipt on the opening POS station.",
  },
  {
    id: "device-card-terminal",
    category: "DEVICES",
    title: "Card terminal device verified",
    description: "Physical card terminal connectivity verified.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Card terminal device not verified.",
    defaultNextAction: "Run a test authorization on the card terminal (no Production order mutation).",
  },
  {
    id: "device-rider",
    category: "DEVICES",
    title: "Rider device verified",
    description: "Rider phone/app readiness verified.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/delivery",
    defaultProblem: "Rider device not verified.",
    defaultNextAction: "Confirm rider phone and dispatch access for opening riders.",
  },
  {
    id: "device-internet",
    category: "DEVICES",
    title: "Internet connection verified",
    description: "Primary internet verified onsite.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Primary internet not verified onsite.",
    defaultNextAction: "Verify Royal Orchard primary internet with POS and KDS online.",
  },
  {
    id: "device-backup-internet",
    category: "DEVICES",
    title: "Backup internet / contingency documented",
    description: "Failover plan documented.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Backup internet contingency not documented.",
    defaultNextAction: "Document backup hotspot / ISP contingency for opening day.",
  },
  {
    id: "device-ups",
    category: "DEVICES",
    title: "UPS / power backup verified",
    description: "Power contingency verified for POS/KDS.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "UPS / power backup not verified.",
    defaultNextAction: "Verify UPS coverage for POS and kitchen displays.",
  },
  {
    id: "ops-order-confirm-sop",
    category: "OPERATIONS",
    title: "Order confirmation SOP",
    description: "Staff SOP for confirming pending website orders.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/orders",
    defaultProblem: "Order confirmation SOP not rehearsed.",
    defaultNextAction: "Review order confirmation SOP on Orders Management.",
  },
  {
    id: "ops-kitchen-sop",
    category: "OPERATIONS",
    title: "Kitchen progression SOP",
    description: "Kitchen ticket progression SOP.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/kitchen",
    defaultProblem: "Kitchen progression SOP not rehearsed.",
    defaultNextAction: "Review kitchen ticket progression on Kitchen board.",
  },
  {
    id: "ops-delivery-sop",
    category: "OPERATIONS",
    title: "Delivery dispatch SOP",
    description: "Rider assignment and dispatch SOP.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/delivery",
    defaultProblem: "Delivery dispatch SOP not rehearsed.",
    defaultNextAction: "Review delivery dispatch SOP — provisional rows are not active dispatch.",
  },
  {
    id: "ops-cancel-refund-sop",
    category: "OPERATIONS",
    title: "Cancellation / refund SOP",
    description: "Cancellation and refund operating procedure.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: true,
    deepLink: "/admin/orders",
    defaultProblem: "Cancellation/refund SOP not confirmed.",
    defaultNextAction: "Confirm cancellation and refund procedure with Founder.",
  },
  {
    id: "ops-opening-checklist",
    category: "OPERATIONS",
    title: "Opening checklist",
    description: "Daily opening checklist agreed.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/branch",
    defaultProblem: "Opening checklist not confirmed.",
    defaultNextAction: "Confirm daily opening checklist with branch manager.",
  },
  {
    id: "ops-closing-checklist",
    category: "OPERATIONS",
    title: "Closing checklist",
    description: "Daily closing checklist agreed.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/branch",
    defaultProblem: "Closing checklist not confirmed.",
    defaultNextAction: "Confirm daily closing checklist with branch manager.",
  },
  {
    id: "training-bm",
    category: "TRAINING",
    title: "Branch-manager rehearsal",
    description: "BM rehearsal recorded.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Branch-manager rehearsal not recorded.",
    defaultNextAction: "Schedule and record branch-manager opening rehearsal.",
  },
  {
    id: "training-cashier",
    category: "TRAINING",
    title: "Cashier / POS rehearsal",
    description: "Cashier POS rehearsal recorded.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/pos",
    defaultProblem: "Cashier/POS rehearsal not recorded.",
    defaultNextAction: "Schedule cashier POS rehearsal on Royal Orchard devices.",
  },
  {
    id: "training-kitchen",
    category: "TRAINING",
    title: "Kitchen rehearsal",
    description: "Kitchen ticket rehearsal recorded.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/kitchen",
    defaultProblem: "Kitchen rehearsal not recorded.",
    defaultNextAction: "Schedule kitchen KDS rehearsal.",
  },
  {
    id: "training-rider",
    category: "TRAINING",
    title: "Rider rehearsal",
    description: "Rider dispatch rehearsal recorded.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "high",
    ownerDecision: true,
    deepLink: "/admin/delivery",
    defaultProblem: "Rider rehearsal not recorded.",
    defaultNextAction: "Schedule rider dispatch rehearsal.",
  },
  {
    id: "training-host-waiter",
    category: "TRAINING",
    title: "Host / waiter rehearsal",
    description: "Floor service rehearsal recorded.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: true,
    deepLink: "/admin/floor",
    defaultProblem: "Host/waiter rehearsal not recorded.",
    defaultNextAction: "Schedule host and waiter floor rehearsal.",
  },
  {
    id: "training-e2e",
    category: "TRAINING",
    title: "Full end-to-end rehearsal",
    description: "Full order→kitchen→delivery rehearsal recorded.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "FOUNDATION",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Full end-to-end rehearsal not recorded.",
    defaultNextAction: "Schedule full order-to-delivery rehearsal before 14 August.",
  },
  {
    id: "reliability-website",
    category: "RELIABILITY",
    title: "Production website health",
    description: "Website health signal OK.",
    requiredForOpening: true,
    branchApplicability: "all-branches",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: false,
    deepLink: "/admin/dashboard",
    defaultProblem: "Website health not verified.",
    defaultNextAction: "Confirm Production website health from Executive Dashboard.",
  },
  {
    id: "reliability-api",
    category: "RELIABILITY",
    title: "Production API health",
    description: "API health signal OK.",
    requiredForOpening: true,
    branchApplicability: "all-branches",
    sourceType: "LIVE_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: false,
    deepLink: "/admin/dashboard",
    defaultProblem: "API health not verified.",
    defaultNextAction: "Confirm Production API health from system health.",
  },
  {
    id: "reliability-rollback",
    category: "RELIABILITY",
    title: "Rollback runbook present",
    description: "Repository rollback runbook exists (path not shown in UI).",
    requiredForOpening: true,
    branchApplicability: "all-branches",
    sourceType: "RELEASE_EVIDENCE",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/ai-team",
    defaultProblem: "Rollback runbook missing from repository evidence.",
    defaultNextAction: "Confirm docs/10-devops rollback runbook remains present in repo.",
  },
  {
    id: "reliability-incident",
    category: "RELIABILITY",
    title: "Incident escalation runbook present",
    description: "Incident escalation documented.",
    requiredForOpening: true,
    branchApplicability: "all-branches",
    sourceType: "RELEASE_EVIDENCE",
    contributesToPercentage: true,
    blockingSeverity: "medium",
    ownerDecision: false,
    deepLink: "/admin/ai-team",
    defaultProblem: "Incident escalation runbook not confirmed.",
    defaultNextAction: "Confirm opening-day incident escalation contacts in Opening Day Runbook.",
  },
  {
    id: "gov-founder-approval",
    category: "GOVERNANCE",
    title: "Founder opening approval",
    description: "Explicit Founder go/no-go for 14 August.",
    requiredForOpening: true,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Founder go/no-go not recorded.",
    defaultNextAction: "Review final go/no-go evidence and authorize opening only when ready.",
  },
  {
    id: "gov-owner-handover",
    category: "GOVERNANCE",
    title: "Future Owner handover",
    description: "Owner handover plan for post-opening operations.",
    requiredForOpening: false,
    branchApplicability: "royal-orchard",
    sourceType: "CONFIGURED_PLAN",
    contributesToPercentage: false,
    blockingSeverity: "low",
    ownerDecision: true,
    deepLink: "/admin/ai-team",
    defaultProblem: "Future Owner handover not scheduled.",
    defaultNextAction: "Plan Owner handover after Royal Orchard opening stability.",
  },
  {
    id: "gov-northern-bypass",
    category: "GOVERNANCE",
    title: "Northern Bypass activation authorization",
    description: "Separate Founder decision — must remain coming-soon unless authorized.",
    requiredForOpening: true,
    branchApplicability: "northern-bypass",
    sourceType: "DERIVED_API",
    contributesToPercentage: true,
    blockingSeverity: "critical",
    ownerDecision: true,
    deepLink: "/admin/branch",
    defaultProblem: "Northern Bypass must stay coming-soon until separate authorization.",
    defaultNextAction: "Keep Northern Bypass coming-soon; do not activate with Royal Orchard.",
  },
] as const;

export type EvaluatedReadinessItem = OpeningReadinessDefinition & {
  status: ReadinessStatus;
  problem: string;
  nextAction: string;
  lastVerifiedAt: string | null;
};

export type OpeningReadinessSignals = {
  nowIso: string;
  branchCode: string | null;
  branchStatus: string | null;
  northernBypassStatus: string | null;
  /** null when readiness API failed */
  readinessReport: {
    readinessGrade?: string;
    checks: Record<string, boolean>;
    blockers: Array<{ code: string; message: string; nextAction?: string }>;
  } | null;
  readinessError: boolean;
  readinessOffline: boolean;
  reservationsOk: boolean | null;
  waitlistOk: boolean | null;
  healthOk: boolean | null;
  healthError: boolean;
  healthOffline: boolean;
  /**
   * Documentation presence from release-evidence registry (not operational COMPLETE).
   * Explicit true = documented; false/undefined = not confirmed documented.
   */
  rollbackRunbookPresent?: boolean;
  incidentRunbookPresent?: boolean;
};

export type OpeningPercentage = {
  completed: number;
  total: number;
  percent: number | null;
  label: string;
  live: boolean;
  error: boolean;
  offline: boolean;
};

export type OwnerDecision = {
  id: string;
  title: string;
  whyItMatters: string;
  blockingSeverity: BlockingSeverity;
  status: ReadinessStatus;
  nextAction: string;
  deepLink: string;
  humanRequired: true;
  branchScope: string;
  priority: number;
};

function fromCheck(
  def: OpeningReadinessDefinition,
  ok: boolean | undefined,
  signals: OpeningReadinessSignals,
): EvaluatedReadinessItem {
  if (signals.readinessOffline) {
    return { ...def, status: "OFFLINE", problem: "Readiness API offline.", nextAction: "Retry when network recovers.", lastVerifiedAt: null };
  }
  if (signals.readinessError || signals.readinessReport == null) {
    return { ...def, status: "ERROR", problem: "Readiness API error — not treating as missing setup.", nextAction: "Retry opening readiness for the selected branch.", lastVerifiedAt: null };
  }
  if (ok) {
    return { ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso };
  }
  return {
    ...def,
    status: def.ownerDecision ? "WAITING_ON_HUMAN" : "BLOCKED",
    problem: def.defaultProblem,
    nextAction: def.defaultNextAction,
    lastVerifiedAt: signals.nowIso,
  };
}

function humanFoundation(def: OpeningReadinessDefinition, signals: OpeningReadinessSignals): EvaluatedReadinessItem {
  return {
    ...def,
    status: "WAITING_ON_HUMAN",
    problem: def.defaultProblem,
    nextAction: def.defaultNextAction,
    lastVerifiedAt: signals.nowIso,
  };
}

function configuredPlan(def: OpeningReadinessDefinition, signals: OpeningReadinessSignals, complete = false): EvaluatedReadinessItem {
  if (complete) {
    return { ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso };
  }
  // Unrehearsed ops/training stay WAITING_ON_HUMAN even when not Owner-owned decisions.
  const waiting =
    def.ownerDecision || def.category === "OPERATIONS" || def.category === "TRAINING";
  return {
    ...def,
    status: waiting ? "WAITING_ON_HUMAN" : "ACTIVE",
    problem: def.defaultProblem,
    nextAction: def.defaultNextAction,
    lastVerifiedAt: signals.nowIso,
  };
}

/**
 * Documentation presence ≠ rehearsal ≠ operational verification.
 * Documented runbooks stay ACTIVE (not COMPLETE) until a verified ops source exists.
 */
function runbookDocumentationItem(
  def: OpeningReadinessDefinition,
  signals: OpeningReadinessSignals,
  documented: boolean,
): EvaluatedReadinessItem {
  if (!documented) {
    return {
      ...def,
      status: "BLOCKED",
      problem: def.defaultProblem,
      nextAction: def.defaultNextAction,
      lastVerifiedAt: signals.nowIso,
    };
  }
  return {
    ...def,
    status: "ACTIVE",
    problem:
      "Runbook is documented in release evidence — rehearsal and onsite operational verification still required.",
    nextAction:
      "Confirm rehearsal and operational verification; documentation alone does not mark this COMPLETE.",
    lastVerifiedAt: signals.nowIso,
  };
}

let registryCopyValidated = false;

/** Fail closed when forbidden role codes appear in registry copy. */
export function validateOpeningReadinessRegistryCopy(): void {
  for (const def of OPENING_READINESS_DEFINITIONS) {
    const blob = [def.id, def.title, def.description, def.defaultProblem, def.defaultNextAction, def.deepLink].join(
      "\n",
    );
    if (!assertNoForbiddenRolesInReadinessCopy(blob)) {
      throw new Error(`Forbidden role code in opening readiness copy: ${def.id}`);
    }
  }
}

/** Evaluate the full registry against verified signals. */
export function evaluateOpeningReadiness(signals: OpeningReadinessSignals): EvaluatedReadinessItem[] {
  if (!registryCopyValidated) {
    validateOpeningReadinessRegistryCopy();
    registryCopyValidated = true;
  }
  const checks = signals.readinessReport?.checks ?? {};
  const notifOk = checks.notificationConfigured === true;
  const floorOk = checks.floorConfigured === true;

  const items: EvaluatedReadinessItem[] = [];

  for (const def of OPENING_READINESS_DEFINITIONS) {
    switch (def.id) {
      case "branch-status-operating":
        items.push(fromCheck(def, checks.statusOperating, signals));
        break;
      case "branch-phone":
        items.push(fromCheck(def, checks.phone, signals));
        break;
      case "branch-hours":
        items.push(fromCheck(def, checks.operatingHours, signals));
        break;
      case "menu-assigned":
        items.push(fromCheck(def, checks.menuAssigned, signals));
        break;
      case "people-branch-manager":
        items.push(fromCheck(def, checks.branchManagerAssigned, signals));
        break;
      case "people-cashier":
        items.push(fromCheck(def, checks.cashierAssigned, signals));
        break;
      case "people-kitchen":
        items.push(fromCheck(def, checks.kitchenAssigned, signals));
        break;
      case "people-rider":
        items.push(fromCheck(def, checks.riderAssigned, signals));
        break;
      case "people-host":
        items.push(fromCheck(def, checks.hostAssigned, signals));
        break;
      case "people-waiter":
        items.push(fromCheck(def, checks.waiterAssigned, signals));
        break;
      case "people-customer-support":
        items.push(humanFoundation(def, signals));
        break;
      case "floor-plan":
      case "floor-tables":
        // API exposes combined floorConfigured (floors AND tables).
        items.push(fromCheck(def, floorOk, signals));
        break;
      case "booking-policy":
        items.push(fromCheck(def, checks.bookingPolicyConfigured, signals));
        break;
      case "reservations-route":
        if (signals.reservationsOk === null) {
          items.push({ ...def, status: "UNAVAILABLE", problem: "Reservations signal not loaded.", nextAction: "Open Reservations after auth.", lastVerifiedAt: null });
        } else if (signals.reservationsOk) {
          items.push({ ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso });
        } else {
          items.push({ ...def, status: "ERROR", problem: def.defaultProblem, nextAction: def.defaultNextAction, lastVerifiedAt: signals.nowIso });
        }
        break;
      case "waitlist-route":
        if (signals.waitlistOk === null) {
          items.push({ ...def, status: "UNAVAILABLE", problem: "Waitlist signal not loaded.", nextAction: "Open Waitlist after auth.", lastVerifiedAt: null });
        } else if (signals.waitlistOk) {
          items.push({ ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso });
        } else {
          items.push({ ...def, status: "ERROR", problem: def.defaultProblem, nextAction: def.defaultNextAction, lastVerifiedAt: signals.nowIso });
        }
        break;
      case "payments-provider":
        if (signals.readinessError || signals.readinessOffline) {
          items.push(fromCheck(def, false, signals));
        } else if (checks.paymentConfigured) {
          items.push({ ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso });
        } else {
          items.push(humanFoundation(def, signals));
        }
        break;
      case "notif-customer":
        if (signals.readinessError || signals.readinessOffline) {
          items.push(fromCheck(def, false, signals));
        } else if (notifOk) {
          items.push({ ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso });
        } else {
          items.push(humanFoundation(def, signals));
        }
        break;
      case "reliability-website":
      case "reliability-api":
        if (signals.healthOffline) {
          items.push({ ...def, status: "OFFLINE", problem: "Health API offline.", nextAction: "Retry system health.", lastVerifiedAt: null });
        } else if (signals.healthError) {
          items.push({ ...def, status: "ERROR", problem: "Health API error — refusing fake LIVE.", nextAction: "Retry system health.", lastVerifiedAt: null });
        } else if (signals.healthOk === null) {
          items.push({ ...def, status: "UNAVAILABLE", problem: "Health not loaded for this session.", nextAction: def.defaultNextAction, lastVerifiedAt: null });
        } else if (signals.healthOk) {
          items.push({ ...def, status: "COMPLETE", problem: "None.", nextAction: "No action required.", lastVerifiedAt: signals.nowIso });
        } else {
          items.push({ ...def, status: "BLOCKED", problem: "Health degraded.", nextAction: def.defaultNextAction, lastVerifiedAt: signals.nowIso });
        }
        break;
      case "reliability-rollback":
        items.push(runbookDocumentationItem(def, signals, signals.rollbackRunbookPresent === true));
        break;
      case "reliability-incident":
        items.push(runbookDocumentationItem(def, signals, signals.incidentRunbookPresent === true));
        break;
      case "gov-northern-bypass": {
        const nb = (signals.northernBypassStatus ?? "coming-soon").toLowerCase();
        if (nb === "coming-soon") {
          items.push({
            ...def,
            status: "COMPLETE",
            problem: "None — Northern Bypass correctly remains coming-soon.",
            nextAction: "Keep Northern Bypass coming-soon unless separately authorized.",
            lastVerifiedAt: signals.nowIso,
          });
        } else if (nb === "operating") {
          items.push({
            ...def,
            status: "BLOCKED",
            problem: "Northern Bypass is operating without separate opening authorization evidence.",
            nextAction: "Founder must explicitly authorize or revert Northern Bypass to coming-soon.",
            lastVerifiedAt: signals.nowIso,
          });
        } else {
          items.push({
            ...def,
            status: "WAITING_ON_HUMAN",
            problem: `Northern Bypass status is ${nb}.`,
            nextAction: def.defaultNextAction,
            lastVerifiedAt: signals.nowIso,
          });
        }
        break;
      }
      case "payments-methods-decided":
      case "payments-card-terminal":
      case "payments-cash-sop":
      case "notif-kitchen":
      case "notif-rider":
      case "notif-escalation":
      case "device-pos":
      case "device-kds":
      case "device-printer":
      case "device-card-terminal":
      case "device-rider":
      case "device-internet":
      case "device-backup-internet":
      case "device-ups":
      case "ops-order-confirm-sop":
      case "ops-kitchen-sop":
      case "ops-delivery-sop":
      case "ops-cancel-refund-sop":
      case "ops-opening-checklist":
      case "ops-closing-checklist":
      case "training-bm":
      case "training-cashier":
      case "training-kitchen":
      case "training-rider":
      case "training-host-waiter":
      case "training-e2e":
      case "gov-founder-approval":
      case "gov-owner-handover":
        if (def.sourceType === "FOUNDATION") {
          items.push(humanFoundation(def, signals));
        } else {
          items.push(configuredPlan(def, signals, false));
        }
        break;
      default: {
        const _x: never = def.id;
        void _x;
        items.push(humanFoundation(def, signals));
      }
    }
  }

  return items;
}

/**
 * Deterministic opening percentage.
 * Only required + contributesToPercentage items enter the denominator.
 * COMPLETE earns credit; ACTIVE/WAITING_ON_HUMAN/BLOCKED/ERROR/OFFLINE/FOUNDATION/UNAVAILABLE do not.
 */
export function computeOpeningPercentage(
  items: EvaluatedReadinessItem[],
  opts?: { readinessError?: boolean; readinessOffline?: boolean },
): OpeningPercentage {
  if (opts?.readinessOffline) {
    return {
      completed: 0,
      total: 0,
      percent: null,
      label: "Opening readiness unavailable — OFFLINE (not a LIVE percentage)",
      live: false,
      error: false,
      offline: true,
    };
  }
  if (opts?.readinessError) {
    return {
      completed: 0,
      total: 0,
      percent: null,
      label: "Opening readiness unavailable — ERROR (not a LIVE percentage)",
      live: false,
      error: true,
      offline: false,
    };
  }

  const scored = items.filter((i) => i.requiredForOpening && i.contributesToPercentage);
  const total = scored.length;
  if (total === 0) {
    return {
      completed: 0,
      total: 0,
      percent: null,
      label: "No required opening checks in denominator",
      live: false,
      error: false,
      offline: false,
    };
  }
  const completed = scored.filter((i) => i.status === "COMPLETE").length;
  const percent = Math.round((completed / total) * 100);
  return {
    completed,
    total,
    percent,
    label: `Opening readiness: ${completed} of ${total} required checks complete — ${percent}%`,
    live: true,
    error: false,
    offline: false,
  };
}

const DECISION_PRIORITY: Array<{ id: OpeningReadinessItemId | "people-staff-bundle"; priority: number; title: string; why: string }> = [
  {
    id: "people-staff-bundle",
    priority: 1,
    title: "Assign real Royal Orchard operating staff",
    why: "Opening day cannot run without named branch-manager, cashier, kitchen, rider, host, waiter, and support coverage.",
  },
  { id: "floor-plan", priority: 2, title: "Configure floor and tables", why: "Dine-in service needs an active floor plan and tables." },
  { id: "booking-policy", priority: 3, title: "Approve booking policy", why: "Reservations and waitlist need an approved policy." },
  { id: "payments-methods-decided", priority: 4, title: "Decide payment methods and verify provider/terminal", why: "Guests must be able to pay with Founder-approved methods." },
  { id: "notif-customer", priority: 5, title: "Configure notification channels", why: "Customers and staff need verified notification paths — not claimed WhatsApp Connected." },
  { id: "device-pos", priority: 6, title: "Verify onsite POS/KDS/printer/rider devices", why: "Hardware must be proven on the floor, not assumed from UI routes." },
  { id: "device-internet", priority: 7, title: "Verify internet and UPS contingency", why: "Connectivity and power outages will stop service without contingency." },
  { id: "training-e2e", priority: 8, title: "Schedule staff training and full rehearsal", why: "Roles must rehearse before 14 August." },
  { id: "gov-founder-approval", priority: 9, title: "Review final go/no-go evidence", why: "Founder must review blockers before authorizing opening." },
  { id: "gov-founder-approval", priority: 10, title: "Authorize opening", why: "Explicit Founder go-live approval is required — software % is not restaurant ready." },
  { id: "gov-northern-bypass", priority: 11, title: "Keep Northern Bypass coming-soon unless separately authorized", why: "Northern Bypass must not inherit Royal Orchard launch readiness." },
];

const PEOPLE_IDS: OpeningReadinessItemId[] = [
  "people-branch-manager",
  "people-cashier",
  "people-kitchen",
  "people-rider",
  "people-host",
  "people-waiter",
  "people-customer-support",
];

const DEVICE_BUNDLE: OpeningReadinessItemId[] = [
  "device-pos",
  "device-kds",
  "device-printer",
  "device-card-terminal",
  "device-rider",
];

/** Urgent Owner Decision Queue — unresolved only, priority ordered. */
export function buildOwnerDecisionQueue(
  items: EvaluatedReadinessItem[],
  branchScope: string,
): OwnerDecision[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: OwnerDecision[] = [];
  const seen = new Set<string>();

  for (const row of DECISION_PRIORITY) {
    if (row.id === "people-staff-bundle") {
      const missing = PEOPLE_IDS.map((id) => byId.get(id)).filter(
        (i) => i && i.status !== "COMPLETE",
      ) as EvaluatedReadinessItem[];
      if (missing.length === 0) continue;
      const key = "people-staff-bundle";
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: key,
        title: row.title,
        whyItMatters: row.why,
        blockingSeverity: "critical",
        status: "WAITING_ON_HUMAN",
        nextAction:
          "Founder invites named staff using canonical roles (branch-manager, cashier, kitchen, rider, host, waiter, customer-support) for Royal Orchard — no test accounts.",
        deepLink: "/admin/hr",
        humanRequired: true,
        branchScope,
        priority: row.priority,
      });
      continue;
    }

    if (row.id === "device-pos") {
      const missing = DEVICE_BUNDLE.map((id) => byId.get(id)).filter(
        (i) => i && i.status !== "COMPLETE",
      ) as EvaluatedReadinessItem[];
      if (missing.length === 0) continue;
      const key = "device-bundle";
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: key,
        title: row.title,
        whyItMatters: row.why,
        blockingSeverity: "critical",
        status: "WAITING_ON_HUMAN",
        nextAction: "Verify POS, KDS, receipt printer, card terminal, and rider devices onsite.",
        deepLink: "/admin/pos",
        humanRequired: true,
        branchScope,
        priority: row.priority,
      });
      continue;
    }

    // priority 9 and 10 both map to founder approval — emit once if incomplete
    const item = byId.get(row.id);
    if (!item || item.status === "COMPLETE") continue;
    if (seen.has(row.id) && row.id === "gov-founder-approval") {
      // allow second founder row with distinct title if still incomplete
      if (row.priority === 10 && !seen.has("gov-authorize-opening")) {
        seen.add("gov-authorize-opening");
        out.push({
          id: "gov-authorize-opening",
          title: row.title,
          whyItMatters: row.why,
          blockingSeverity: item.blockingSeverity,
          status: item.status,
          nextAction: item.nextAction,
          deepLink: item.deepLink,
          humanRequired: true,
          branchScope,
          priority: row.priority,
        });
      }
      continue;
    }
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      id: row.id,
      title: row.title,
      whyItMatters: row.why,
      blockingSeverity: item.blockingSeverity,
      status: item.status,
      nextAction: item.nextAction,
      deepLink: item.deepLink,
      humanRequired: true,
      branchScope,
      priority: row.priority,
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

export function recentlyCompletedItems(items: EvaluatedReadinessItem[]): EvaluatedReadinessItem[] {
  return items.filter((i) => i.status === "COMPLETE" && i.requiredForOpening);
}

export function groupReadinessByCategory(items: EvaluatedReadinessItem[]) {
  const order: ReadinessCategory[] = [
    "BRANCH",
    "PEOPLE",
    "FLOOR_AND_BOOKING",
    "PAYMENTS",
    "NOTIFICATIONS",
    "DEVICES",
    "MENU",
    "OPERATIONS",
    "TRAINING",
    "RELIABILITY",
    "GOVERNANCE",
  ];
  return order
    .map((category) => ({
      category,
      label: categoryLabel(category),
      items: items.filter((i) => i.category === category),
    }))
    .filter((g) => g.items.length > 0);
}

export function categoryLabel(category: ReadinessCategory): string {
  switch (category) {
    case "BRANCH":
      return "Branch";
    case "PEOPLE":
      return "People";
    case "FLOOR_AND_BOOKING":
      return "Floor and booking";
    case "PAYMENTS":
      return "Payments";
    case "NOTIFICATIONS":
      return "Notifications";
    case "DEVICES":
      return "Devices";
    case "MENU":
      return "Menu";
    case "OPERATIONS":
      return "Operations";
    case "TRAINING":
      return "Training";
    case "RELIABILITY":
      return "Reliability";
    case "GOVERNANCE":
      return "Governance";
    default:
      return category;
  }
}

export function displayGroupLabel(category: ReadinessCategory): string {
  if (category === "PAYMENTS" || category === "NOTIFICATIONS") return "Payments and notifications";
  if (category === "TRAINING" || category === "GOVERNANCE") return "Training and governance";
  return categoryLabel(category);
}

/**
 * Forbidden role *codes* must not appear as role assignments.
 * Human titles ("Founder", "Owner") and kebab IDs (gov-owner-handover) are allowed.
 */
export function assertNoForbiddenRolesInReadinessCopy(text: string): boolean {
  for (const code of OPENING_FORBIDDEN_ROLE_CODES) {
    if (
      new RegExp(
        `(?:role|role[_-]?code|user[_-]?role|canonical[_-]?role)\\s*[:=]\\s*["']?${code}\\b`,
        "i",
      ).test(text)
    ) {
      return false;
    }
    // Quoted assignment tokens: roles: ["owner"] / roleCodes include 'founder'
    if (
      new RegExp(
        `(?:roles?|role[_-]?codes?)[^\\n]{0,40}["'\`]${code}["'\`]`,
        "i",
      ).test(text)
    ) {
      return false;
    }
  }
  return true;
}

export function canonicalPeopleRoles(): readonly string[] {
  return OPENING_CANONICAL_PEOPLE_ROLES;
}

export function countByStatus(items: EvaluatedReadinessItem[]) {
  const counts: Record<ReadinessStatus, number> = {
    COMPLETE: 0,
    ACTIVE: 0,
    BLOCKED: 0,
    WAITING_ON_HUMAN: 0,
    FOUNDATION: 0,
    UNAVAILABLE: 0,
    ERROR: 0,
    OFFLINE: 0,
  };
  for (const i of items) counts[i.status] += 1;
  return counts;
}

export function criticalBlockerCount(items: EvaluatedReadinessItem[]): number {
  return items.filter(
    (i) =>
      i.requiredForOpening &&
      (i.blockingSeverity === "critical" || i.blockingSeverity === "high") &&
      i.status !== "COMPLETE" &&
      i.status !== "ACTIVE" &&
      // Unverified / not-yet-loaded signals must not invent blockers or inflate totals.
      i.status !== "UNAVAILABLE",
  ).length;
}

export function waitingOnHumanCount(items: EvaluatedReadinessItem[]): number {
  return items.filter((i) => i.status === "WAITING_ON_HUMAN").length;
}

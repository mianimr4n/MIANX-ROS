/**
 * Build explainable Branch Health Score from verified Owner dashboard sources.
 * Read-only — no fetch, mutate, AI, or invented thresholds.
 */

import {
  PREP_TARGET_MINUTES,
  elapsedMinutes,
  ticketTimerStartIso,
} from "@/lib/admin-kitchen";
import { DELIVERY_LATE_MINUTES } from "@/lib/admin-delivery";
import { classifyDeliveryLate, isDispatchWaitingForRider } from "@/lib/operational-truth";
import {
  BRANCH_HEALTH_TOTAL_WEIGHT,
  BRANCH_HEALTH_WEIGHTS,
  CONFIRMATION_PENDING_MINUTES,
  MIN_COVERAGE_PERCENT,
} from "./weights";
import {
  computeConfidence,
  computeCoveragePercent,
  computeWeightedScore,
  mapOpFreshness,
  mapScoreState,
  mergeFreshness,
  scoreCashVarianceClear,
  scoreFromDelayRate,
  scoreStockPressure,
  sourceFailed,
  statusLabelFor,
} from "./formula";
import type {
  BranchHealthComponent,
  BranchHealthFreshness,
  BranchHealthScore,
  BranchHealthSourceInput,
  ExcludedComponent,
} from "./types";

const DEFERRED_DOMAINS = [
  "Customer complaint health",
  "Rider GPS / ETA performance",
  "Device / printer uptime",
  "Full staff attendance coverage",
  "Opening/closing checklist completion",
  "Accounting profitability",
  "Provider health",
  "Configurable Owner score weights",
  "AI scoring",
] as const;

function appendQuery(path: string, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const encoded = qs.toString();
  return encoded ? `${path}?${encoded}` : path;
}

function openKitchenStatuses(status: string): boolean {
  return ["queued", "accepted", "preparing", "ready"].includes(status.toLowerCase());
}

/**
 * Build a coverage-adjusted, explainable Branch Health Score.
 */
export function buildBranchHealthScore(input: BranchHealthSourceInput): BranchHealthScore {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAt = new Date(nowMs).toISOString();
  const components: BranchHealthComponent[] = [];
  const excluded: ExcludedComponent[] = [];
  const limitations: string[] = [
    "Score uses selected verified operational sources only — not a full readiness or profitability index.",
    `Deferred in this version: ${DEFERRED_DOMAINS.slice(0, 4).join("; ")}; and more.`,
  ];

  const opsHas = input.ops.data != null;
  const kitchenHas = input.kitchen.tickets != null;
  const deliveryHas = input.delivery.assignments != null;
  const opsFresh = mapOpFreshness(input.ops.state, opsHas);
  const kitchenFresh = mapOpFreshness(input.kitchen.state, kitchenHas);
  const deliveryFresh = mapOpFreshness(input.delivery.state, deliveryHas);
  const financeFresh = mapOpFreshness(
    input.finance.state,
    input.finance.enabled && !input.finance.unavailable && input.finance.unresolvedCashVariance != null,
  );

  // --- BH-KITCHEN-DELAY (25) ---
  {
    const weight = BRANCH_HEALTH_WEIGHTS["BH-KITCHEN-DELAY"];
    if (kitchenHas && input.kitchen.tickets) {
      const open = input.kitchen.tickets.filter((t) => openKitchenStatuses(String(t.status)));
      const delayed = open.filter(
        (ticket) =>
          elapsedMinutes(
            ticketTimerStartIso({
              startedAt: ticket.startedAt ?? null,
              acceptedAt: ticket.acceptedAt ?? null,
              createdAt: ticket.createdAt,
            }),
            nowMs,
          ) >= PREP_TARGET_MINUTES,
      );
      const denom = open.length;
      const rate = denom === 0 ? 0 : delayed.length / denom;
      const score = denom === 0 ? 100 : scoreFromDelayRate(rate);
      components.push({
        componentId: "BH-KITCHEN-DELAY",
        label: "Kitchen prep delays",
        domain: "kitchen",
        score,
        weight,
        weightedContribution: null,
        status: denom === 0 ? "EMPTY_HEALTHY" : kitchenFresh === "STALE" ? "STALE" : "EVALUATED",
        source: "Kitchen tickets API",
        trustState: "DERIVED",
        freshnessState: kitchenFresh,
        metricValue: `${delayed.length}/${denom} open tickets past ${PREP_TARGET_MINUTES}m`,
        rule: `delayed open tickets / open tickets; prep guide ${PREP_TARGET_MINUTES} minutes (operational, not contractual SLA)`,
        explanation:
          denom === 0
            ? "No open kitchen tickets in scope — component treated as clear."
            : `${delayed.length} of ${denom} open tickets past the ${PREP_TARGET_MINUTES}-minute prep guide.`,
        drillDown: {
          href: appendQuery("/admin/kitchen-dashboard", { view: "delayed" }),
          label: "Open delayed kitchen view",
        },
        limitation: `Prep guide is ${PREP_TARGET_MINUTES} minutes (same as kitchen board / Exception Center).`,
      });
    } else if (sourceFailed(input.kitchen.state, kitchenHas)) {
      excluded.push({
        componentId: "BH-KITCHEN-DELAY",
        label: "Kitchen prep delays",
        reason: "Kitchen tickets source unavailable — excluded from score (not treated as healthy or zero).",
      });
      components.push(unavailableComponent("BH-KITCHEN-DELAY", "Kitchen prep delays", "kitchen", weight, kitchenFresh));
    } else {
      excluded.push({
        componentId: "BH-KITCHEN-DELAY",
        label: "Kitchen prep delays",
        reason: "Kitchen tickets not loaded yet.",
      });
      components.push(unavailableComponent("BH-KITCHEN-DELAY", "Kitchen prep delays", "kitchen", weight, kitchenFresh));
    }
  }

  // --- BH-DELIVERY-LATE (20) ---
  {
    const weight = BRANCH_HEALTH_WEIGHTS["BH-DELIVERY-LATE"];
    if (deliveryHas && input.delivery.assignments) {
      const inFlight = input.delivery.assignments.filter((row) => {
        const st = String(row.status);
        return st === "assigned" || st === "picked-up";
      });
      let late = 0;
      let classifiable = 0;
      for (const row of inFlight) {
        const cls = classifyDeliveryLate({
          deliveryStatus: String(row.status),
          orderStatus: String(row.orderStatus ?? ""),
          assignedAt: row.assignedAt ?? null,
          pickedUpAt: row.pickedUpAt ?? null,
          nowMs,
          lateMinutes: DELIVERY_LATE_MINUTES,
        });
        if (cls === "UNAVAILABLE" || cls === "NOT_APPLICABLE") continue;
        classifiable += 1;
        if (cls === "LATE") late += 1;
      }
      const denom = classifiable;
      const rate = denom === 0 ? 0 : late / denom;
      const score = denom === 0 ? 100 : scoreFromDelayRate(rate);
      components.push({
        componentId: "BH-DELIVERY-LATE",
        label: "Delivery late rate",
        domain: "delivery",
        score,
        weight,
        weightedContribution: null,
        status: denom === 0 ? "EMPTY_HEALTHY" : deliveryFresh === "STALE" ? "STALE" : "EVALUATED",
        source: "Delivery assignments API",
        trustState: "PARTIAL_LIVE",
        freshnessState: deliveryFresh,
        metricValue: `${late}/${denom} in-flight deliveries past ${DELIVERY_LATE_MINUTES}m`,
        rule: `late assigned/picked-up / classifiable in-flight; late guide ${DELIVERY_LATE_MINUTES} minutes`,
        explanation:
          denom === 0
            ? "No classifiable in-flight deliveries — component treated as clear."
            : `${late} of ${denom} in-flight deliveries past the ${DELIVERY_LATE_MINUTES}-minute late guide.`,
        drillDown: {
          href: appendQuery("/admin/delivery", { status: "picked-up" }),
          label: "Open in-flight deliveries",
        },
        limitation: `Late guide is ${DELIVERY_LATE_MINUTES} minutes (same as delivery board). GPS/ETA not included.`,
      });
    } else if (sourceFailed(input.delivery.state, deliveryHas)) {
      excluded.push({
        componentId: "BH-DELIVERY-LATE",
        label: "Delivery late rate",
        reason: "Delivery assignments unavailable — excluded from score.",
      });
      components.push(unavailableComponent("BH-DELIVERY-LATE", "Delivery late rate", "delivery", weight, deliveryFresh));
    } else {
      excluded.push({
        componentId: "BH-DELIVERY-LATE",
        label: "Delivery late rate",
        reason: "Delivery assignments not loaded yet.",
      });
      components.push(unavailableComponent("BH-DELIVERY-LATE", "Delivery late rate", "delivery", weight, deliveryFresh));
    }
  }

  // --- BH-CONFIRM-DELAY (15) ---
  {
    const weight = BRANCH_HEALTH_WEIGHTS["BH-CONFIRM-DELAY"];
    if (opsHas && input.ops.data) {
      const pendingAlerts = input.ops.data.alerts.filter((a) => a.code === "PENDING_TOO_LONG");
      const pendingCount = Number(input.ops.data.statusCounts.pending ?? 0);
      const delayed = pendingAlerts.length;
      const denom = Math.max(pendingCount, delayed);
      const rate = denom === 0 ? 0 : delayed / denom;
      const score = denom === 0 ? 100 : scoreFromDelayRate(rate);
      components.push({
        componentId: "BH-CONFIRM-DELAY",
        label: "Order confirmation delays",
        domain: "orders",
        score,
        weight,
        weightedContribution: null,
        status: denom === 0 ? "EMPTY_HEALTHY" : opsFresh === "STALE" ? "STALE" : "EVALUATED",
        source: "Operations dashboard alerts (PENDING_TOO_LONG)",
        trustState: "DERIVED",
        freshnessState: opsFresh,
        metricValue: `${delayed}/${denom} pending past ${CONFIRMATION_PENDING_MINUTES}m`,
        rule: `PENDING_TOO_LONG alerts / pending orders; backend threshold ${CONFIRMATION_PENDING_MINUTES} minutes`,
        explanation:
          denom === 0
            ? "No pending orders in scope — confirmation delay clear."
            : `${delayed} of ${denom} pending orders past the ${CONFIRMATION_PENDING_MINUTES}-minute confirmation threshold.`,
        drillDown: {
          href: appendQuery("/admin/orders", { status: "pending" }),
          label: "Open pending orders",
        },
        limitation: "Uses ops alert count vs pending status count — not a separate SLA product.",
      });
    } else if (sourceFailed(input.ops.state, opsHas)) {
      excluded.push({
        componentId: "BH-CONFIRM-DELAY",
        label: "Order confirmation delays",
        reason: "Operations dashboard unavailable — excluded from score.",
      });
      components.push(unavailableComponent("BH-CONFIRM-DELAY", "Order confirmation delays", "orders", weight, opsFresh));
    } else {
      excluded.push({
        componentId: "BH-CONFIRM-DELAY",
        label: "Order confirmation delays",
        reason: "Operations dashboard not loaded yet.",
      });
      components.push(unavailableComponent("BH-CONFIRM-DELAY", "Order confirmation delays", "orders", weight, opsFresh));
    }
  }

  // --- BH-DISPATCH-WAIT (15) ---
  {
    const weight = BRANCH_HEALTH_WEIGHTS["BH-DISPATCH-WAIT"];
    if (deliveryHas && input.delivery.assignments) {
      const waiting = input.delivery.assignments.filter((row) =>
        isDispatchWaitingForRider({
          deliveryStatus: String(row.status),
          orderStatus: String(row.orderStatus ?? ""),
        }),
      );
      const readyCount = Number(input.ops.data?.statusCounts.ready ?? waiting.length);
      const denom = Math.max(readyCount, waiting.length);
      const rate = denom === 0 ? 0 : waiting.length / denom;
      const score = denom === 0 ? 100 : scoreFromDelayRate(rate);
      const freshness: BranchHealthFreshness =
        deliveryFresh === "STALE" || opsFresh === "STALE"
          ? "STALE"
          : deliveryFresh === "UNAVAILABLE"
            ? "PARTIAL"
            : deliveryFresh;
      components.push({
        componentId: "BH-DISPATCH-WAIT",
        label: "Ready awaiting rider",
        domain: "delivery",
        score,
        weight,
        weightedContribution: null,
        status: denom === 0 ? "EMPTY_HEALTHY" : freshness === "STALE" ? "STALE" : "EVALUATED",
        source: "Delivery assignments + ops ready count",
        trustState: "PARTIAL_LIVE",
        freshnessState: freshness,
        metricValue: `${waiting.length}/${denom} ready awaiting rider`,
        rule: "waiting-for-rider assignments / ready orders (dispatch queue pressure)",
        explanation:
          denom === 0
            ? "No ready orders awaiting dispatch — component treated as clear."
            : `${waiting.length} of ${denom} ready orders waiting for rider assignment.`,
        drillDown: {
          href: appendQuery("/admin/delivery", { status: "pending" }),
          label: "Open delivery dispatch queue",
        },
      });
    } else if (sourceFailed(input.delivery.state, deliveryHas)) {
      excluded.push({
        componentId: "BH-DISPATCH-WAIT",
        label: "Ready awaiting rider",
        reason: "Delivery assignments unavailable — excluded from score.",
      });
      components.push(unavailableComponent("BH-DISPATCH-WAIT", "Ready awaiting rider", "delivery", weight, deliveryFresh));
    } else {
      excluded.push({
        componentId: "BH-DISPATCH-WAIT",
        label: "Ready awaiting rider",
        reason: "Delivery assignments not loaded yet.",
      });
      components.push(unavailableComponent("BH-DISPATCH-WAIT", "Ready awaiting rider", "delivery", weight, deliveryFresh));
    }
  }

  // --- BH-CASH-VARIANCE (15) — permission-gated ---
  {
    const weight = BRANCH_HEALTH_WEIGHTS["BH-CASH-VARIANCE"];
    if (!input.finance.enabled) {
      excluded.push({
        componentId: "BH-CASH-VARIANCE",
        label: "Cash variance clear",
        reason: "Finance attention not authorized for this principal — omitted (not scored as failure).",
      });
      components.push({
        componentId: "BH-CASH-VARIANCE",
        label: "Cash variance clear",
        domain: "cash",
        score: null,
        weight,
        weightedContribution: null,
        status: "PERMISSION_RESTRICTED",
        source: "Finance attention API",
        trustState: "UNAVAILABLE",
        freshnessState: "UNAVAILABLE",
        metricValue: "Permission restricted",
        rule: "Unresolved cash variance count > 0 → score 0; else 100 (no currency thresholds)",
        explanation: "Cash variance component hidden — finance module not enabled for this session.",
        drillDown: { href: "/admin/finance", label: "Open finance" },
        limitation: "Permission-restricted components reduce coverage honestly.",
      });
    } else if (input.finance.unavailable || sourceFailed(input.finance.state, input.finance.unresolvedCashVariance != null)) {
      excluded.push({
        componentId: "BH-CASH-VARIANCE",
        label: "Cash variance clear",
        reason: "Finance attention source unavailable — excluded from score.",
      });
      components.push(unavailableComponent("BH-CASH-VARIANCE", "Cash variance clear", "cash", weight, financeFresh));
    } else if (input.finance.unresolvedCashVariance == null) {
      excluded.push({
        componentId: "BH-CASH-VARIANCE",
        label: "Cash variance clear",
        reason: "Finance variance count not loaded.",
      });
      components.push(unavailableComponent("BH-CASH-VARIANCE", "Cash variance clear", "cash", weight, financeFresh));
    } else {
      const variance = input.finance.unresolvedCashVariance;
      const score = scoreCashVarianceClear(variance);
      components.push({
        componentId: "BH-CASH-VARIANCE",
        label: "Cash variance clear",
        domain: "cash",
        score,
        weight,
        weightedContribution: null,
        status: financeFresh === "STALE" ? "STALE" : "EVALUATED",
        source: "Finance attention API",
        trustState: "PARTIAL_LIVE",
        freshnessState: financeFresh,
        metricValue: `${variance} unresolved variance close${variance === 1 ? "" : "s"}`,
        rule: "Binary clear: unresolvedCashVariance === 0 → 100; else 0 (no invented PKR thresholds)",
        explanation:
          variance === 0
            ? "No unresolved cash variance closes."
            : `${variance} cash close${variance === 1 ? "" : "s"} still have unresolved variance.`,
        drillDown: {
          href: "/admin/finance",
          label: "Open finance cash closes",
        },
        limitation: "Finance page has no variance-only URL filter yet.",
      });
    }
  }

  // --- BH-STOCK-PRESSURE (10) ---
  {
    const weight = BRANCH_HEALTH_WEIGHTS["BH-STOCK-PRESSURE"];
    if (opsHas && input.ops.data) {
      const low = input.ops.data.kpis.lowStockCount ?? 0;
      const score = scoreStockPressure(low);
      components.push({
        componentId: "BH-STOCK-PRESSURE",
        label: "Stock pressure",
        domain: "inventory",
        score,
        weight,
        weightedContribution: null,
        status: opsFresh === "STALE" ? "STALE" : "EVALUATED",
        source: "Operations dashboard inventory KPI (lowStockCount)",
        trustState: "PARTIAL_LIVE",
        freshnessState: opsFresh,
        metricValue: `${low} low-stock item${low === 1 ? "" : "s"}`,
        rule: "Count bands aligned to Exception Center: 0→100, 1–9→50, ≥10→0 (no SKU denominator yet)",
        explanation:
          low === 0
            ? "No items at or below minimum stock."
            : `${low} inventory item${low === 1 ? "" : "s"} at or below minimum stock.`,
        drillDown: {
          href: appendQuery("/admin/inventory", { lowStock: "1" }),
          label: "Open low-stock inventory",
        },
        limitation: "Tracked-SKU denominator not available on ops KPI — count bands used instead of a rate.",
      });
    } else if (sourceFailed(input.ops.state, opsHas)) {
      excluded.push({
        componentId: "BH-STOCK-PRESSURE",
        label: "Stock pressure",
        reason: "Operations dashboard unavailable — excluded from score.",
      });
      components.push(unavailableComponent("BH-STOCK-PRESSURE", "Stock pressure", "inventory", weight, opsFresh));
    } else {
      excluded.push({
        componentId: "BH-STOCK-PRESSURE",
        label: "Stock pressure",
        reason: "Operations dashboard not loaded yet.",
      });
      components.push(unavailableComponent("BH-STOCK-PRESSURE", "Stock pressure", "inventory", weight, opsFresh));
    }
  }

  const evaluated = components.filter((c) => c.score != null);
  const evaluatedWeight = evaluated.reduce((sum, c) => sum + c.weight, 0);
  // Permission-restricted weight is removed from configured denominator so it does not look like failure.
  const restrictedWeight = components
    .filter((c) => c.status === "PERMISSION_RESTRICTED")
    .reduce((sum, c) => sum + c.weight, 0);
  const configuredWeight = BRANCH_HEALTH_TOTAL_WEIGHT - restrictedWeight;
  const coveragePercent = computeCoveragePercent(evaluatedWeight, configuredWeight);
  const overall = computeWeightedScore(
    evaluated.map((c) => ({ score: c.score as number, weight: c.weight })),
  );

  for (const c of components) {
    if (c.score != null && evaluatedWeight > 0) {
      c.weightedContribution = Math.round(((c.score * c.weight) / evaluatedWeight) * 10) / 10;
    }
  }

  const scoreState = mapScoreState(
    coveragePercent < MIN_COVERAGE_PERCENT ? null : overall,
    coveragePercent,
  );
  const displayScore = scoreState === "INSUFFICIENT_DATA" ? null : overall;

  if (coveragePercent < MIN_COVERAGE_PERCENT) {
    limitations.push(
      `Coverage ${coveragePercent}% is below the ${MIN_COVERAGE_PERCENT}% minimum — numeric score withheld (INSUFFICIENT_DATA).`,
    );
  }

  const staleCount = evaluated.filter((c) => c.freshnessState === "STALE" || c.status === "STALE").length;
  const confidence = computeConfidence({
    coveragePercent,
    staleCount,
    evaluatedCount: evaluated.length,
  });

  const freshnessState = mergeFreshness(components.map((c) => c.freshnessState));

  const rankedNeg = [...evaluated]
    .filter((c) => (c.score ?? 100) < 100)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.componentId.localeCompare(b.componentId));
  const rankedPos = [...evaluated]
    .filter((c) => (c.score ?? 0) >= 85)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.componentId.localeCompare(b.componentId));

  const comparableForRanking = false;
  const comparisonNote =
    "Peer branch ranking is deferred: this slice scores the current Owner branch scope only. " +
    "Branches with different coverage must not be league-ranked. Aggregate all-branches scope is not a peer comparison.";

  if (!input.branchId) {
    limitations.push(
      "Current scope is all authorized branches (aggregate). Treat as a single scope score — not a league table.",
    );
  }

  return {
    branchId: input.branchId,
    branchName: input.branchName,
    score: displayScore,
    scoreState,
    statusLabel: statusLabelFor(scoreState),
    confidence,
    coveragePercent,
    evaluatedAt,
    businessWindow: input.ops.data?.timezone
      ? `${input.ops.data.timezone} live operational window`
      : "Asia/Karachi live operational window",
    components,
    excludedComponents: excluded,
    freshnessState,
    limitations,
    topNegativeContributors: rankedNeg.slice(0, 3),
    topPositiveContributors: rankedPos.slice(0, 3),
    comparableForRanking,
    comparisonNote,
    actionMaturity: "DRILL_DOWN",
  };
}

function unavailableComponent(
  componentId: BranchHealthComponent["componentId"],
  label: string,
  domain: BranchHealthComponent["domain"],
  weight: number,
  freshness: BranchHealthFreshness,
): BranchHealthComponent {
  return {
    componentId,
    label,
    domain,
    score: null,
    weight,
    weightedContribution: null,
    status: "UNAVAILABLE",
    source: label,
    trustState: "UNAVAILABLE",
    freshnessState: freshness === "UNAVAILABLE" ? "UNAVAILABLE" : freshness,
    metricValue: "Unavailable",
    rule: "Excluded from weighted mean; reduces coverage",
    explanation: "Source unavailable — not treated as healthy or as a zero score.",
    drillDown: { href: "/admin/dashboard", label: "Return to dashboard" },
    limitation: "Failed sources never produce a perfect or zero component score by assumption.",
  };
}

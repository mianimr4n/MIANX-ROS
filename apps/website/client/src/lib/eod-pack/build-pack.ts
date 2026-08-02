/**
 * Build read-only EOD Pack preview from already-fetched Owner Command Center sources.
 * Never finalizes, posts, emails, or mutates.
 */

import { formatPkr } from "@/lib/admin-finance";
import { isDispatchWaitingForRider } from "@/lib/operational-truth";
import {
  DEFERRED_EOD_DOMAINS,
  EOD_COVERAGE_SECTION_IDS,
  MIN_EOD_COVERAGE_PERCENT,
  confidenceFrom,
  coveragePercent,
  mapFreshness,
  mapPackState,
  resolveBusinessDate,
  severityRank,
  sourceFailed,
} from "./formula";
import type {
  EodMetric,
  EodPack,
  EodPackBuildInput,
  EodSection,
  EodUnresolvedItem,
} from "./types";

const OPEN_KITCHEN = new Set(["queued", "accepted", "preparing", "ready"]);
const ACTIVE_DELIVERY = new Set(["pending", "assigned", "picked-up"]);

function money(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return formatPkr(n);
}

function count(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return String(n);
}

export function buildEodPack(input: EodPackBuildInput): EodPack {
  const nowMs = input.nowMs ?? Date.now();
  const generatedAt = new Date(nowMs).toISOString();
  const timezone = input.timezone || input.ops.data?.timezone || "Asia/Karachi";
  const businessDate = resolveBusinessDate({
    dayStart: input.ops.data?.dayStart,
    nowMs,
    timezone,
  });
  const businessWindow = `${timezone} business day ${businessDate}`;
  const packId = `eod-preview-${input.branchId ?? "aggregate"}-${businessDate}-${nowMs}`;

  const sections: EodSection[] = [];
  const unresolved: EodUnresolvedItem[] = [];

  // --- pack-identity (meta, not coverage) ---
  sections.push({
    sectionId: "pack-identity",
    title: "Pack Identity",
    trustState: "DERIVED",
    freshnessState: "FRESH",
    coverage: "full",
    metrics: [
      {
        metricId: "EOD-BRANCH",
        label: "Branch",
        value: input.branchName,
        rawValue: input.branchName,
        unit: "text",
        maturity: "Operational Estimate",
        source: "AdminBranchContext",
        businessWindow,
      },
      {
        metricId: "EOD-BUSINESS-DATE",
        label: "Business date",
        value: businessDate,
        rawValue: businessDate,
        unit: "text",
        maturity: "Operational Estimate",
        source: "Operations dayStart / branch timezone",
        businessWindow,
        limitation: "Generation time is distinct from business-period end — not a closed day.",
      },
      {
        metricId: "EOD-GENERATED-AT",
        label: "Generated at",
        value: generatedAt,
        rawValue: generatedAt,
        unit: "text",
        maturity: "Operational Estimate",
        source: "Client preview clock",
        businessWindow,
      },
    ],
    unresolvedItems: [],
    sourceDetails: ["In-memory Owner Command Center preview — no persistence"],
    drillDowns: [{ href: "/admin/dashboard", label: "Return to Owner dashboard" }],
    limitations: [
      "EOD Pack preview only — not FINAL, POSTED, CLOSED, or APPROVED.",
      "Operational data may still change.",
    ],
    countsTowardCoverage: false,
    evaluated: true,
  });

  // --- sales-orders ---
  {
    const opsHas = input.ops.data != null;
    const failed = sourceFailed(input.ops.state, opsHas);
    const fresh = mapFreshness(input.ops.state, opsHas);
    if (failed || !opsHas) {
      sections.push({
        sectionId: "sales-orders",
        title: "Sales and Orders",
        trustState: "UNAVAILABLE",
        freshnessState: fresh,
        coverage: "unavailable",
        metrics: [],
        unresolvedItems: [],
        sourceDetails: ["Operations dashboard"],
        drillDowns: [{ href: "/admin/orders", label: "Open orders" }],
        limitations: ["Sales source unavailable — not replaced with zeros."],
        countsTowardCoverage: true,
        evaluated: false,
      });
    } else {
      const k = input.ops.data!.kpis;
      const sc = input.ops.data!.statusCounts;
      const open =
        (sc.pending ?? 0) +
        (sc.confirmed ?? 0) +
        (sc.preparing ?? 0) +
        (sc.ready ?? 0) +
        (sc["out-for-delivery"] ?? 0);
      const metrics: EodMetric[] = [
        metric("EOD-GROSS-SALES", "Gross Sales (Operational Estimate)", money(k.todayGrossSales), k.todayGrossSales, "PKR", "Operational Estimate", "todayGrossSales", businessWindow, "/admin/orders", "View orders for Operational Gross Sales"),
        metric("EOD-ORDERS", "Orders (Operational)", count(k.todayOrders), k.todayOrders, "count", "Operational Estimate", "todayOrders", businessWindow, "/admin/orders", "View today’s orders"),
        metric("EOD-AOV", "Average Order Value", money(k.averageOrderValue), k.averageOrderValue, "PKR", "Operational Estimate", "averageOrderValue", businessWindow, "/admin/reports", "Open sales reports"),
        metric("EOD-COMPLETED", "Completed orders", count(sc.completed ?? 0), sc.completed ?? 0, "count", "Operational Estimate", "statusCounts.completed", businessWindow, "/admin/orders?status=completed", "View completed orders"),
        metric("EOD-OPEN", "Open pipeline orders", count(open), open, "count", "Derived", "statusCounts open statuses", businessWindow, "/admin/orders", "View open orders"),
        metric("EOD-CANCELLED", "Cancelled orders", count(sc.cancelled ?? 0), sc.cancelled ?? 0, "count", "Operational Estimate", "statusCounts.cancelled", businessWindow, "/admin/orders?status=cancelled", "View cancelled orders"),
      ];
      if (open > 0) {
        unresolved.push({
          type: "EOD-OPEN-ORDERS",
          domain: "orders",
          severity: open >= 10 ? "CRITICAL" : "WARNING",
          count: open,
          branchId: input.branchId,
          branchName: input.branchName,
          oldestAt: null,
          source: "Operations statusCounts",
          trustState: "DERIVED",
          drillDown: { href: "/admin/orders", label: "Review open orders before close" },
        });
      }
      sections.push({
        sectionId: "sales-orders",
        title: "Sales and Orders",
        trustState: "ESTIMATED",
        freshnessState: fresh,
        coverage: "full",
        metrics,
        unresolvedItems: unresolved.filter((u) => u.type === "EOD-OPEN-ORDERS"),
        sourceDetails: ["Operations dashboard KPIs + statusCounts"],
        drillDowns: [
          { href: "/admin/orders", label: "Open orders" },
          { href: "/admin/reports", label: "Open reports" },
        ],
        limitations: ["Operational Estimate — not Accounting Posted revenue."],
        countsTowardCoverage: true,
        evaluated: true,
      });
    }
  }

  // --- kitchen ---
  {
    const has = input.kitchen.tickets != null;
    const failed = sourceFailed(input.kitchen.state, has);
    const fresh = mapFreshness(input.kitchen.state, has);
    if (failed || !has) {
      sections.push(unavailableSection("kitchen", "Kitchen", fresh, "/admin/kitchen-dashboard", "Open kitchen dashboard"));
    } else {
      const open = input.kitchen.tickets!.filter((t) => OPEN_KITCHEN.has(String(t.status).toLowerCase()));
      const metrics = [
        metric("EOD-KITCHEN-OPEN", "Open kitchen tickets", count(open.length), open.length, "count", "Operational Estimate", "Kitchen tickets API", businessWindow, "/admin/kitchen-dashboard", "Open kitchen dashboard"),
      ];
      if (open.length > 0) {
        unresolved.push({
          type: "EOD-KITCHEN-OPEN",
          domain: "kitchen",
          severity: open.length >= 5 ? "CRITICAL" : "WARNING",
          count: open.length,
          branchId: input.branchId,
          branchName: input.branchName,
          oldestAt: null,
          source: "Kitchen tickets",
          trustState: "LIVE",
          drillDown: { href: "/admin/kitchen-dashboard", label: "Review open kitchen tickets" },
        });
      }
      // Delayed tickets reflected via exception center EXC-KDS-DELAY — avoid double-count detail.
      sections.push({
        sectionId: "kitchen",
        title: "Kitchen",
        trustState: "LIVE",
        freshnessState: fresh,
        coverage: "full",
        metrics,
        unresolvedItems: unresolved.filter((u) => u.type === "EOD-KITCHEN-OPEN"),
        sourceDetails: ["Kitchen tickets list"],
        drillDowns: [
          { href: "/admin/kitchen-dashboard", label: "Open kitchen dashboard" },
          { href: "/admin/kitchen-dashboard?view=delayed", label: "Open delayed kitchen view" },
        ],
        limitations: ["Prep delay detail also appears in Exception Center when past the prep guide."],
        countsTowardCoverage: true,
        evaluated: true,
      });
    }
  }

  // --- delivery ---
  {
    const has = input.delivery.assignments != null;
    const failed = sourceFailed(input.delivery.state, has);
    const fresh = mapFreshness(input.delivery.state, has);
    if (failed || !has) {
      sections.push(unavailableSection("delivery", "Delivery", fresh, "/admin/delivery", "Open delivery"));
    } else {
      const active = input.delivery.assignments!.filter((a) => ACTIVE_DELIVERY.has(String(a.status)));
      const waiting = input.delivery.assignments!.filter((a) =>
        isDispatchWaitingForRider({
          deliveryStatus: String(a.status),
          orderStatus: String(a.orderStatus ?? ""),
        }),
      );
      const metrics = [
        metric("EOD-DEL-ACTIVE", "Active deliveries", count(active.length), active.length, "count", "Operational Estimate", "Delivery assignments", businessWindow, "/admin/delivery", "Open delivery board"),
        metric("EOD-DEL-WAITING", "Ready awaiting rider", count(waiting.length), waiting.length, "count", "Operational Estimate", "isDispatchWaitingForRider", businessWindow, "/admin/delivery?status=pending", "Open dispatch queue"),
      ];
      if (waiting.length > 0) {
        unresolved.push({
          type: "EOD-DEL-WAITING",
          domain: "delivery",
          severity: waiting.length >= 5 ? "CRITICAL" : "WARNING",
          count: waiting.length,
          branchId: input.branchId,
          branchName: input.branchName,
          oldestAt: null,
          source: "Delivery assignments",
          trustState: "DERIVED",
          drillDown: { href: "/admin/delivery?status=pending", label: "Review ready awaiting rider" },
        });
      }

      sections.push({
        sectionId: "delivery",
        title: "Delivery",
        trustState: "LIVE",
        freshnessState: fresh,
        coverage: "full",
        metrics,
        unresolvedItems: unresolved.filter((u) => u.type === "EOD-DEL-WAITING"),
        sourceDetails: ["Delivery assignments API"],
        drillDowns: [{ href: "/admin/delivery", label: "Open delivery" }],
        limitations: ["GPS/ETA and COD settlement are deferred."],
        countsTowardCoverage: true,
        evaluated: true,
      });
    }
  }

  // --- cash-finance ---
  {
    if (!input.financeEnabled) {
      sections.push({
        sectionId: "cash-finance",
        title: "Cash and Finance",
        trustState: "UNAVAILABLE",
        freshnessState: "UNAVAILABLE",
        coverage: "restricted",
        metrics: [],
        unresolvedItems: [],
        sourceDetails: ["Finance module permission-gated"],
        drillDowns: [{ href: "/admin/finance", label: "Open finance (if authorized)" }],
        limitations: ["Permission-restricted — omitted from coverage denominator."],
        permissionRestricted: true,
        countsTowardCoverage: true,
        evaluated: false,
      });
    } else if (input.financeAttention?.unavailable) {
      sections.push(unavailableSection("cash-finance", "Cash and Finance", "UNAVAILABLE", "/admin/finance", "Open finance"));
    } else {
      const fa = input.financeAttention;
      const metrics: EodMetric[] = [
        metric(
          "EOD-CASH-VAR",
          "Unresolved cash variance",
          count(fa?.unresolvedCashVariance ?? 0),
          fa?.unresolvedCashVariance ?? 0,
          "count",
          "Operational Estimate",
          "Finance attention",
          businessWindow,
          "/admin/finance",
          "Open finance cash closes",
        ),
        metric(
          "EOD-CASH-CLOSE",
          "Cash closes awaiting approval",
          count(fa?.cashClosesAwaitingApproval ?? 0),
          fa?.cashClosesAwaitingApproval ?? 0,
          "count",
          "Operational Estimate",
          "Finance attention",
          businessWindow,
          "/admin/finance",
          "Open cash closes awaiting approval",
        ),
        metric(
          "EOD-ACC-STATE",
          "Accounting Posted lane state",
          input.profitability.accountingState,
          input.profitability.accountingState,
          "text",
          "Accounting Posted",
          "Profitability Truth / finance_profit_loss",
          input.profitability.accountingPeriod ?? businessWindow,
          "/admin/finance",
          "Open posted accounting summary",
          "Accounting figures are not finalized unless explicitly marked posted.",
        ),
      ];
      if ((fa?.unresolvedCashVariance ?? 0) > 0) {
        unresolved.push({
          type: "EOD-CASH-VAR",
          domain: "cash",
          severity: (fa?.unresolvedCashVariance ?? 0) >= 3 ? "CRITICAL" : "WARNING",
          count: fa!.unresolvedCashVariance!,
          branchId: input.branchId,
          branchName: input.branchName,
          oldestAt: null,
          source: "Finance attention",
          trustState: "DERIVED",
          drillDown: { href: "/admin/finance", label: "Review cash variance" },
        });
      }
      sections.push({
        sectionId: "cash-finance",
        title: "Cash and Finance",
        trustState: "DERIVED",
        freshnessState: "FRESH",
        coverage: "partial",
        metrics,
        unresolvedItems: unresolved.filter((u) => u.type === "EOD-CASH-VAR"),
        sourceDetails: [
          "Finance attention counts",
          `Accounting Posted state: ${input.profitability.accountingState}`,
          `Operational Estimate coverage: ${input.profitability.operationalCoverage}%`,
        ],
        drillDowns: [{ href: "/admin/finance", label: "Open finance" }],
        limitations: [
          "Accounting Posted remains separate from Operational Estimate.",
          "Z-report / register closure deferred — not executed from this pack.",
        ],
        countsTowardCoverage: true,
        evaluated: true,
      });
    }
  }

  // --- stock ---
  {
    const opsHas = input.ops.data != null;
    const failed = sourceFailed(input.ops.state, opsHas);
    const fresh = mapFreshness(input.ops.state, opsHas);
    if (failed || !opsHas) {
      sections.push(unavailableSection("stock", "Stock", fresh, "/admin/inventory?lowStock=1", "Open low-stock inventory"));
    } else {
      const low = input.ops.data!.kpis.lowStockCount ?? 0;
      if (low > 0) {
        unresolved.push({
          type: "EOD-STOCK-LOW",
          domain: "inventory",
          severity: low >= 10 ? "CRITICAL" : "WARNING",
          count: low,
          branchId: input.branchId,
          branchName: input.branchName,
          oldestAt: null,
          source: "Operations lowStockCount",
          trustState: "DERIVED",
          drillDown: { href: "/admin/inventory?lowStock=1", label: "Review low-stock items" },
        });
      }
      sections.push({
        sectionId: "stock",
        title: "Stock",
        trustState: "DERIVED",
        freshnessState: fresh,
        coverage: "full",
        metrics: [
          metric("EOD-LOW-STOCK", "Low-stock items", count(low), low, "count", "Operational Estimate", "lowStockCount", businessWindow, "/admin/inventory?lowStock=1", "Open low-stock inventory"),
        ],
        unresolvedItems: unresolved.filter((u) => u.type === "EOD-STOCK-LOW"),
        sourceDetails: ["Operations dashboard inventory KPI"],
        drillDowns: [{ href: "/admin/inventory?lowStock=1", label: "Open low-stock inventory" }],
        limitations: ["Waste totals and unposted adjustments deferred."],
        countsTowardCoverage: true,
        evaluated: true,
      });
    }
  }

  // --- exceptions-approvals ---
  {
    const exc = input.exceptionCenter;
    const apr = input.approvalInbox;
    const evaluated = !exc.totalFailure;
    for (const e of exc.exceptions) {
      unresolved.push({
        type: e.type,
        domain: e.domain,
        severity: e.severity,
        count: e.count,
        branchId: input.branchId,
        branchName: input.branchName,
        oldestAt: e.oldestAt,
        source: e.source,
        trustState: "DERIVED",
        drillDown: e.drillDown,
        limitation: e.limitation,
      });
    }
    for (const a of apr.items) {
      unresolved.push({
        type: a.approvalType,
        domain: a.domain,
        severity: a.priority === "URGENT" ? "CRITICAL" : a.priority === "HIGH" ? "WARNING" : "INFORMATION",
        count: a.count,
        branchId: input.branchId,
        branchName: input.branchName,
        oldestAt: null,
        source: a.source,
        trustState: "DERIVED",
        drillDown: { href: a.destinationHref, label: a.destinationLabel },
      });
    }
    sections.push({
      sectionId: "exceptions-approvals",
      title: "Exceptions and Approvals",
      trustState: "DERIVED",
      freshnessState: exc.totalFailure ? "UNAVAILABLE" : "FRESH",
      coverage: exc.totalFailure ? "unavailable" : exc.partialFailure ? "partial" : "full",
      metrics: [
        metric("EOD-EXC-COUNT", "Exception cards", count(exc.exceptions.length), exc.exceptions.length, "count", "Derived", "Exception Center", businessWindow, "/admin/dashboard", "Review Exception Center"),
        metric("EOD-APR-COUNT", "Pending approvals", count(apr.totalPendingCount), apr.totalPendingCount, "count", "Derived", "Approval Inbox", businessWindow, "/admin/dashboard", "Review Approval Inbox"),
        metric("EOD-APR-URGENT", "Urgent approvals", count(apr.urgentCount), apr.urgentCount, "count", "Derived", "Approval Inbox", businessWindow, "/admin/finance", "Review urgent finance approvals"),
      ],
      unresolvedItems: [],
      sourceDetails: ["DASH-01 Exception Center", "DASH-04 Approval Inbox", apr.deferredDomainsNote],
      drillDowns: [],
      limitations: [
        "Resolution is not available inside the EOD Pack — drill down to destination workflows.",
        ...(exc.unavailableSources.length ? [`Unavailable exception sources: ${exc.unavailableSources.join(", ")}`] : []),
      ],
      countsTowardCoverage: true,
      evaluated,
    });
  }

  // --- branch-health ---
  {
    const bh = input.branchHealth;
    const evaluated = bh.scoreState !== "INSUFFICIENT_DATA" || bh.coveragePercent > 0;
    sections.push({
      sectionId: "branch-health",
      title: "Branch Health",
      trustState: "DERIVED",
      freshnessState: (bh.freshnessState as EodSection["freshnessState"]) || "FRESH",
      coverage: bh.score == null ? "partial" : "full",
      metrics: [
        metric("EOD-BH-SCORE", "Branch Health Score", bh.score == null ? "—" : String(bh.score), bh.score, "count", "Derived", "DASH-05 Branch Health", businessWindow, "/admin/dashboard", "Review Branch Health breakdown"),
        metric("EOD-BH-STATUS", "Health status", bh.statusLabel, bh.statusLabel, "text", "Derived", "DASH-05", businessWindow),
        metric("EOD-BH-COVERAGE", "Health source coverage", `${bh.coveragePercent}%`, bh.coveragePercent, "percent", "Derived", "DASH-05", businessWindow),
      ],
      unresolvedItems: [],
      sourceDetails: [`Confidence ${bh.confidence}`, `State ${bh.scoreState}`],
      drillDowns: [],
      limitations: ["Score is explainable and coverage-adjusted — not a close-readiness certificate."],
      countsTowardCoverage: true,
      evaluated: evaluated && bh.coveragePercent >= MIN_EOD_COVERAGE_PERCENT,
    });
  }

  // Deduplicate unresolved by type+domain, keep highest severity / sum counts carefully — for exceptions we may double with kitchen. Prefer unique types.
  const unresolvedDedup = dedupeUnresolved(unresolved);
  unresolvedDedup.sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    return a.type.localeCompare(b.type);
  });

  // --- closing-gaps (meta) ---
  sections.push({
    sectionId: "closing-gaps",
    title: "Closing Gaps",
    trustState: "DERIVED",
    freshnessState: "FRESH",
    coverage: "partial",
    metrics: [
      metric("EOD-UNRESOLVED", "Unresolved item types", count(unresolvedDedup.length), unresolvedDedup.length, "count", "Derived", "EOD unresolved aggregation", businessWindow),
    ],
    unresolvedItems: unresolvedDedup,
    sourceDetails: ["Aggregated from exceptions, approvals, and live ops queues"],
    drillDowns: [],
    limitations: [
      "REVIEWABLE does not mean the restaurant is ready to close.",
      "Missing closing domains: " + DEFERRED_EOD_DOMAINS.slice(0, 5).join("; ") + "; and more.",
    ],
    countsTowardCoverage: false,
    evaluated: true,
  });

  // Coverage
  const coverageSections = sections.filter((s) => s.countsTowardCoverage);
  const restrictedWeight = coverageSections.filter((s) => s.permissionRestricted).length;
  const eligible = coverageSections.length - restrictedWeight;
  const evaluatedCount = coverageSections.filter((s) => s.evaluated && !s.permissionRestricted).length;
  const sourceCoveragePercent = coveragePercent(evaluatedCount, eligible);
  const stale = sections.some((s) => s.freshnessState === "STALE" && s.evaluated);
  const state = mapPackState(sourceCoveragePercent, evaluatedCount > 0);
  const confidence = confidenceFrom(sourceCoveragePercent, stale);

  // --- source-coverage ---
  sections.push({
    sectionId: "source-coverage",
    title: "Source Coverage and Limitations",
    trustState: "DERIVED",
    freshnessState: "FRESH",
    coverage: "full",
    metrics: [
      metric("EOD-COVERAGE", "Source coverage", `${sourceCoveragePercent}%`, sourceCoveragePercent, "percent", "Derived", "EOD configured sections", businessWindow),
      metric("EOD-STATE", "Pack state", state, state, "text", "Derived", "EOD state model", businessWindow, undefined, undefined, "REVIEWABLE means supported sources loaded — not closed or final."),
      metric("EOD-CONFIDENCE", "Confidence", confidence, confidence, "text", "Derived", "EOD confidence rules", businessWindow),
    ],
    unresolvedItems: [],
    sourceDetails: [
      `Configured coverage sections: ${EOD_COVERAGE_SECTION_IDS.join(", ")}`,
      `Evaluated ${evaluatedCount} / eligible ${eligible}`,
      `Min coverage ${MIN_EOD_COVERAGE_PERCENT}%`,
    ],
    drillDowns: [],
    limitations: [...DEFERRED_EOD_DOMAINS],
    countsTowardCoverage: false,
    evaluated: true,
  });

  const freshnessState = mergePackFreshness(sections);

  return {
    packId,
    organizationId: null,
    branchId: input.branchId,
    branchName: input.branchName,
    businessDate,
    timezone,
    generatedAt,
    generatedByContext: "Owner Command Center preview",
    state,
    confidence,
    sourceCoveragePercent,
    freshnessState,
    sections,
    unresolvedItems: unresolvedDedup,
    excludedDomains: [...DEFERRED_EOD_DOMAINS],
    limitations: [
      "EOD Pack preview — Operational data may still change.",
      "Accounting figures are not finalized unless explicitly marked posted.",
      "REVIEWABLE does not mean day closed, accounting complete, or all operations resolved.",
      "No finalize, email, WhatsApp, register close, or journal posting from this pack.",
      "What Changed / operational timeline (DASH-08) does not mark this pack final; browser-local review state does not alter EOD coverage; exports omit event detail.",
      !input.branchId
        ? "All-branches aggregate preview may mix scopes — prefer a selected branch for closing review."
        : "",
    ].filter(Boolean),
    exportCapabilities: {
      printFriendly: true,
      csv: true,
      json: true,
      pdf: false,
      xlsx: false,
      email: false,
      whatsapp: false,
    },
    actionMaturity: "DRILL_DOWN",
    previewLabel: "EOD Pack preview",
  };
}

function metric(
  metricId: string,
  label: string,
  value: string | null,
  rawValue: number | string | null,
  unit: EodMetric["unit"],
  maturity: string,
  source: string,
  businessWindow: string,
  href?: string,
  drillLabel?: string,
  limitation?: string,
): EodMetric {
  return {
    metricId,
    label,
    value,
    rawValue,
    unit,
    maturity,
    source,
    businessWindow,
    limitation,
    drillDown: href && drillLabel ? { href, label: drillLabel } : undefined,
  };
}

function unavailableSection(
  sectionId: EodSection["sectionId"],
  title: string,
  fresh: EodSection["freshnessState"],
  href: string,
  label: string,
): EodSection {
  return {
    sectionId,
    title,
    trustState: "UNAVAILABLE",
    freshnessState: fresh,
    coverage: "unavailable",
    metrics: [],
    unresolvedItems: [],
    sourceDetails: [title],
    drillDowns: [{ href, label }],
    limitations: [`${title} source unavailable — not shown as zero.`],
    countsTowardCoverage: true,
    evaluated: false,
  };
}

function dedupeUnresolved(items: EodUnresolvedItem[]): EodUnresolvedItem[] {
  const map = new Map<string, EodUnresolvedItem>();
  for (const item of items) {
    const key = `${item.type}:${item.domain}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, item);
      continue;
    }
    if (severityRank(item.severity) < severityRank(prev.severity)) {
      map.set(key, { ...item, count: Math.max(item.count, prev.count) });
    } else {
      map.set(key, { ...prev, count: Math.max(item.count, prev.count) });
    }
  }
  return Array.from(map.values());
}

function mergePackFreshness(sections: EodSection[]): EodPack["freshnessState"] {
  const states = sections.filter((s) => s.evaluated).map((s) => s.freshnessState);
  if (states.length === 0) return "UNAVAILABLE";
  if (states.every((s) => s === "UNAVAILABLE")) return "UNAVAILABLE";
  if (states.some((s) => s === "UNAVAILABLE")) return "PARTIAL";
  if (states.some((s) => s === "STALE")) return "STALE";
  if (states.every((s) => s === "LIVE")) return "LIVE";
  return "FRESH";
}

/**
 * Derived What Changed comparisons — same formula, branch, and window required.
 */

import type {
  DerivedChange,
  SafeMetricId,
  SafeMetricSnapshot,
  WhatChangedTrustState,
} from "./types";

export const METRIC_META: Record<
  SafeMetricId,
  {
    label: string;
    href: string;
    source: string;
    /** When count rises, is that attention-worthy (ops pressure)? */
    riseIsAttention: boolean;
  }
> = {
  grossSales: {
    label: "Gross sales",
    href: "/admin/orders",
    source: "Operations dashboard KPIs",
    riseIsAttention: false,
  },
  orderCount: {
    label: "Orders",
    href: "/admin/orders",
    source: "Operations dashboard KPIs",
    riseIsAttention: false,
  },
  openOrders: {
    label: "Open orders",
    href: "/admin/orders",
    source: "Operations dashboard KPIs",
    riseIsAttention: true,
  },
  lowStockCount: {
    label: "Low-stock alerts",
    href: "/admin/inventory",
    source: "Operations dashboard KPIs",
    riseIsAttention: true,
  },
  delayedKitchenCount: {
    label: "Kitchen delays",
    href: "/admin/kitchen-dashboard",
    source: "Kitchen ticket list",
    riseIsAttention: true,
  },
  pendingApprovals: {
    label: "Pending approvals",
    href: "/admin/purchasing",
    source: "Approval Inbox counts",
    riseIsAttention: true,
  },
  criticalExceptions: {
    label: "Critical exceptions",
    href: "/admin/orders",
    source: "Exception Center",
    riseIsAttention: true,
  },
  warningExceptions: {
    label: "Warning exceptions",
    href: "/admin/orders",
    source: "Exception Center",
    riseIsAttention: true,
  },
  branchHealthScore: {
    label: "Branch health score",
    href: "/admin/reports",
    source: "Branch Health Score",
    riseIsAttention: false,
  },
  activeDeliveries: {
    label: "Active deliveries",
    href: "/admin/delivery",
    source: "Delivery assignment list",
    riseIsAttention: true,
  },
};

export function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function toneFor(
  metricId: SafeMetricId,
  direction: DerivedChange["direction"],
): DerivedChange["tone"] {
  if (direction === "unavailable" || direction === "flat") return "neutral";
  const meta = METRIC_META[metricId];
  if (metricId === "branchHealthScore" || metricId === "grossSales" || metricId === "orderCount") {
    if (direction === "up") return "positive";
    if (direction === "down") return metricId === "branchHealthScore" ? "attention" : "neutral";
  }
  if (meta.riseIsAttention) {
    return direction === "up" ? "attention" : "positive";
  }
  return "neutral";
}

export function compareSnapshots(input: {
  previous: SafeMetricSnapshot | null;
  current: SafeMetricSnapshot;
  comparisonEnd: string;
  branchMatchRequired?: boolean;
}): DerivedChange[] {
  const { previous, current, comparisonEnd } = input;
  if (!previous) return [];

  if (
    input.branchMatchRequired !== false &&
    previous.branchId !== current.branchId
  ) {
    return [];
  }

  if (previous.businessWindow !== current.businessWindow) {
    return [];
  }

  const changes: DerivedChange[] = [];
  const metricIds = Object.keys(METRIC_META) as SafeMetricId[];

  for (const metricId of metricIds) {
    const prevRaw = previous.metrics[metricId];
    const currRaw = current.metrics[metricId];
    const meta = METRIC_META[metricId];

    if (prevRaw == null || currRaw == null || Number.isNaN(prevRaw) || Number.isNaN(currRaw)) {
      continue;
    }

    const absoluteChange = currRaw - prevRaw;
    const direction: DerivedChange["direction"] =
      absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "flat";

    const trustState: WhatChangedTrustState = "DERIVED";

    changes.push({
      metricId,
      label: meta.label,
      previousValue: prevRaw,
      currentValue: currRaw,
      absoluteChange,
      percentChange: percentChange(prevRaw, currRaw),
      direction,
      tone: toneFor(metricId, direction),
      comparisonStart: previous.reviewedAt,
      comparisonEnd,
      branchId: current.branchId,
      businessWindow: current.businessWindow,
      source: meta.source,
      trustState,
      persistenceState: "BROWSER_LOCAL",
      drillDown: {
        href: meta.href,
        label: `Review ${meta.label} in ${meta.href.replace("/admin/", "")}`,
      },
      limitation:
        "Derived from browser-local review baseline on this device — not cross-device history.",
    });
  }

  return changes
    .filter((c) => c.direction !== "flat")
    .sort((a, b) => Math.abs(b.absoluteChange ?? 0) - Math.abs(a.absoluteChange ?? 0));
}

export function snapshotsComparable(
  previous: SafeMetricSnapshot | null,
  current: SafeMetricSnapshot,
): boolean {
  if (!previous) return false;
  return (
    previous.branchId === current.branchId &&
    previous.businessWindow === current.businessWindow
  );
}

/**
 * Compose What Changed summary from current DASH aggregates + optional browser baseline.
 */

import { compareSnapshots, snapshotsComparable } from "./compare";
import type {
  SafeMetricSnapshot,
  SinceAnchorKind,
  WhatChangedConfidence,
  WhatChangedCoverageState,
  WhatChangedSummary,
} from "./types";

export type WhatChangedBuildInput = {
  branchId: string | null;
  branchName: string;
  businessWindow: string;
  nowMs?: number;
  previousSnapshot: SafeMetricSnapshot | null;
  currentMetrics: SafeMetricSnapshot["metrics"];
  sourceOk: SafeMetricSnapshot["sourceOk"];
};

export function resolveSinceAnchor(hasComparableBaseline: boolean): {
  kind: SinceAnchorKind;
  label: string;
} {
  if (hasComparableBaseline) {
    return {
      kind: "BROWSER_LOCAL_REVIEW",
      label: "Since your last review on this device",
    };
  }
  return {
    kind: "BUSINESS_WINDOW",
    label: "Changes during the selected business window",
  };
}

/** Explicit: previous-login wording is forbidden until a reliable watermark exists. */
export const FORBIDDEN_SINCE_WORDING = [
  "Since your last login",
  "Since your previous successful sign-in",
  "since last login",
] as const;

export function buildCurrentSnapshot(input: {
  branchId: string | null;
  businessWindow: string;
  reviewedAt: string;
  metrics: SafeMetricSnapshot["metrics"];
  sourceOk: SafeMetricSnapshot["sourceOk"];
}): SafeMetricSnapshot {
  return {
    version: 1,
    reviewedAt: input.reviewedAt,
    branchId: input.branchId,
    businessWindow: input.businessWindow,
    metrics: { ...input.metrics },
    sourceOk: { ...input.sourceOk },
  };
}

function coverageAndConfidence(input: {
  hasBaseline: boolean;
  comparable: boolean;
  sourceOk: SafeMetricSnapshot["sourceOk"];
  changeCount: number;
}): {
  coverageState: WhatChangedCoverageState;
  confidence: WhatChangedConfidence;
  sourceCoveragePercent: number;
  totalFailure: boolean;
  partialFailure: boolean;
} {
  const flags = Object.values(input.sourceOk);
  const okCount = flags.filter(Boolean).length;
  const total = flags.length;
  const sourceCoveragePercent =
    total === 0 ? 0 : Math.max(0, Math.min(100, Math.round((okCount / total) * 100)));
  const totalFailure = okCount === 0;
  const partialFailure = okCount > 0 && okCount < total;

  if (totalFailure) {
    return {
      coverageState: "SOURCE_FAILURE",
      confidence: "LOW",
      sourceCoveragePercent,
      totalFailure,
      partialFailure,
    };
  }

  if (!input.hasBaseline) {
    return {
      coverageState: "NO_BASELINE",
      confidence: partialFailure ? "LOW" : "MEDIUM",
      sourceCoveragePercent,
      totalFailure,
      partialFailure,
    };
  }

  if (!input.comparable) {
    return {
      coverageState: "INSUFFICIENT",
      confidence: "LOW",
      sourceCoveragePercent,
      totalFailure,
      partialFailure,
    };
  }

  if (partialFailure) {
    return {
      coverageState: "PARTIAL",
      confidence: "LOW",
      sourceCoveragePercent,
      totalFailure,
      partialFailure,
    };
  }

  return {
    coverageState: "COMPARABLE",
    confidence: sourceCoveragePercent >= 80 ? "HIGH" : "MEDIUM",
    sourceCoveragePercent,
    totalFailure,
    partialFailure,
  };
}

export function buildWhatChangedSummary(input: WhatChangedBuildInput): WhatChangedSummary {
  const nowMs = input.nowMs ?? Date.now();
  const comparisonEnd = new Date(nowMs).toISOString();
  const current = buildCurrentSnapshot({
    branchId: input.branchId,
    businessWindow: input.businessWindow,
    reviewedAt: comparisonEnd,
    metrics: input.currentMetrics,
    sourceOk: input.sourceOk,
  });

  const previous = input.previousSnapshot;
  const comparable = snapshotsComparable(previous, current);
  const hasBaseline = Boolean(previous);
  const anchor = resolveSinceAnchor(comparable && hasBaseline);

  const changes = comparable
    ? compareSnapshots({
        previous,
        current,
        comparisonEnd,
        branchMatchRequired: true,
      })
    : [];

  const { coverageState, confidence, sourceCoveragePercent, totalFailure, partialFailure } =
    coverageAndConfidence({
      hasBaseline,
      comparable,
      sourceOk: input.sourceOk,
      changeCount: changes.length,
    });

  const unavailableDomains: string[] = [];
  if (!input.sourceOk.ops) unavailableDomains.push("Orders / sales KPIs");
  if (!input.sourceOk.kitchen) unavailableDomains.push("Kitchen");
  if (!input.sourceOk.delivery) unavailableDomains.push("Delivery");
  if (!input.sourceOk.approvals) unavailableDomains.push("Approvals");
  if (!input.sourceOk.exceptions) unavailableDomains.push("Exceptions");
  if (!input.sourceOk.health) unavailableDomains.push("Branch health");

  const limitations: string[] = [
    "Previous successful sign-in watermark is not available — never claimed as last login.",
    "Cross-device and organization-wide history are not claimed.",
    "Derived metric changes require a browser-local baseline on this device with matching branch and business window.",
    "Source failure is never interpreted as zero changes or improvement.",
    "Estimated and Accounting Posted metrics are never mixed in comparisons.",
  ];

  if (!hasBaseline) {
    limitations.unshift(
      "No review baseline on this device yet — mark reviewed to enable derived comparisons next time.",
    );
  } else if (!comparable) {
    limitations.unshift(
      "Stored baseline is not comparable (branch or business window mismatch) — reset review baseline to continue.",
    );
  }

  if (totalFailure) {
    limitations.unshift(
      "Required history sources failed — do not treat this as “No changes.”",
    );
  }

  return {
    sinceLabel: anchor.label,
    sinceAnchorKind: anchor.kind,
    comparisonStart: comparable && previous ? previous.reviewedAt : null,
    comparisonEnd,
    branchId: input.branchId,
    branchName: input.branchName,
    businessWindow: input.businessWindow,
    coverageState,
    confidence,
    sourceCoveragePercent,
    changes,
    unavailableDomains,
    limitations,
    totalFailure,
    partialFailure,
    hasBaseline: comparable,
    actionMaturity: "DRILL_DOWN",
  };
}

export function formatChangeSentence(change: {
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  absoluteChange: number | null;
  direction: string;
  tone: string;
}): string {
  if (
    change.previousValue == null ||
    change.currentValue == null ||
    change.absoluteChange == null
  ) {
    return `${change.label}: comparison unavailable.`;
  }
  if (change.direction === "up") {
    return `${change.label} increased from ${change.previousValue} to ${change.currentValue}.`;
  }
  if (change.direction === "down") {
    return `${change.label} decreased from ${change.previousValue} to ${change.currentValue}.`;
  }
  return `${change.label} unchanged at ${change.currentValue}.`;
}

/**
 * Browser-local review baseline — timestamp + safe aggregates only.
 * Never stores tokens, identity, PII, or raw business records.
 */

import type { SafeMetricSnapshot } from "./types";

export const WHAT_CHANGED_STORAGE_KEY = "telepizza.admin.whatChanged.v1";
export const WHAT_CHANGED_STORAGE_VERSION = 1 as const;

export type WhatChangedStorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultStorage(): WhatChangedStorageAdapter | null {
  if (typeof globalThis === "undefined") return null;
  try {
    const ls = (globalThis as { localStorage?: WhatChangedStorageAdapter }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

function isSafeSnapshot(value: unknown): value is SafeMetricSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as SafeMetricSnapshot;
  return (
    v.version === 1 &&
    typeof v.reviewedAt === "string" &&
    typeof v.businessWindow === "string" &&
    typeof v.metrics === "object" &&
    v.metrics != null &&
    typeof v.sourceOk === "object" &&
    v.sourceOk != null
  );
}

export function readReviewSnapshot(
  storage: WhatChangedStorageAdapter | null = defaultStorage(),
): SafeMetricSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(WHAT_CHANGED_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSafeSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeReviewSnapshot(
  snapshot: SafeMetricSnapshot,
  storage: WhatChangedStorageAdapter | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    const safe: SafeMetricSnapshot = {
      version: WHAT_CHANGED_STORAGE_VERSION,
      reviewedAt: snapshot.reviewedAt,
      branchId: snapshot.branchId,
      businessWindow: snapshot.businessWindow,
      metrics: { ...snapshot.metrics },
      sourceOk: { ...snapshot.sourceOk },
    };
    storage.setItem(WHAT_CHANGED_STORAGE_KEY, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}

export function clearReviewSnapshot(
  storage: WhatChangedStorageAdapter | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(WHAT_CHANGED_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Reject accidental PII/token keys if ever present in a corrupted blob. */
export function storagePayloadLooksSafe(raw: string): boolean {
  const banned =
    /password|token|cookie|authorization|bearer|phone|email|address|salary|iban|jwt|session/i;
  return !banned.test(raw);
}

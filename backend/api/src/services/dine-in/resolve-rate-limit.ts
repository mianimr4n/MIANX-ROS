/**
 * In-memory rate limits for dine-in session resolve (per IP + QR token hash).
 * Process-local — mirrors guest-order / quote limiters; not distributed.
 */

import { createHash } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../common/http.js";
import { getRequestIp } from "../orders/quote-rate-limit.js";

const buckets = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;

function tokenFingerprint(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex").slice(0, 16);
}

function bucketKey(ip: string, qrToken: string): string {
  return `dine-in-resolve:${ip}:${tokenFingerprint(qrToken)}`;
}

export function assertDineInResolveRateLimit(ip: string, qrToken: string): void {
  const key = bucketKey(ip, qrToken);
  const now = Date.now();
  const prior = (buckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (prior.length >= MAX_PER_WINDOW) {
    throw new ApiError(429, "RATE_LIMITED", "Too many session resolve requests. Please try again shortly.");
  }
  prior.push(now);
  buckets.set(key, prior);
}

/** Test helper — clears buckets between tests. */
export function resetDineInResolveRateLimitBuckets(): void {
  buckets.clear();
}

export function dineInResolveRateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const body = req.body as { qrToken?: unknown } | undefined;
    const qrToken = typeof body?.qrToken === "string" ? body.qrToken : "";
    if (qrToken) {
      assertDineInResolveRateLimit(getRequestIp(req), qrToken);
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

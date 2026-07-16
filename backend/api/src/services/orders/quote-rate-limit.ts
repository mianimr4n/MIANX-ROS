/**
 * Simple in-memory rate limiter for quote creation (per IP).
 * Process-local — sufficient for Sprint 4.2 contract; not a distributed limiter.
 */

import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../common/http.js";

const buckets = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;

export function getRequestIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}

export function assertQuoteRateLimit(ip: string): void {
  const now = Date.now();
  const prior = (buckets.get(ip) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (prior.length >= MAX_PER_WINDOW) {
    throw new ApiError(429, "RATE_LIMITED", "Too many quote requests. Please try again shortly.");
  }
  prior.push(now);
  buckets.set(ip, prior);
}

/** Test helper — clears buckets between tests. */
export function resetQuoteRateLimitBuckets(): void {
  buckets.clear();
}

export function quoteRateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    assertQuoteRateLimit(getRequestIp(req));
    return next();
  } catch (error) {
    return next(error);
  }
}

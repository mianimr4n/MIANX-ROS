/**
 * In-memory IP rate limits for public reservation booking.
 * Process-local — mirrors guest-order / dine-in limiters; not distributed.
 */

import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../common/http.js";
import { getRequestIp } from "../orders/quote-rate-limit.js";

const buckets = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000;

export type PublicBookingRateAction = "availability" | "create" | "cancel" | "status";

const LIMITS: Record<PublicBookingRateAction, number> = {
  availability: 20,
  create: 10,
  cancel: 10,
  status: 20,
};

function bucketKey(action: PublicBookingRateAction, ip: string): string {
  return `public-booking:${action}:${ip}`;
}

export function assertPublicBookingRateLimit(action: PublicBookingRateAction, ip: string): void {
  const max = LIMITS[action];
  const key = bucketKey(action, ip);
  const now = Date.now();
  const prior = (buckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (prior.length >= max) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
  prior.push(now);
  buckets.set(key, prior);
}

/** Test helper — clears buckets between tests. */
export function resetPublicBookingRateLimitBuckets(): void {
  buckets.clear();
}

export function publicBookingRateLimitMiddleware(action: PublicBookingRateAction) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      assertPublicBookingRateLimit(action, getRequestIp(req));
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

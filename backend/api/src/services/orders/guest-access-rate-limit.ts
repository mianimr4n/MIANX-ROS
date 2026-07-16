/**
 * In-memory rate limits for guest order read/cancel (per IP + order number).
 * Process-local — sufficient for Sprint 4.3 Phase B; not distributed.
 */

import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../../common/http.js";
import { getRequestIp } from "./quote-rate-limit.js";

const buckets = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000;
const TRACK_MAX_PER_WINDOW = 30;
const CANCEL_MAX_PER_WINDOW = 10;

function bucketKey(action: "track" | "cancel", ip: string, orderNumber: string): string {
  return `${action}:${ip}:${orderNumber.trim().toUpperCase()}`;
}

export function assertGuestOrderAccessRateLimit(
  action: "track" | "cancel",
  ip: string,
  orderNumber: string,
): void {
  const max = action === "track" ? TRACK_MAX_PER_WINDOW : CANCEL_MAX_PER_WINDOW;
  const key = bucketKey(action, ip, orderNumber);
  const now = Date.now();
  const prior = (buckets.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (prior.length >= max) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
  prior.push(now);
  buckets.set(key, prior);
}

/** Test helper — clears buckets between tests. */
export function resetGuestOrderAccessRateLimitBuckets(): void {
  buckets.clear();
}

export function guestOrderAccessRateLimitMiddleware(action: "track" | "cancel") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const orderNumber = req.params.orderNumber;
      if (typeof orderNumber === "string" && orderNumber.trim()) {
        assertGuestOrderAccessRateLimit(action, getRequestIp(req), orderNumber);
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

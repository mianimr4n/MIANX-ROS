import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.js";
import type { AuthorizedRequest } from "../middleware/authorization.js";
import type { Logger } from "./logger.js";
import { defaultLogger } from "./logger.js";
import { attachRequestId, getRequestId } from "./request-id.js";

export const DEFAULT_SLOW_REQUEST_MS = 500;

export interface RequestLoggingOptions {
  logger?: Logger;
  slowRequestMs?: number;
  now?: () => number;
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
}

function identityFromRequest(req: Request): {
  userId: string | null;
  branchId: string | null;
  supplierId: string | null;
} {
  const auth = (req as AuthenticatedRequest).auth;
  const principal = (req as AuthorizedRequest).principal;
  const userId = auth?.authUserId ?? principal?.authUserId ?? null;
  const branchIds = principal?.branchIds ?? [];
  const branchId = branchIds.length === 1 ? branchIds[0]! : null;
  // Supplier id is only logged when already resolved onto the request by route handlers.
  const supplierId =
    (req as Request & { supplierId?: string }).supplierId ??
    (req as Request & { observability?: { supplierId?: string } }).observability?.supplierId ??
    null;
  return { userId, branchId, supplierId };
}

export function createRequestLoggingMiddleware(options: RequestLoggingOptions = {}) {
  const logger = options.logger ?? defaultLogger;
  const slowMs = options.slowRequestMs ?? Number(process.env.TELEPIZZA_SLOW_REQUEST_MS || DEFAULT_SLOW_REQUEST_MS);
  const now = options.now ?? (() => Date.now());

  return function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = attachRequestId(req, res);
    const started = now();

    res.on("finish", () => {
      const durationMs = Math.max(0, now() - started);
      const { userId, branchId, supplierId } = identityFromRequest(req);
      const fields = {
        requestId,
        method: req.method,
        path: req.originalUrl?.split("?")[0] || req.path,
        status: res.statusCode,
        durationMs,
        userId,
        branchId,
        supplierId,
        clientIp: clientIp(req),
        userAgent: req.get("user-agent") ?? null,
      };

      if (durationMs >= slowMs) {
        logger.warn("slow_request", fields);
      } else {
        logger.info("request", fields);
      }
    });

    next();
  };
}

export function isSlowRequest(durationMs: number, thresholdMs = DEFAULT_SLOW_REQUEST_MS): boolean {
  return durationMs >= thresholdMs;
}

export { getRequestId };

import type { NextFunction, Request, Response } from "express";
import { type ZodSchema } from "zod";

import {
  createObservabilityErrorHandler,
  createObservabilityNotFoundHandler,
} from "../observability/error-format.js";

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: result.error.flatten(),
        },
      });
    }

    req.body = result.data;
    return next();
  };
}

/**
 * @deprecated Legacy stub authorization via the `x-telepizza-role` header.
 * Do NOT use for real authenticated identity or privilege decisions.
 * New auth code must verify Supabase bearer tokens and load roles from the database.
 * Kept only so existing 501 admin/rider scaffolds continue to exercise a coarse gate.
 */
export function requireRole(allowedRoles: string[]) {
  const normalizedRoles = allowedRoles.map((role) => role.toLowerCase());

  return (req: Request, res: Response, next: NextFunction) => {
    const providedRole = req.header("x-telepizza-role")?.toLowerCase();

    if (!providedRole || !normalizedRoles.includes(providedRole)) {
      return res.status(403).json({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: `One of these roles is required: ${allowedRoles.join(", ")}.`,
        },
      });
    }

    return next();
  };
}

export function sendNotImplemented(
  res: Response,
  feature: string,
  requiredPermissions: string[],
) {
  return res.status(501).json({
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: `${feature} is scaffolded but not connected to Supabase yet.`,
    },
    meta: {
      requiredPermissions,
    },
  });
}

/** 404 handler — includes requestId when request-logging middleware ran. */
export const notFoundHandler = createObservabilityNotFoundHandler();

/** Global error handler — structured safe errors + request correlation. */
export const errorHandler = createObservabilityErrorHandler();

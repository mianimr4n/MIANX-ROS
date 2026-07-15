import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";

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

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
    },
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";

  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  });
}

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ApiError } from "../common/http.js";
import { getApm } from "./apm.js";
import type { Logger } from "./logger.js";
import { defaultLogger } from "./logger.js";
import { safeErrorMessage } from "./redact.js";
import { getRequestId } from "./request-id.js";

export interface ErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
    route?: string;
    status: number;
    errorClass: string;
  };
}

export function buildErrorBody(input: {
  code: string;
  message: string;
  status: number;
  errorClass: string;
  requestId?: string;
  route?: string;
  details?: unknown;
  includeDetails: boolean;
}): ErrorBody {
  return {
    ok: false,
    error: {
      code: input.code,
      message: input.message,
      status: input.status,
      errorClass: input.errorClass,
      timestamp: new Date().toISOString(),
      ...(input.requestId ? { requestId: input.requestId } : {}),
      ...(input.route ? { route: input.route } : {}),
      ...(input.includeDetails && input.details !== undefined ? { details: input.details } : {}),
    },
  };
}

export function createObservabilityErrorHandler(options: { logger?: Logger } = {}) {
  const logger = options.logger ?? defaultLogger;

  return function observabilityErrorHandler(
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const requestId = getRequestId(req);
    const route = req.originalUrl?.split("?")[0] || req.path;
    const exposeInternal = process.env.NODE_ENV !== "production";
    const timestamp = new Date().toISOString();

    if (error instanceof ZodError) {
      const status = 400;
      const body = buildErrorBody({
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        status,
        errorClass: "ZodError",
        requestId,
        route,
        details: error.flatten(),
        includeDetails: true,
      });
      logger.warn("request_error", {
        requestId,
        route,
        status,
        errorClass: "ZodError",
        timestamp,
      });
      return res.status(status).json(body);
    }

    if (error instanceof ApiError) {
      const body = buildErrorBody({
        code: error.code,
        message: error.message,
        status: error.statusCode,
        errorClass: "ApiError",
        requestId,
        route,
        details: error.details,
        includeDetails: error.statusCode < 500 && error.details !== undefined,
      });
      const level = error.statusCode >= 500 ? "error" : "warn";
      logger[level]("request_error", {
        requestId,
        route,
        status: error.statusCode,
        errorClass: "ApiError",
        code: error.code,
        timestamp,
      });
      if (error.statusCode >= 500) {
        getApm().captureException(error, { requestId, route });
      }
      return res.status(error.statusCode).json(body);
    }

    const status = 500;
    const errorClass = error instanceof Error ? error.name || "Error" : "UnknownError";
    const message = safeErrorMessage(error, exposeInternal);

    logger.error("request_error", {
      requestId,
      route,
      status,
      errorClass,
      timestamp,
      ...(exposeInternal && error instanceof Error ? { stack: error.stack } : {}),
    });
    getApm().captureException(error, { requestId, route });

    return res.status(status).json(
      buildErrorBody({
        code: "INTERNAL_SERVER_ERROR",
        message,
        status,
        errorClass,
        requestId,
        route,
        includeDetails: false,
      }),
    );
  };
}

export function createObservabilityNotFoundHandler() {
  return function observabilityNotFoundHandler(req: Request, res: Response) {
    const requestId = getRequestId(req);
    const route = req.originalUrl?.split("?")[0] || req.path;
    return res.status(404).json(
      buildErrorBody({
        code: "NOT_FOUND",
        message: "Route not found.",
        status: 404,
        errorClass: "NotFound",
        requestId,
        route,
        includeDetails: false,
      }),
    );
  };
}

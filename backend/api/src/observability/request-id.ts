import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

export function resolveRequestId(incoming: string | undefined): string {
  const trimmed = incoming?.trim();
  if (trimmed && REQUEST_ID_RE.test(trimmed)) return trimmed;
  return randomUUID();
}

export function attachRequestId(req: Request, res: Response): string {
  const requestId = resolveRequestId(req.header(REQUEST_ID_HEADER) ?? undefined);
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}

export function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

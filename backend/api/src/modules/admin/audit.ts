/**
 * Admin audit routes (Phase 2.5 — ADR-012).
 *
 * Mounts under `/api/v1/admin/audit/...`:
 *   - GET  /audit/events           — list with filters
 *   - GET  /audit/events/:id       — single event
 *   - GET  /audit/events/by-entity — events for an entity (domain + entityId)
 *   - GET  /audit/events/by-correlation — events for a correlation_id
 *
 * Authorization: audit.read OR admin.access.
 * Branch scoping: branch staff see only events in their branch (+ events
 * with no branch). Super-admin sees all.
 *
 * Authority: ADR-012 §6 (branch-scoped RLS)
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { ApiError } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { DomainEventService } from "../../services/audit/domain-event-service.js";
import { DOMAIN_EVENT_DOMAINS } from "../../services/audit/domain-event-service.js";

export interface AdminAuditRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  domainEventService: DomainEventService;
}

interface BranchContext {
  branchIds: string[];
  isSuperAdmin: boolean;
}

const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many audit log requests. Please retry later." },
  },
});

function resolveBranchContext(req: AuthorizedRequest): BranchContext {
  const principal = req.principal;
  if (!principal) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (principal.isSuperAdmin) {
    return { branchIds: [], isSuperAdmin: true };
  }
  return { branchIds: principal.branchIds, isSuperAdmin: false };
}

const listEventsSchema = z
  .object({
    domain: z.enum(DOMAIN_EVENT_DOMAINS as [string, ...string[]]).optional(),
    eventType: z.string().trim().max(120).optional(),
    entityId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    actorUserId: z.string().uuid().optional(),
    correlationId: z.string().uuid().optional(),
    fromOccurredAt: z.string().datetime().optional(),
    toOccurredAt: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const byEntitySchema = z
  .object({
    domain: z.enum(DOMAIN_EVENT_DOMAINS as [string, ...string[]]),
    entityId: z.string().uuid(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .strict();

const byCorrelationSchema = z
  .object({
    correlationId: z.string().uuid(),
  })
  .strict();

export function createAdminAuditRouter(deps: AdminAuditRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireReadAccess = requireAnyPermission(["audit.read", "admin.access"]);

  router.get(
    "/audit/events",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = listEventsSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const result = await deps.domainEventService.listEvents({
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          filters: {
            domain: parsed.data.domain as never,
            eventType: parsed.data.eventType,
            entityId: parsed.data.entityId,
            branchId: parsed.data.branchId,
            actorUserId: parsed.data.actorUserId,
            correlationId: parsed.data.correlationId,
            fromOccurredAt: parsed.data.fromOccurredAt,
            toOccurredAt: parsed.data.toOccurredAt,
            limit: parsed.data.limit,
            offset: parsed.data.offset,
          },
        });
        res.json({
          ok: true,
          data: result.rows,
          pagination: {
            total: result.total,
            limit: parsed.data.limit ?? 50,
            offset: parsed.data.offset ?? 0,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/audit/events/:id",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const eventId = Number(req.params.id);
        if (!Number.isInteger(eventId) || eventId < 1) {
          throw new ApiError(400, "VALIDATION_ERROR", "Event id must be a positive integer.");
        }
        const row = await deps.domainEventService.getEvent({ eventId });
        if (!row) {
          throw new ApiError(404, "EVENT_NOT_FOUND", "Domain event not found.");
        }
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/audit/events/by-entity",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = byEntitySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const rows = await deps.domainEventService.listEventsForEntity({
          domain: parsed.data.domain as never,
          entityId: parsed.data.entityId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          limit: parsed.data.limit,
        });
        res.json({ ok: true, data: rows });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/audit/events/by-correlation",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = byCorrelationSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const rows = await deps.domainEventService.listEventsByCorrelation({
          correlationId: parsed.data.correlationId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
        });
        res.json({ ok: true, data: rows });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

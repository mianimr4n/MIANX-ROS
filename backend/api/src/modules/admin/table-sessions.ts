import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requirePermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import type { TableServiceOperations } from "../../services/dine-in/table-service.js";

/**
 * D3 — dining-session table service APIs + live floor state.
 * Reads: reservation.read. Session operations: dinein.manage.
 */

export interface AdminTableSessionsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  tableService: TableServiceOperations;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const branchQuerySchema = z.object({ branchId: z.string().uuid() });

const walkInSchema = z
  .object({
    branchId: z.string().uuid(),
    tableIds: z.array(z.string().uuid()).min(1).max(10),
    partySize: z.number().int().positive().max(100),
    guestName: z.string().trim().min(1).max(150),
    serverUserId: z.string().uuid().optional().nullable(),
    overrideCapacity: z.boolean().optional(),
  })
  .strict();

const transferSchema = z
  .object({
    addTableIds: z.array(z.string().uuid()).max(10).optional(),
    removeTableIds: z.array(z.string().uuid()).max(10).optional(),
    reason: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine(
    (body) => (body.addTableIds?.length ?? 0) > 0 || (body.removeTableIds?.length ?? 0) > 0,
    { message: "At least one table addition or removal is required." },
  );

const assignServerSchema = z
  .object({
    userId: z.string().uuid(),
    role: z.enum(["primary", "support"]).optional(),
  })
  .strict();

const closeSchema = z
  .object({
    overrideOpenBill: z.boolean().optional(),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() }).strict();

export function createAdminTableSessionsRouter(deps: AdminTableSessionsRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/floor-state",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = branchQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId query parameter is required.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.tableService.getLiveFloorState(
          scopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/sessions/walk-in",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(walkInSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const session = await deps.tableService.seatWalkIn(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data: session });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/sessions",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = branchQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId query parameter is required.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const sessions = await deps.tableService.listActiveSessions(
          scopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({ ok: true, data: sessions });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/sessions/:id",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const session = await deps.tableService.getSession(scopeFrom(principal), req.params.id);
        return res.json({ ok: true, data: session });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/sessions/:id/transfer",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(transferSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.tableService.transferTables(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/sessions/:id/server",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(assignServerSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        await deps.tableService.assignServer(scopeFrom(principal), req.params.id, req.body);
        return res.json({ ok: true, data: { assigned: true } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/sessions/:id/request-bill",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const session = await deps.tableService.requestBill(scopeFrom(principal), req.params.id);
        return res.json({ ok: true, data: session });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/sessions/:id/close",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(closeSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.tableService.closeSession(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/sessions/:id/cancel",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(cancelSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        await deps.tableService.cancelSession(scopeFrom(principal), req.params.id, req.body.reason);
        return res.json({ ok: true, data: { cancelled: true } });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  requirePermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import {
  DELIVERY_STATUSES,
  type DeliveryActorScope,
  type DeliveryOperationsDataSource,
  type RiderDeliveryAction,
} from "../../services/deliveries/operations.js";

export interface RidersRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  deliveryOperations: DeliveryOperationsDataSource;
}

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(DELIVERY_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const assignBodySchema = z
  .object({
    riderId: z.string().uuid(),
  })
  .strict();

const statusBodySchema = z
  .object({
    status: z.enum(["assigned", "picked-up", "delivered"]),
    notes: z.string().trim().max(250).optional(),
  })
  .strict();

function scopeFrom(principal: AuthPrincipal): DeliveryActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
    permissions: principal.permissions,
  };
}

export function createRidersRouter(deps: RidersRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/assignments",
    requireAuthenticatedUser,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid list query parameters.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.deliveryOperations.listAssignments(scopeFrom(principal), {
          branchId: parsed.data.branchId,
          status: parsed.data.status,
          limit: parsed.data.limit ?? 50,
          offset: parsed.data.offset ?? 0,
        });
        return res.json({
          ok: true,
          data: result.assignments,
          meta: { pagination: result.pagination },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/roster",
    requireAuthenticatedUser,
    requirePermission("delivery.assign"),
    async (req, res, next) => {
      try {
        const branchId =
          typeof req.query.branchId === "string" && req.query.branchId.length > 0
            ? req.query.branchId
            : undefined;
        if (branchId && !z.string().uuid().safeParse(branchId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId must be a UUID.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const riders = await deps.deliveryOperations.listRiders(scopeFrom(principal), branchId);
        return res.json({ ok: true, data: riders });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/deliveries/:deliveryId/assign",
    requireAuthenticatedUser,
    requirePermission("delivery.assign"),
    validateBody(assignBodySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof assignBodySchema>;
        const result = await deps.deliveryOperations.assignRider({
          scope: scopeFrom(principal),
          deliveryId: req.params.deliveryId,
          riderId: body.riderId,
        });
        return res.status(200).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/deliveries/:deliveryId/status",
    requireAuthenticatedUser,
    requireAnyPermission(["delivery.update", "delivery.assign"]),
    validateBody(statusBodySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof statusBodySchema>;
        const result = await deps.deliveryOperations.transitionDelivery({
          scope: scopeFrom(principal),
          deliveryId: req.params.deliveryId,
          toStatus: body.status as RiderDeliveryAction,
          note: body.notes,
        });
        return res.status(200).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import type { DeliverySettingsService } from "../../services/settings/delivery.js";

export interface AdminDeliverySettingsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  deliverySettings: DeliverySettingsService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const branchQuerySchema = z.object({
  branchId: z.string().uuid(),
});

const updateSchema = z
  .object({
    branchId: z.string().uuid(),
    deliveryRadiusKm: z.number().finite().min(0).max(500).nullable().optional(),
    minimumOrderAmount: z.number().finite().min(0).max(1_000_000).nullable().optional(),
    deliveryFee: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.deliveryRadiusKm !== undefined ||
      body.minimumOrderAmount !== undefined ||
      body.deliveryFee !== undefined,
    { message: "At least one delivery settings field is required." },
  );

export function createAdminDeliverySettingsRouter(
  deps: AdminDeliverySettingsRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireBranchWrite = requireAnyPermission(["branch.manage", "admin.access"]);

  router.get(
    "/settings/delivery",
    requireAuthenticatedUser,
    requireBranchWrite,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const query = branchQuerySchema.parse(req.query);
        const data = await deps.deliverySettings.get(scopeFrom(principal), query.branchId);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.put(
    "/settings/delivery",
    requireAuthenticatedUser,
    requireBranchWrite,
    validateBody(updateSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof updateSchema>;
        const data = await deps.deliverySettings.update(principal, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

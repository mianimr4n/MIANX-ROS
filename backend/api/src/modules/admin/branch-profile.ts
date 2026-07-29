import { Router } from "express";
import { z } from "zod";

import { validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requirePermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import type { BranchProfileService } from "../../services/branches/profile.js";

export interface AdminBranchProfileRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  branchProfile: BranchProfileService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const updateSchema = z
  .object({
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().max(150).nullable().optional(),
    address: z.string().trim().min(1).max(2000).optional(),
    opensAt: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "opensAt must be HH:MM (24-hour)")
      .nullable()
      .optional(),
    closesAt: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "closesAt must be HH:MM (24-hour)")
      .nullable()
      .optional(),
    deliveryRadiusKm: z.number().finite().min(0).max(500).nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one branch profile field is required.",
  });

export function createAdminBranchProfileRouter(deps: AdminBranchProfileRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  // Companion read for the Settings editor (catalog GET lacks email / radius / structured hours).
  router.get(
    "/branches/:id",
    requireAuthenticatedUser,
    requirePermission("branch.manage"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.branchProfile.get(scopeFrom(principal), req.params.id);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.put(
    "/branches/:id",
    requireAuthenticatedUser,
    requirePermission("branch.manage"),
    validateBody(updateSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof updateSchema>;
        const data = await deps.branchProfile.update(principal, req.params.id, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

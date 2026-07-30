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
import type { BranchSettingsService } from "../../services/settings/branch.js";

/**
 * Owner ERP — GET/PUT /admin/branches/:id/settings
 * Hours + delivery radius / min order / fee from public.branches.
 * Gated by branch.manage or admin.access.
 */

export interface AdminBranchSettingsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  branchSettings: BranchSettingsService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:MM (24-hour)")
  .nullable()
  .optional();

const updateSchema = z
  .object({
    opensAt: timeSchema,
    closesAt: timeSchema,
    deliveryRadiusKm: z.number().finite().min(0).max(500).nullable().optional(),
    minimumOrderAmount: z.number().finite().min(0).max(1_000_000).nullable().optional(),
    deliveryFee: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one branch settings field is required.",
  });

export function createAdminBranchSettingsRouter(deps: AdminBranchSettingsRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireBranchSettingsAccess = requireAnyPermission(["branch.manage", "admin.access"]);

  router.get(
    "/branches/:id/settings",
    requireAuthenticatedUser,
    requireBranchSettingsAccess,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.branchSettings.get(scopeFrom(principal), req.params.id);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.put(
    "/branches/:id/settings",
    requireAuthenticatedUser,
    requireBranchSettingsAccess,
    validateBody(updateSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof updateSchema>;
        const data = await deps.branchSettings.update(principal, req.params.id, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

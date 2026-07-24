import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requirePermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type {
  BranchActorScope,
  BranchOrderManagementDataSource,
} from "../../services/orders/management.js";

export interface AdminDashboardRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  branchOrderManagement: BranchOrderManagementDataSource;
}

const dashboardQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

export function createAdminDashboardRouter(deps: AdminDashboardRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/operations",
    requireAuthenticatedUser,
    requirePermission("order.manage"),
    async (req, res, next) => {
      try {
        const parsed = dashboardQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid dashboard query parameters.",
            parsed.error.flatten(),
          );
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.branchOrderManagement.getOperationsDashboard(scopeFrom(principal), {
          branchId: parsed.data.branchId,
        });
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

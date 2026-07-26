import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
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
import type { DashboardSummariesService } from "../../services/dashboard/summaries.js";

export interface AdminDashboardRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  branchOrderManagement: BranchOrderManagementDataSource;
  dashboardSummaries?: DashboardSummariesService;
}

const dashboardQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

const branchRequiredQuerySchema = z.object({
  branchId: z.string().uuid(),
  includeOccupancyComparison: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

function dashboardScopeFrom(principal: AuthPrincipal) {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
    permissions: principal.permissions,
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

  router.get(
    "/table-service",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        if (!deps.dashboardSummaries) {
          throw new ApiError(503, "SERVICE_UNAVAILABLE", "Dashboard summaries are not configured.");
        }
        const parsed = branchRequiredQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "branchId is required for table-service dashboard.",
            parsed.error.flatten(),
          );
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.dashboardSummaries.getTableServiceSummary(
          dashboardScopeFrom(principal),
          parsed.data.branchId,
          { includeOccupancyComparison: parsed.data.includeOccupancyComparison },
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // System health: platform-technical only (`platform.health.read` or super-admin).
  // Ordinary branch_manager / cashier / host / waiter / kitchen / delivery / staff
  // — including callers with only `admin.access` — receive 403 (service + router gate).
  router.get(
    "/system-health",
    requireAuthenticatedUser,
    requirePermission("platform.health.read"),
    async (req, res, next) => {
      try {
        if (!deps.dashboardSummaries) {
          throw new ApiError(503, "SERVICE_UNAVAILABLE", "Dashboard summaries are not configured.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.dashboardSummaries.getSystemHealth(dashboardScopeFrom(principal));
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // Opening readiness: requires branch.manage | admin.access | reservation.manage (or SA),
  // plus branch membership enforced in the readiness service.
  router.get(
    "/opening-readiness",
    requireAuthenticatedUser,
    requireAnyPermission(["branch.manage", "admin.access", "reservation.manage"]),
    async (req, res, next) => {
      try {
        if (!deps.dashboardSummaries) {
          throw new ApiError(503, "SERVICE_UNAVAILABLE", "Dashboard summaries are not configured.");
        }
        const parsed = z.object({ branchId: z.string().uuid() }).safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId is required.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.dashboardSummaries.getOpeningReadiness(
          dashboardScopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

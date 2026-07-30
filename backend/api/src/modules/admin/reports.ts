import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import type { ReportsService } from "../../services/reports/sales.js";

/**
 * Reports & BI — sales analytics and CSV exports from live `orders` rows.
 * Gated by reports.read, order.manage, or admin.access.
 */

export interface AdminReportsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  reports: ReportsService;
}

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "completed",
  "cancelled",
] as const;

const salesQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  branchId: z.string().uuid().optional(),
});

const ordersExportQuerySchema = salesQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

function sendCsv(res: import("express").Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}

export function createAdminReportsRouter(deps: AdminReportsRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireReportsAccess = requireAnyPermission([
    "reports.read",
    "order.manage",
    "admin.access",
  ]);

  router.get(
    "/reports/sales",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = salesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid sales report query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.reports.getSalesReport(scopeFrom(principal), {
          startDate: parsed.data.startDate ?? "",
          endDate: parsed.data.endDate ?? "",
          branchId: parsed.data.branchId,
        });
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/reports/sales/export",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = salesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid sales export query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const csv = await deps.reports.exportSalesCsv(scopeFrom(principal), {
          startDate: parsed.data.startDate ?? "",
          endDate: parsed.data.endDate ?? "",
          branchId: parsed.data.branchId,
        });
        const stamp = parsed.data.endDate ?? "sales";
        return sendCsv(res, `telepizza-sales-${stamp}.csv`, csv);
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/reports/orders/export",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = ordersExportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid orders export query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const csv = await deps.reports.exportOrdersCsv(scopeFrom(principal), {
          startDate: parsed.data.startDate ?? "",
          endDate: parsed.data.endDate ?? "",
          branchId: parsed.data.branchId,
          status: parsed.data.status,
        });
        const stamp = parsed.data.endDate ?? "orders";
        return sendCsv(res, `telepizza-orders-${stamp}.csv`, csv);
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

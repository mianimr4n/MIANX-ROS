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
import type { AnalyticsService } from "../../services/analytics/engine.js";
import { ANALYTICS_MODULE_IDS } from "../../services/analytics/types.js";
import type { ReportsService } from "../../services/reports/sales.js";

/**
 * RC4-2 Analytics & BI + legacy sales CSV routes.
 */

export interface AdminReportsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  reports: ReportsService;
  analytics: AnalyticsService;
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

const analyticsQuerySchema = salesQuerySchema.extend({
  moduleId: z.enum(ANALYTICS_MODULE_IDS).optional(),
});

const scheduleCreateSchema = z.object({
  name: z.string().min(1).max(200),
  moduleId: z.string().min(1),
  cadence: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  format: z.enum(["csv", "excel", "pdf"]),
  branchId: z.string().uuid().optional(),
  metricIds: z.array(z.string()).optional(),
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

function sendExport(
  res: import("express").Response,
  result: { filename: string; contentType: string; body: Buffer | string },
) {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  return res.status(200).send(result.body);
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

  // —— RC4-2 Analytics ——
  router.get("/analytics/modules", requireAuthenticatedUser, requireReportsAccess, (_req, res) => {
    return res.json({ ok: true, data: deps.analytics.listModules() });
  });

  router.get("/analytics/registry", requireAuthenticatedUser, requireReportsAccess, (_req, res) => {
    return res.json({ ok: true, data: deps.analytics.getRegistry() });
  });

  router.get(
    "/analytics/workspace",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = analyticsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid analytics query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.getOwnerWorkspace(scopeFrom(principal), {
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
    "/analytics/modules/:moduleId",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const moduleId = req.params.moduleId as (typeof ANALYTICS_MODULE_IDS)[number];
        if (!ANALYTICS_MODULE_IDS.includes(moduleId)) {
          throw new ApiError(404, "ANALYTICS_MODULE_NOT_FOUND", "Unknown analytics module.");
        }
        const parsed = analyticsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid analytics query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.getModuleSnapshot(scopeFrom(principal), moduleId, {
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
    "/analytics/drilldown/:metricId",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = analyticsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid drill-down query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.drillDown(scopeFrom(principal), req.params.metricId, {
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
    "/analytics/export",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = analyticsQuerySchema
          .extend({ format: z.enum(["csv", "excel", "pdf"]).default("csv") })
          .safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid analytics export query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.analytics.export(scopeFrom(principal), parsed.data.format, {
          startDate: parsed.data.startDate ?? "",
          endDate: parsed.data.endDate ?? "",
          branchId: parsed.data.branchId,
          moduleId: parsed.data.moduleId,
        });
        return sendExport(res, result);
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/analytics/scheduled-reports",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const branchId =
          typeof req.query.branchId === "string" && req.query.branchId.length > 0
            ? req.query.branchId
            : undefined;
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.listScheduledReports(scopeFrom(principal), branchId);
        return res.json({
          ok: true,
          data: { execution: "DEFERRED", reports: data },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/analytics/scheduled-reports",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = scheduleCreateSchema.safeParse(req.body);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid schedule payload.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.createScheduledReport(scopeFrom(principal), parsed.data);
        return res.status(201).json({
          ok: true,
          data,
          meta: { execution: "DEFERRED" },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/analytics/exceptions",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const branchId =
          typeof req.query.branchId === "string" && req.query.branchId.length > 0
            ? req.query.branchId
            : undefined;
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.listExceptions(scopeFrom(principal), branchId);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/analytics/data-quality/run",
    requireAuthenticatedUser,
    requireReportsAccess,
    async (req, res, next) => {
      try {
        const parsed = analyticsQuerySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid data-quality payload.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.analytics.runDataQuality(scopeFrom(principal), {
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

  return router;
}

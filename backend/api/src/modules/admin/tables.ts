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
import type {
  BranchActorScope,
  RestaurantTablesDataSource,
} from "../../services/tables/management.js";

export interface AdminTablesRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  restaurantTables: RestaurantTablesDataSource;
}

const TABLE_STATUSES = ["available", "occupied", "reserved", "inactive"] as const;

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(TABLE_STATUSES).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createBodySchema = z
  .object({
    branchId: z.string().uuid(),
    tableNumber: z.string().trim().min(1).max(40),
    displayName: z.string().trim().max(120).optional().nullable(),
    capacity: z.number().int().positive().optional().nullable(),
    floorOrZone: z.string().trim().max(80).optional().nullable(),
    status: z.enum(TABLE_STATUSES).optional(),
    isActive: z.boolean().optional(),
    generateQr: z.boolean().optional(),
  })
  .strict();

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

/** Strip any accidental hash fields from API responses. */
function toSafeResponse(table: {
  id: string;
  branchId: string;
  tableNumber: string;
  displayName: string | null;
  capacity: number | null;
  floorOrZone: string | null;
  status: string;
  qrVersion: number;
  qrIssued: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: table.id,
    branchId: table.branchId,
    tableNumber: table.tableNumber,
    displayName: table.displayName,
    capacity: table.capacity,
    floorOrZone: table.floorOrZone,
    status: table.status,
    qrVersion: table.qrVersion,
    qrIssued: table.qrIssued,
    isActive: table.isActive,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };
}

export function createAdminTablesRouter(deps: AdminTablesRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  // Table inventory is branch settings — gated by branch.manage (branch-manager + super-admin).
  router.get(
    "/",
    requireAuthenticatedUser,
    requirePermission("branch.manage"),
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "Invalid list query parameters.",
            parsed.error.flatten(),
          );
        }
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.restaurantTables.listTables(scopeFrom(principal), {
          branchId: parsed.data.branchId,
          status: parsed.data.status,
          isActive: parsed.data.isActive,
          limit: parsed.data.limit ?? 50,
          offset: parsed.data.offset ?? 0,
        });
        return res.json({
          ok: true,
          data: result.tables.map(toSafeResponse),
          meta: { pagination: result.pagination },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/:id",
    requireAuthenticatedUser,
    requirePermission("branch.manage"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const table = await deps.restaurantTables.getTable(scopeFrom(principal), req.params.id);
        return res.json({ ok: true, data: toSafeResponse(table) });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuthenticatedUser,
    requirePermission("branch.manage"),
    validateBody(createBodySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.restaurantTables.createTable(scopeFrom(principal), req.body);
        return res.status(201).json({
          ok: true,
          data: {
            ...toSafeResponse(result.table),
            // Raw QR token returned ONCE at create when generateQr is true.
            ...(result.rawQrToken ? { rawQrToken: result.rawQrToken } : {}),
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

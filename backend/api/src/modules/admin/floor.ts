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
import {
  TABLE_OPERATIONAL_STATUSES,
  TABLE_SHAPES,
  type FloorConfigurationService,
} from "../../services/floor/configuration.js";

/**
 * D3 — floor plan configuration APIs.
 * Reads: reservation.read (host/waiter/cashier/manager view).
 * Mutations: floor.manage (admin/branch-manager configuration).
 */

export interface AdminFloorRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  floorConfiguration: FloorConfigurationService;
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

const createFloorSchema = z
  .object({
    branchId: z.string().uuid(),
    code: z.string().trim().min(1).max(80),
    displayName: z.string().trim().min(1).max(150),
    description: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const updateFloorSchema = z
  .object({
    displayName: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const createAreaSchema = z
  .object({
    branchId: z.string().uuid(),
    floorId: z.string().uuid(),
    code: z.string().trim().min(1).max(80),
    displayName: z.string().trim().min(1).max(150),
    description: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    colorToken: z.string().trim().max(40).optional().nullable(),
  })
  .strict();

const updateAreaSchema = z
  .object({
    displayName: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    colorToken: z.string().trim().max(40).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateTableLayoutSchema = z
  .object({
    displayName: z.string().trim().max(120).optional().nullable(),
    floorId: z.string().uuid().optional().nullable(),
    serviceAreaId: z.string().uuid().optional().nullable(),
    capacityMin: z.number().int().positive().max(100).optional(),
    capacityMax: z.number().int().positive().max(100).optional().nullable(),
    shape: z.enum(TABLE_SHAPES).optional(),
    positionX: z.number().min(0).max(10000).optional(),
    positionY: z.number().min(0).max(10000).optional(),
    width: z.number().min(10).max(2000).optional(),
    height: z.number().min(10).max(2000).optional(),
    rotation: z.number().min(-360).max(360).optional(),
    isAccessible: z.boolean().optional(),
    highChairSupported: z.boolean().optional(),
    accessibilityNotes: z.string().trim().max(1000).optional().nullable(),
    isCombinable: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const createTableSchema = z
  .object({
    branchId: z.string().uuid(),
    floorId: z.string().uuid(),
    tableNumber: z.string().trim().min(1).max(40),
    displayName: z.string().trim().max(120).optional().nullable(),
    capacity: z.number().int().min(1).max(100),
    capacityMin: z.number().int().min(1).max(100).optional(),
    capacityMax: z.number().int().min(1).max(100).optional().nullable(),
    serviceAreaId: z.string().uuid().optional().nullable(),
    isAccessible: z.boolean().optional(),
    highChairSupported: z.boolean().optional(),
    accessibilityNotes: z.string().trim().max(1000).optional().nullable(),
    isCombinable: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const transitionSchema = z
  .object({
    toStatus: z.enum(TABLE_OPERATIONAL_STATUSES),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

const createCombinationSchema = z
  .object({
    branchId: z.string().uuid(),
    code: z.string().trim().min(1).max(80),
    displayName: z.string().trim().min(1).max(150),
    minPartySize: z.number().int().positive().max(100).optional(),
    maxPartySize: z.number().int().positive().max(100).optional().nullable(),
    tableIds: z.array(z.string().uuid()).min(2).max(10),
  })
  .strict();

const updateCombinationSchema = z
  .object({
    displayName: z.string().trim().min(1).max(150).optional(),
    minPartySize: z.number().int().positive().max(100).optional(),
    maxPartySize: z.number().int().positive().max(100).optional().nullable(),
    isActive: z.boolean().optional(),
    tableIds: z.array(z.string().uuid()).min(2).max(10).optional(),
  })
  .strict();

export function createAdminFloorRouter(deps: AdminFloorRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/configuration",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = branchQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId query parameter is required.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.floorConfiguration.getConfiguration(
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
    "/floors",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(createFloorSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const floor = await deps.floorConfiguration.createFloor(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data: floor });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/floors/:id",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(updateFloorSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const floor = await deps.floorConfiguration.updateFloor(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: floor });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/areas",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(createAreaSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const area = await deps.floorConfiguration.createArea(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data: area });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/areas/:id",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(updateAreaSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const area = await deps.floorConfiguration.updateArea(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: area });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/tables",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(createTableSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const table = await deps.floorConfiguration.createTable(
          scopeFrom(principal),
          req.body,
          principal.userId,
        );
        return res.status(201).json({ ok: true, data: table });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/tables/:id/layout",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(updateTableLayoutSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const table = await deps.floorConfiguration.updateTableLayout(
          scopeFrom(principal),
          req.params.id,
          req.body,
          principal.userId,
        );
        return res.json({ ok: true, data: table });
      } catch (error) {
        return next(error);
      }
    },
  );

  // Housekeeping status transitions (cleaning→available, block, out-of-service…).
  // Session-lifecycle states are owned by the atomic seating/close RPCs.
  router.post(
    "/tables/:id/status",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(transitionSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const table = await deps.floorConfiguration.transitionTableStatus(
          scopeFrom(principal),
          req.params.id,
          req.body.toStatus,
          principal.userId,
          req.body.note,
        );
        return res.json({ ok: true, data: table });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/combinations",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = branchQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId query parameter is required.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const combos = await deps.floorConfiguration.listCombinations(
          scopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({ ok: true, data: combos });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/combinations",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(createCombinationSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const combo = await deps.floorConfiguration.createCombination(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data: combo });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/combinations/:id",
    requireAuthenticatedUser,
    requirePermission("floor.manage"),
    validateBody(updateCombinationSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const combo = await deps.floorConfiguration.updateCombination(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: combo });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import {
  INVENTORY_ITEM_STATUSES,
  type InventoryService,
} from "../../services/inventory/management.js";

export interface AdminInventoryRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  inventory: InventoryService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const listItemsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

const listMovementsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  inventoryItemId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const createItemSchema = z
  .object({
    branchId: z.string().uuid(),
    sku: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().max(120).nullable().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    currentStock: z.number().finite().min(0).optional(),
    minimumStock: z.number().finite().min(0).optional(),
    reorderLevel: z.number().finite().min(0).optional(),
    costPrice: z.number().finite().min(0).nullable().optional(),
    status: z.enum(INVENTORY_ITEM_STATUSES).optional(),
  })
  .strict();

const updateItemSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().max(120).nullable().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    minimumStock: z.number().finite().min(0).optional(),
    reorderLevel: z.number().finite().min(0).optional(),
    costPrice: z.number().finite().min(0).nullable().optional(),
    status: z.enum(INVENTORY_ITEM_STATUSES).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one inventory field is required.",
  });

const adjustmentSchema = z
  .object({
    inventoryItemId: z.string().uuid(),
    quantityDelta: z.number().finite().refine((n) => n !== 0, "quantityDelta must be non-zero"),
    reason: z.string().trim().max(1000).nullable().optional(),
    movementType: z.enum(["adjustment", "receipt", "waste"] as const).optional(),
  })
  .strict();

/**
 * Inventory stock master + adjustments + movement ledger.
 * Gated by inventory.manage or admin.access.
 */
export function createAdminInventoryRouter(deps: AdminInventoryRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireInventoryAccess = requireAnyPermission(["inventory.manage", "admin.access"]);

  router.get(
    "/inventory/items",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const parsed = listItemsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid inventory items query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.inventory.listItems(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/inventory/items",
    requireAuthenticatedUser,
    requireInventoryAccess,
    validateBody(createItemSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createItemSchema>;
        const data = await deps.inventory.createItem(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/inventory/items/:id",
    requireAuthenticatedUser,
    requireInventoryAccess,
    validateBody(updateItemSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const id = z.string().uuid().parse(req.params.id);
        const body = req.body as z.infer<typeof updateItemSchema>;
        const data = await deps.inventory.updateItem(scopeFrom(principal), id, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/inventory/adjustments",
    requireAuthenticatedUser,
    requireInventoryAccess,
    validateBody(adjustmentSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof adjustmentSchema>;
        const data = await deps.inventory.createAdjustment(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/inventory/movements",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const parsed = listMovementsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid stock movements query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.inventory.listMovements(scopeFrom(principal), parsed.data);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

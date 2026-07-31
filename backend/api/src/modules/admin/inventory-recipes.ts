import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import { getRequestId } from "../../observability/index.js";
import type { Router } from "express";
import {
  RECIPE_STATUSES,
  type InventoryRecipeService,
} from "../../services/inventory/recipes.js";
import type { AuthorizedRequest } from "../../middleware/authorization.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const lineSchema = z
  .object({
    inventoryItemId: z.string().uuid(),
    quantity: z.number().finite().positive(),
    unit: z.string().trim().min(1).max(40),
    wasteFactor: z.number().finite().positive().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();

const createRecipeSchema = z
  .object({
    branchId: z.string().uuid(),
    menuItemId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    yieldFactor: z.number().finite().positive().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    lines: z.array(lineSchema).min(1).max(100),
  })
  .strict();

const updateRecipeSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    yieldFactor: z.number().finite().positive().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    lines: z.array(lineSchema).min(1).max(100).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required." });

const listRecipesQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  menuItemId: z.string().uuid().optional(),
  status: z.enum(RECIPE_STATUSES).optional(),
});

const missingQuerySchema = z.object({
  branchId: z.string().uuid(),
  menuItemIds: z.string().optional(),
});

export function registerInventoryRecipeRoutes(
  router: Router,
  deps: {
    recipes: InventoryRecipeService;
    requireAuthenticatedUser: ReturnType<
      typeof import("../../middleware/authorization.js").createRequireAuthenticatedUser
    >;
    requireInventoryAccess: ReturnType<
      typeof import("../../middleware/authorization.js").requireAnyPermission
    >;
  },
): void {
  const { recipes, requireAuthenticatedUser, requireInventoryAccess } = deps;

  router.get(
    "/inventory/recipes",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const parsed = listRecipesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid recipes query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await recipes.listRecipes(scopeFrom(principal), parsed.data);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/inventory/recipes/missing",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const parsed = missingQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid missing-recipes query.", parsed.error.flatten());
        }
        const menuItemIds = (parsed.data.menuItemIds ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const id of menuItemIds) {
          z.string().uuid().parse(id);
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await recipes.listMissingRecipeMenuItems(
          scopeFrom(principal),
          parsed.data.branchId,
          menuItemIds,
        );
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/inventory/recipes/:id",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const data = await recipes.getRecipe(scopeFrom(principal), id);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/inventory/recipes",
    requireAuthenticatedUser,
    requireInventoryAccess,
    validateBody(createRecipeSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createRecipeSchema>;
        const data = await recipes.createRecipe(
          scopeFrom(principal),
          principal.userId,
          body,
          getRequestId(req) ?? null,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/inventory/recipes/:id",
    requireAuthenticatedUser,
    requireInventoryAccess,
    validateBody(updateRecipeSchema),
    async (req, res, next) => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof updateRecipeSchema>;
        const data = await recipes.updateRecipe(
          scopeFrom(principal),
          principal.userId,
          id,
          body,
          getRequestId(req) ?? null,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/inventory/recipes/:id/activate",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const data = await recipes.activateRecipe(
          scopeFrom(principal),
          principal.userId,
          id,
          getRequestId(req) ?? null,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/inventory/recipes/:id/deactivate",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const data = await recipes.deactivateRecipe(
          scopeFrom(principal),
          principal.userId,
          id,
          getRequestId(req) ?? null,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/inventory/recipes/:id/duplicate",
    requireAuthenticatedUser,
    requireInventoryAccess,
    async (req, res, next) => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const data = await recipes.duplicateRecipe(
          scopeFrom(principal),
          principal.userId,
          id,
          getRequestId(req) ?? null,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );
}

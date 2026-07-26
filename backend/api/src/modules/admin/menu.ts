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
import type { MenuActor, MenuManagementService } from "../../services/menu/management.js";

/**
 * Owner/Admin canonical menu workspace.
 *
 * Reads require `menu.read`; every mutation requires `menu.write` and is recorded in
 * `menu_audit_events`. The catalog is global — no branch scope is applied.
 */

export interface AdminMenuRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  menuManagement: MenuManagementService;
}

const PRODUCT_TYPES = [
  "pizza",
  "burger",
  "sandwich",
  "wings",
  "fries",
  "wrap",
  "pasta",
  "side",
  "drink",
  "deal",
  "topping",
] as const;

const SIZE_CODES = ["small", "medium", "large"] as const;

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case.");

const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: slugSchema,
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const createSkuSchema = z
  .object({
    categoryId: z.string().uuid(),
    slug: slugSchema,
    name: z.string().trim().min(1).max(150),
    /** The single selling price for this SKU (PKR). */
    price: z.number().nonnegative().max(1_000_000),
    productGroupSlug: slugSchema.optional(),
    sizeLabel: z.string().trim().max(80).nullable().optional(),
    sizeCode: z.enum(SIZE_CODES).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    imageUrl: z.string().trim().max(300).nullable().optional(),
    badge: z.string().trim().max(40).nullable().optional(),
    productType: z.enum(PRODUCT_TYPES),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

const updateSkuSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(150).optional(),
    price: z.number().nonnegative().max(1_000_000).optional(),
    productGroupSlug: slugSchema.optional(),
    sizeLabel: z.string().trim().max(80).nullable().optional(),
    sizeCode: z.enum(SIZE_CODES).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    imageUrl: z.string().trim().max(300).nullable().optional(),
    badge: z.string().trim().max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    /** Correlation / idempotency key for atomic price changes. */
    correlationId: z.string().trim().min(8).max(120).nullable().optional(),
    expectedOldPrice: z.number().nonnegative().max(1_000_000).nullable().optional(),
  })
  .strict();

const listGroupsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

const auditQuerySchema = z.object({
  resourceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function actorFrom(principal: AuthPrincipal): MenuActor {
  return { userId: principal.userId, isSuperAdmin: principal.isSuperAdmin };
}

export function createAdminMenuRouter(deps: AdminMenuRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/categories",
    requireAuthenticatedUser,
    requirePermission("menu.read"),
    async (_req, res, next) => {
      try {
        const data = await deps.menuManagement.listCategories();
        return res.json({ ok: true, data, meta: { scope: "global", count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/categories",
    requireAuthenticatedUser,
    requirePermission("menu.write"),
    validateBody(createCategorySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.menuManagement.createCategory(actorFrom(principal), req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/categories/:id",
    requireAuthenticatedUser,
    requirePermission("menu.write"),
    validateBody(updateCategorySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.menuManagement.updateCategory(
          actorFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/products",
    requireAuthenticatedUser,
    requirePermission("menu.read"),
    async (req, res, next) => {
      try {
        const parsed = listGroupsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "categoryId must be a valid uuid.");
        }
        const data = await deps.menuManagement.listProductGroups(parsed.data);
        const skuCount = data.reduce((sum, group) => sum + group.options.length, 0);
        return res.json({
          ok: true,
          data,
          meta: { scope: "global", productGroupCount: data.length, skuCount },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/products",
    requireAuthenticatedUser,
    requirePermission("menu.write"),
    validateBody(createSkuSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.menuManagement.createSku(actorFrom(principal), req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/products/:id",
    requireAuthenticatedUser,
    requirePermission("menu.write"),
    validateBody(updateSkuSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.menuManagement.updateSku(
          actorFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/audit",
    requireAuthenticatedUser,
    requirePermission("menu.read"),
    async (req, res, next) => {
      try {
        const parsed = auditQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid audit query parameters.");
        }
        const data = await deps.menuManagement.listAuditEvents(parsed.data);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

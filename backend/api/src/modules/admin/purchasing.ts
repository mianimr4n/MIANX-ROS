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
  PURCHASE_ORDER_STATUSES,
  SUPPLIER_STATUSES,
  type PurchasingService,
} from "../../services/purchasing/management.js";

export interface AdminPurchasingRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  purchasing: PurchasingService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

const createSupplierSchema = z
  .object({
    branchId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    contactPerson: z.string().trim().max(150).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    email: z.union([z.email(), z.literal(""), z.null()]).optional(),
    address: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(SUPPLIER_STATUSES).optional(),
  })
  .strict()
  .transform((body) => ({
    ...body,
    email: body.email === "" ? null : body.email,
  }));

const createOrderSchema = z
  .object({
    branchId: z.string().uuid(),
    supplierId: z.string().uuid(),
    poNumber: z.string().trim().min(1).max(40).nullable().optional(),
    status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
    totalAmount: z.number().finite().min(0).optional(),
    expectedDeliveryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expectedDeliveryDate must be YYYY-MM-DD")
      .nullable()
      .optional(),
  })
  .strict();

/**
 * Purchasing — suppliers + purchase orders.
 * Gated by purchasing.manage or admin.access.
 */
export function createAdminPurchasingRouter(deps: AdminPurchasingRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requirePurchasingAccess = requireAnyPermission(["purchasing.manage", "admin.access"]);

  router.get(
    "/purchasing/suppliers",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid suppliers query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listSuppliers(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/suppliers",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createSupplierSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createSupplierSchema>;
        const data = await deps.purchasing.createSupplier(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/purchasing/orders",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid purchase orders query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listOrders(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/orders",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createOrderSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createOrderSchema>;
        const data = await deps.purchasing.createOrder(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

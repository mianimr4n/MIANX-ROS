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
  COUPON_DISCOUNT_TYPES,
  COUPON_STATUSES,
  type MarketingService,
} from "../../services/marketing/coupons.js";

export interface AdminMarketingRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  marketing: MarketingService;
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

const createCouponSchema = z
  .object({
    branchId: z.string().uuid().nullable().optional(),
    code: z.string().trim().min(1).max(40),
    discountType: z.enum(COUPON_DISCOUNT_TYPES),
    discountValue: z.number().finite().positive(),
    minOrder: z.number().finite().min(0).optional(),
    expiryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expiryDate must be YYYY-MM-DD")
      .nullable()
      .optional(),
    status: z.enum(COUPON_STATUSES).optional(),
  })
  .strict();

/**
 * Marketing coupons — list/create (REQ-ADM-180).
 * Gated by marketing.manage or admin.access.
 */
export function createAdminMarketingRouter(deps: AdminMarketingRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireMarketingAccess = requireAnyPermission(["marketing.manage", "admin.access"]);

  router.get(
    "/marketing/coupons",
    requireAuthenticatedUser,
    requireMarketingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid coupons query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.marketing.listCoupons(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/marketing/coupons",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(createCouponSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createCouponSchema>;
        const data = await deps.marketing.createCoupon(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

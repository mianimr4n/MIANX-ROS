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
import type { LoyaltyService } from "../../services/loyalty/management.js";

export interface AdminLoyaltyRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  loyalty: LoyaltyService;
}

const earnSchema = z
  .object({
    orderId: z.string().uuid(),
  })
  .strict();

/**
 * Loyalty — account list + earn on completed orders (REQ-ADM-160).
 * Gated by loyalty.manage, order.manage, or admin.access.
 */
export function createAdminLoyaltyRouter(deps: AdminLoyaltyRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireLoyaltyAccess = requireAnyPermission([
    "loyalty.manage",
    "order.manage",
    "admin.access",
  ]);

  router.get(
    "/loyalty/accounts",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    async (_req, res, next) => {
      try {
        const data = await deps.loyalty.listAccounts();
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/loyalty/earn",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(earnSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof earnSchema>;
        const data = await deps.loyalty.earnForOrder(body.orderId, principal.userId);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

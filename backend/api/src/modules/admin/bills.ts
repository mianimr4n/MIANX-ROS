import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import {
  BILL_CLOSE_STATUSES,
  type BillActorScope,
  type RestaurantBillsService,
} from "../../services/bills/restaurant-bills.js";

export interface AdminBillsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  restaurantBills: RestaurantBillsService;
}

const listQuerySchema = z.object({
  session_id: z.string().uuid(),
});

const closeBodySchema = z
  .object({
    status: z.enum(BILL_CLOSE_STATUSES),
  })
  .strict();

function scopeFrom(principal: AuthPrincipal): BillActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

export function createAdminBillsRouter(deps: AdminBillsRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get("/", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "session_id query parameter (UUID) is required.",
          parsed.error.flatten(),
        );
      }
      const principal = (req as AuthorizedRequest).principal!;
      const bills = await deps.restaurantBills.listBillsBySession(
        scopeFrom(principal),
        parsed.data.session_id,
      );
      return res.json({ ok: true, data: bills });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/:id/close",
    requireAuthenticatedUser,
    validateBody(closeBodySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof closeBodySchema>;
        const result = await deps.restaurantBills.closeBill({
          scope: scopeFrom(principal),
          billId: req.params.id,
          status: body.status,
        });
        return res.status(200).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

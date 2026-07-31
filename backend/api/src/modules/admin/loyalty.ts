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

const earnSchema = z.object({ orderId: z.string().uuid() }).strict();
const burnSchema = z
  .object({
    customerId: z.string().uuid(),
    points: z.number().int().positive(),
    orderId: z.string().uuid().nullable().optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    idempotencyKey: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();
const adjustSchema = z
  .object({
    customerId: z.string().uuid(),
    points: z.number().int().refine((n) => n !== 0, "points must be non-zero"),
    note: z.string().trim().min(1).max(2000),
    idempotencyKey: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();
const expireSchema = z
  .object({
    customerId: z.string().uuid(),
    points: z.number().int().positive(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
const reverseSchema = z
  .object({
    transactionId: z.string().uuid(),
    note: z.string().trim().min(1).max(2000),
  })
  .strict();

/**
 * Loyalty ledger — earn/burn/adjust/expire/reverse (REQ-ADM-160 + RC3).
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

  router.get("/loyalty/accounts", requireAuthenticatedUser, requireLoyaltyAccess, async (_req, res, next) => {
    try {
      const data = await deps.loyalty.listAccounts();
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/loyalty/transactions", requireAuthenticatedUser, requireLoyaltyAccess, async (req, res, next) => {
    try {
      const parsed = z
        .object({
          customerId: z.string().uuid().optional(),
          accountId: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(500).optional(),
        })
        .safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid transactions query.", parsed.error.flatten());
      }
      const data = await deps.loyalty.listTransactions(parsed.data);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

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

  router.post(
    "/loyalty/burn",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(burnSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof burnSchema>;
        const data = await deps.loyalty.burn({ ...body, actorUserId: principal.userId });
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/loyalty/adjust",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(adjustSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof adjustSchema>;
        const data = await deps.loyalty.adjust({ ...body, actorUserId: principal.userId });
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/loyalty/expire",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(expireSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof expireSchema>;
        const data = await deps.loyalty.expire({ ...body, actorUserId: principal.userId });
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/loyalty/reverse",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(reverseSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof reverseSchema>;
        const data = await deps.loyalty.reverse({ ...body, actorUserId: principal.userId });
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/loyalty/attention", requireAuthenticatedUser, requireLoyaltyAccess, async (_req, res, next) => {
    try {
      const data = await deps.loyalty.getAttention();
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

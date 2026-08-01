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
import {
  REWARD_APPROVAL,
  REWARD_TYPES,
  type LoyaltyDepthService,
} from "../../services/loyalty/depth.js";
import type { LoyaltyTier } from "../../services/loyalty/management.js";

export interface AdminLoyaltyRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  loyalty: LoyaltyService;
  loyaltyDepth: LoyaltyDepthService;
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

  // —— RC4-11 depth ——
  router.get("/loyalty/rewards", requireAuthenticatedUser, requireLoyaltyAccess, async (req, res, next) => {
    try {
      const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";
      const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
      const data = await deps.loyaltyDepth.listRewards({ branchId, includeInactive });
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/loyalty/rewards",
    requireAuthenticatedUser,
    requireAnyPermission(["loyalty.manage", "admin.access"]),
    validateBody(
      z
        .object({
          branchId: z.string().uuid().nullable().optional(),
          name: z.string().trim().min(1).max(160),
          description: z.string().trim().max(2000).nullable().optional(),
          rewardType: z.enum(REWARD_TYPES),
          pointsCost: z.number().int().positive(),
          monetaryValue: z.number().finite().positive().nullable().optional(),
          productRef: z.string().trim().max(120).nullable().optional(),
          categoryRef: z.string().trim().max(120).nullable().optional(),
          validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
          perCustomerLimit: z.number().int().positive().nullable().optional(),
          globalRedemptionLimit: z.number().int().positive().nullable().optional(),
          minOrderAmount: z.number().finite().min(0).optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.loyaltyDepth.createReward(principal.userId, req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/loyalty/rewards/:id/approval",
    requireAuthenticatedUser,
    requireAnyPermission(["loyalty.manage", "admin.access"]),
    validateBody(
      z
        .object({
          approvalStatus: z.enum(REWARD_APPROVAL),
          activate: z.boolean().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as { approvalStatus: (typeof REWARD_APPROVAL)[number]; activate?: boolean };
        const data = await deps.loyaltyDepth.transitionRewardApproval(
          principal.userId,
          req.params.id,
          body.approvalStatus,
          body.activate,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/loyalty/tiers", requireAuthenticatedUser, requireLoyaltyAccess, async (_req, res, next) => {
    try {
      const data = await deps.loyaltyDepth.listTierDefinitions();
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/loyalty/tiers/evaluate",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(z.object({ customerId: z.string().uuid() }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.loyaltyDepth.evaluateAndApplyTier(
          principal.userId,
          (req.body as { customerId: string }).customerId,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/loyalty/tiers/manual",
    requireAuthenticatedUser,
    requireAnyPermission(["loyalty.manage", "admin.access"]),
    validateBody(
      z
        .object({
          customerId: z.string().uuid(),
          toTier: z.enum(["member", "silver", "gold", "platinum"]),
          reason: z.string().trim().min(1).max(2000),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as { customerId: string; toTier: LoyaltyTier; reason: string };
        const data = await deps.loyaltyDepth.manualTierChange(principal.userId, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/loyalty/customers/:customerId/experience", requireAuthenticatedUser, requireLoyaltyAccess, async (req, res, next) => {
    try {
      const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
      const data = await deps.loyaltyDepth.getCustomerExperience(req.params.customerId, branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/loyalty/rewards/:id/redeem",
    requireAuthenticatedUser,
    requireLoyaltyAccess,
    validateBody(
      z
        .object({
          customerId: z.string().uuid(),
          branchId: z.string().uuid().nullable().optional(),
          orderId: z.string().uuid().nullable().optional(),
          orderSubtotal: z.number().finite().min(0).optional(),
          idempotencyKey: z.string().trim().min(1).max(120),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as {
          customerId: string;
          branchId?: string | null;
          orderId?: string | null;
          orderSubtotal?: number;
          idempotencyKey: string;
        };
        const data = await deps.loyaltyDepth.redeemReward({
          ...body,
          rewardId: req.params.id,
          actorUserId: principal.userId,
        });
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/loyalty/liability", requireAuthenticatedUser, requireLoyaltyAccess, async (_req, res, next) => {
    try {
      const data = await deps.loyaltyDepth.getLiabilitySnapshot();
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/loyalty/expiry-policies", requireAuthenticatedUser, requireLoyaltyAccess, async (_req, res, next) => {
    try {
      const data = await deps.loyaltyDepth.listExpiryPolicies();
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/loyalty/expiry-policies",
    requireAuthenticatedUser,
    requireAnyPermission(["loyalty.manage", "admin.access"]),
    validateBody(
      z
        .object({
          id: z.string().uuid().optional(),
          name: z.string().trim().min(1).max(160),
          expireAfterDays: z.number().int().positive(),
          effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          isActive: z.boolean().optional(),
          valuationRule: z.enum(["none", "configured_rate"]).nullable().optional(),
          pointsToPkrRate: z.number().finite().positive().nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.loyaltyDepth.upsertExpiryPolicy(principal.userId, req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

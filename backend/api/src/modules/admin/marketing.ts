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
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  COUPON_DISCOUNT_TYPES,
  COUPON_STATUSES,
  type MarketingService,
} from "../../services/marketing/coupons.js";
import {
  DEPTH_CAMPAIGN_STATUSES,
  type MarketingDepthService,
} from "../../services/marketing/depth.js";

export interface AdminMarketingRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  marketing: MarketingService;
  marketingDepth: MarketingDepthService;
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
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    status: z.enum(COUPON_STATUSES).optional(),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    perCustomerLimit: z.number().int().positive().nullable().optional(),
  })
  .strict();

const patchCouponSchema = z
  .object({
    status: z.enum(COUPON_STATUSES).optional(),
    expiryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    minOrder: z.number().finite().min(0).optional(),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    perCustomerLimit: z.number().int().positive().nullable().optional(),
  })
  .strict();

const createCampaignSchema = z
  .object({
    branchId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(160),
    channel: z.enum(CAMPAIGN_CHANNELS),
    messageTemplate: z.string().trim().min(1).max(4000),
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();

const transitionCampaignSchema = z
  .object({
    status: z.enum(CAMPAIGN_STATUSES),
    cancelReason: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict();

const queueSchema = z
  .object({
    customerIds: z.array(z.string().uuid()).min(1).max(500),
  })
  .strict();

const suppressionSchema = z
  .object({
    customerId: z.string().uuid(),
    channel: z.enum(["whatsapp", "sms", "email", "push", "all"]),
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();

const consentSchema = z
  .object({
    marketingConsent: z.boolean(),
  })
  .strict();

/**
 * Marketing coupons, campaigns, consent/suppression (REQ-ADM-180 + RC3).
 */
export function createAdminMarketingRouter(deps: AdminMarketingRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireMarketingAccess = requireAnyPermission(["marketing.manage", "admin.access"]);

  router.get("/marketing/coupons", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
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
  });

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

  router.patch(
    "/marketing/coupons/:id",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(patchCouponSchema),
    async (req, res, next) => {
      try {
        const couponId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof patchCouponSchema>;
        const data = await deps.marketing.patchCoupon(scopeFrom(principal), couponId, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/marketing/coupons/validate", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const parsed = z
        .object({
          code: z.string().trim().min(1),
          branchId: z.string().uuid().nullable().optional(),
          subtotal: z.coerce.number().finite().min(0),
          customerId: z.string().uuid().optional(),
        })
        .safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid validate query.", parsed.error.flatten());
      }
      const data = await deps.marketing.validateCoupon({
        code: parsed.data.code,
        branchId: parsed.data.branchId ?? null,
        subtotal: parsed.data.subtotal,
        customerId: parsed.data.customerId,
      });
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/marketing/redemptions", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid redemptions query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.marketing.listRedemptions(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/marketing/campaigns", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid campaigns query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.marketing.listCampaigns(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/marketing/campaigns",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(createCampaignSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createCampaignSchema>;
        const data = await deps.marketing.createCampaign(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/marketing/campaigns/:id",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(transitionCampaignSchema),
    async (req, res, next) => {
      try {
        const campaignId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof transitionCampaignSchema>;
        const data = await deps.marketing.transitionCampaign(scopeFrom(principal), campaignId, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/marketing/campaigns/:id/queue",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(queueSchema),
    async (req, res, next) => {
      try {
        const campaignId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof queueSchema>;
        const data = await deps.marketingDepth.queueWithProviderGate(
          scopeFrom(principal),
          campaignId,
          body.customerIds,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/marketing/campaigns/:id/submissions",
    requireAuthenticatedUser,
    requireMarketingAccess,
    async (req, res, next) => {
      try {
        const campaignId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.marketing.listSubmissions(scopeFrom(principal), campaignId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/marketing/suppressions", requireAuthenticatedUser, requireMarketingAccess, async (_req, res, next) => {
    try {
      const data = await deps.marketing.listSuppressions();
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/marketing/suppressions",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(suppressionSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof suppressionSchema>;
        const data = await deps.marketing.upsertSuppression(principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/marketing/consent", requireAuthenticatedUser, requireMarketingAccess, async (_req, res, next) => {
    try {
      const data = await deps.marketing.listConsent();
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.patch(
    "/marketing/consent/:customerId",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(consentSchema),
    async (req, res, next) => {
      try {
        const customerId = z.string().uuid().parse(req.params.customerId);
        const body = req.body as z.infer<typeof consentSchema>;
        const data = await deps.marketing.setConsent(customerId, body.marketingConsent);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/marketing/attention", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid attention query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.marketing.getAttention(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  // —— RC4-11 depth ——
  router.get("/marketing/segments", requireAuthenticatedUser, requireMarketingAccess, async (_req, res, next) => {
    try {
      const data = await deps.marketingDepth.listSegments();
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/marketing/segments/:code/preview", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const data = await deps.marketingDepth.previewSegment(req.params.code);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/marketing/templates", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const channel =
        typeof req.query.channel === "string" && CAMPAIGN_CHANNELS.includes(req.query.channel as never)
          ? (req.query.channel as (typeof CAMPAIGN_CHANNELS)[number])
          : undefined;
      const data = await deps.marketingDepth.listTemplates(channel);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/marketing/templates",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(
      z
        .object({
          name: z.string().trim().min(1).max(160),
          channel: z.enum(CAMPAIGN_CHANNELS),
          language: z.string().trim().min(2).max(12).optional(),
          subject: z.string().trim().max(200).nullable().optional(),
          body: z.string().trim().min(1).max(8000),
          branchId: z.string().uuid().nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.marketingDepth.createTemplate(principal.userId, req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/marketing/campaigns/depth",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(
      z
        .object({
          branchId: z.string().uuid().nullable().optional(),
          name: z.string().trim().min(1).max(160),
          channel: z.enum(CAMPAIGN_CHANNELS),
          messageTemplate: z.string().trim().max(4000).optional(),
          templateId: z.string().uuid().nullable().optional(),
          segmentId: z.string().uuid().nullable().optional(),
          couponId: z.string().uuid().nullable().optional(),
          rewardId: z.string().uuid().nullable().optional(),
          objective: z.string().trim().max(500).nullable().optional(),
          scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
          budgetMetadata: z.record(z.string(), z.unknown()).optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.marketingDepth.createDepthCampaign(
          scopeFrom(principal),
          principal.userId,
          req.body,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/marketing/campaigns/:id/lifecycle",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(
      z
        .object({
          status: z.enum(DEPTH_CAMPAIGN_STATUSES),
          cancelReason: z.string().trim().min(1).max(2000).nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const campaignId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as {
          status: (typeof DEPTH_CAMPAIGN_STATUSES)[number];
          cancelReason?: string | null;
        };
        const data = await deps.marketingDepth.transitionDepthCampaign(
          scopeFrom(principal),
          principal.userId,
          campaignId,
          body.status,
          body.cancelReason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/marketing/attribution",
    requireAuthenticatedUser,
    requireMarketingAccess,
    validateBody(
      z
        .object({
          orderId: z.string().uuid(),
          sourceType: z.enum(["coupon", "campaign", "reward_redemption", "provider_ref"]),
          couponId: z.string().uuid().nullable().optional(),
          campaignId: z.string().uuid().nullable().optional(),
          rewardRedemptionId: z.string().uuid().nullable().optional(),
          providerMessageId: z.string().trim().min(1).max(200).nullable().optional(),
          attributableRevenue: z.number().finite().min(0).nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const data = await deps.marketingDepth.recordAttribution(req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/marketing/attribution/summary", requireAuthenticatedUser, requireMarketingAccess, async (req, res, next) => {
    try {
      const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : undefined;
      const data = await deps.marketingDepth.getAttributionSummary(campaignId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import {
  DEVICE_TYPES,
  EVIDENCE_TYPES,
  NOTIFICATION_CHANNEL_CODES,
  NOTIFICATION_PURPOSE_CODES,
  PAYMENT_METHOD_CODES,
  type OpeningOperationsService,
} from "../../services/opening/operations.js";

export interface AdminOpeningOperationsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  openingOperations: OpeningOperationsService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const branchQuerySchema = z.object({ branchId: z.string().uuid() });

const paymentMethodSchema = z
  .object({
    branchId: z.string().uuid(),
    methodCode: z.enum(PAYMENT_METHOD_CODES),
    displayName: z.string().trim().min(1).max(120),
    enabled: z.boolean(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const enabledSchema = z.object({ enabled: z.boolean() }).strict();

const providerUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    branchId: z.string().uuid(),
    paymentMethodId: z.string().uuid().optional().nullable(),
    providerName: z.string().trim().min(1).max(120),
    providerEnvironment: z.enum(["TEST", "SANDBOX", "PRODUCTION"]).optional(),
    terminalRequired: z.boolean().optional(),
    verificationMethod: z.string().trim().max(200).optional().nullable(),
  })
  .strict();

const providerVerifySchema = z
  .object({
    summary: z.string().trim().min(1).max(2000),
    expiresAt: z.string().datetime().optional().nullable(),
    terminalVerified: z.boolean().optional(),
  })
  .strict();

const reasonSchema = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();

const cardTerminalSchema = z
  .object({
    id: z.string().uuid().optional(),
    branchId: z.string().uuid(),
    terminalLabel: z.string().trim().min(1).max(120),
    terminalProvider: z.string().trim().max(120).optional().nullable(),
    physicalLocation: z.string().trim().max(200).optional().nullable(),
    evidenceType: z.enum(EVIDENCE_TYPES),
    verificationNote: z.string().trim().max(2000).optional().nullable(),
    recheckDueAt: z.string().datetime().optional().nullable(),
  })
  .strict();

const cashProcedureSchema = z
  .object({
    branchId: z.string().uuid(),
    procedureDocumented: z.boolean().optional(),
    procedureReviewed: z.boolean().optional(),
    cashDrawerProcessApproved: z.boolean().optional(),
    shiftReconciliationApproved: z.boolean().optional(),
    discrepancyEscalationDefined: z.boolean().optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const notificationChannelSchema = z
  .object({
    branchId: z.string().uuid(),
    purposeCode: z.enum(NOTIFICATION_PURPOSE_CODES),
    channelCode: z.enum(NOTIFICATION_CHANNEL_CODES),
    enabled: z.boolean(),
    providerName: z.string().trim().max(120).optional().nullable(),
    destinationReference: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const localTestSchema = z.object({ passed: z.boolean() }).strict();

const deviceUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    branchId: z.string().uuid(),
    deviceType: z.enum(DEVICE_TYPES),
    deviceLabel: z.string().trim().min(1).max(150),
    location: z.string().trim().max(200).optional().nullable(),
    serialOrAssetReference: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const deviceVerifySchema = z
  .object({
    evidenceType: z.enum(EVIDENCE_TYPES),
    evidenceSummary: z.string().trim().min(1).max(2000),
    expiresAt: z.string().datetime().optional().nullable(),
    recheckDueAt: z.string().datetime().optional().nullable(),
  })
  .strict();

export function createAdminOpeningOperationsRouter(
  dependencies: AdminOpeningOperationsRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );
  const service = dependencies.openingOperations;

  router.get("/opening/payment-methods", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listPaymentMethods(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/payment-methods",
    requireAuthenticatedUser,
    validateBody(paymentMethodSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof paymentMethodSchema>;
        const row = await service.upsertPaymentMethod(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/opening/payment-methods/:id/enabled",
    requireAuthenticatedUser,
    validateBody(enabledSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof enabledSchema>;
        const row = await service.setPaymentMethodEnabled(principal, req.params.id, body.enabled);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/payment-providers", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listProviderVerifications(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/payment-providers",
    requireAuthenticatedUser,
    validateBody(providerUpsertSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof providerUpsertSchema>;
        const row = await service.upsertProviderVerification(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/payment-providers/:id/verify",
    requireAuthenticatedUser,
    validateBody(providerVerifySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof providerVerifySchema>;
        const row = await service.recordProviderVerification(principal, req.params.id, body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/payment-providers/:id/fail",
    requireAuthenticatedUser,
    validateBody(reasonSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof reasonSchema>;
        const row = await service.recordProviderFailure(principal, req.params.id, body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/card-terminals", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listCardTerminals(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/card-terminals",
    requireAuthenticatedUser,
    validateBody(cardTerminalSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof cardTerminalSchema>;
        const row = await service.recordCardTerminalVerification(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/card-terminals/:id/fail",
    requireAuthenticatedUser,
    validateBody(reasonSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof reasonSchema>;
        const row = await service.recordCardTerminalFailure(principal, req.params.id, body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/cash-procedure", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const row = await service.getCashProcedure(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.put(
    "/opening/cash-procedure",
    requireAuthenticatedUser,
    validateBody(cashProcedureSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof cashProcedureSchema>;
        const row = await service.upsertCashProcedure(principal, body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/cash-procedure/:branchId/approve",
    requireAuthenticatedUser,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const branchId = z.string().uuid().parse(req.params.branchId);
        const row = await service.approveCashProcedure(principal, branchId);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/notification-channels", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listNotificationChannels(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/notification-channels",
    requireAuthenticatedUser,
    validateBody(notificationChannelSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof notificationChannelSchema>;
        const row = await service.upsertNotificationChannel(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/notification-channels/:id/local-test",
    requireAuthenticatedUser,
    validateBody(localTestSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof localTestSchema>;
        const row = await service.recordNotificationLocalTest(principal, req.params.id, body.passed);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/notification-channels/:id/verify",
    requireAuthenticatedUser,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.recordNotificationVerified(principal, req.params.id);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/notification-channels/:id/fail",
    requireAuthenticatedUser,
    validateBody(reasonSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof reasonSchema>;
        const row = await service.recordNotificationFailure(principal, req.params.id, body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/devices/missing", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const missing = await service.listMissingRequiredDeviceTypes(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: missing });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/opening/devices", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listDevices(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/devices",
    requireAuthenticatedUser,
    validateBody(deviceUpsertSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof deviceUpsertSchema>;
        const row = await service.upsertDevice(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/devices/:id/verify",
    requireAuthenticatedUser,
    validateBody(deviceVerifySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof deviceVerifySchema>;
        const row = await service.recordDeviceVerification(principal, req.params.id, body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/devices/:id/fail",
    requireAuthenticatedUser,
    validateBody(reasonSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof reasonSchema>;
        const row = await service.recordDeviceFailure(principal, req.params.id, body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/opening/devices/:id/expire", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.markDeviceExpired(principal, req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

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
import type { BookingPolicyService } from "../../services/reservations/booking-policy.js";

export interface AdminBookingPolicyRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  bookingPolicy: BookingPolicyService;
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

const draftSchema = z
  .object({
    branchId: z.string().uuid(),
    bookingEnabled: z.boolean().optional(),
    onlineBookingEnabled: z.boolean().optional(),
    minimumPartySize: z.number().int().min(1).max(100).optional(),
    maximumPartySize: z.number().int().min(1).max(100).optional(),
    bookingIntervalMinutes: z.number().int().min(5).max(240).optional(),
    minimumAdvanceMinutes: z.number().int().min(0).max(10080).optional(),
    maximumAdvanceDays: z.number().int().min(1).max(365).optional(),
    cancellationWindowMinutes: z.number().int().min(0).max(10080).optional(),
    gracePeriodMinutes: z.number().int().min(0).max(480).optional(),
    tableHoldMinutes: z.number().int().min(0).max(240).optional(),
    waitlistEnabled: z.boolean().optional(),
    sameDayBookingEnabled: z.boolean().optional(),
    specialNotes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

const updateDraftSchema = draftSchema.omit({ branchId: true });

export function createAdminBookingPolicyRouter(
  dependencies: AdminBookingPolicyRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );
  const service = dependencies.bookingPolicy;

  router.get("/booking-policies/current", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const row = await service.getCurrent(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/booking-policies", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listVersions(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/booking-policies",
    requireAuthenticatedUser,
    validateBody(draftSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof draftSchema>;
        const row = await service.createDraft(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/booking-policies/:id",
    requireAuthenticatedUser,
    validateBody(updateDraftSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof updateDraftSchema>;
        const row = await service.updateDraft(principal, req.params.id, body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/booking-policies/:id/submit", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.submitForReview(principal, req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/booking-policies/:id/approve", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.approve(principal, req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/booking-policies/:id/activate", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.activate(principal, req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/booking-policies/:id/retire", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.retire(principal, req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

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
import type { BranchActorScope } from "../../services/tables/management.js";
import {
  BOOKING_CHANNELS,
  RESERVATION_STATUSES,
  WAITLIST_STATUSES,
  type ReservationsService,
} from "../../services/reservations/management.js";

/**
 * D3 — reservations + waitlist APIs.
 * Reads: reservation.read. Mutations: reservation.manage. Seating: dinein.manage.
 */

export interface AdminReservationsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  reservations: ReservationsService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

function readIdempotencyKey(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof raw === "string" ? raw.trim() : "";
}

const availabilityQuerySchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.coerce.number().int().positive().max(100),
  durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
  areaId: z.string().uuid().optional(),
  accessibleOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const createReservationSchema = z
  .object({
    branchId: z.string().uuid(),
    guestName: z.string().trim().min(1).max(150),
    guestPhone: z.string().trim().max(30).optional().nullable(),
    guestEmail: z.string().trim().max(255).optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    startAt: z.string().min(10),
    expectedEndAt: z.string().min(10).optional().nullable(),
    partySize: z.number().int().positive().max(100),
    adults: z.number().int().min(0).optional().nullable(),
    children: z.number().int().min(0).optional().nullable(),
    highChairCount: z.number().int().min(0).max(20).optional(),
    accessibilityRequired: z.boolean().optional(),
    preferredFloorId: z.string().uuid().optional().nullable(),
    preferredAreaId: z.string().uuid().optional().nullable(),
    bookingChannel: z.enum(BOOKING_CHANNELS).optional(),
    reservationStatus: z.enum(["inquiry", "pending", "confirmed"]).optional(),
    specialRequests: z.string().trim().max(1000).optional().nullable(),
    internalNotes: z.string().trim().max(1000).optional().nullable(),
    tableIds: z.array(z.string().uuid()).max(10).optional(),
    overrideCapacity: z.boolean().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  branchId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const updateReservationSchema = z
  .object({
    guestName: z.string().trim().min(1).max(150).optional(),
    guestPhone: z.string().trim().max(30).optional().nullable(),
    guestEmail: z.string().trim().max(255).optional().nullable(),
    partySize: z.number().int().positive().max(100).optional(),
    specialRequests: z.string().trim().max(1000).optional().nullable(),
    internalNotes: z.string().trim().max(1000).optional().nullable(),
    highChairCount: z.number().int().min(0).max(20).optional(),
    accessibilityRequired: z.boolean().optional(),
  })
  .strict();

const reasonSchema = z.object({ reason: z.string().trim().max(300).optional() }).strict();

const assignTablesSchema = z
  .object({
    tableIds: z.array(z.string().uuid()).min(1).max(10),
    overrideCapacity: z.boolean().optional(),
  })
  .strict();

const seatSchema = z
  .object({
    tableIds: z.array(z.string().uuid()).min(1).max(10),
    serverUserId: z.string().uuid().optional().nullable(),
    overrideCapacity: z.boolean().optional(),
  })
  .strict();

const addWaitlistSchema = z
  .object({
    branchId: z.string().uuid(),
    guestName: z.string().trim().min(1).max(150),
    guestPhone: z.string().trim().max(30).optional().nullable(),
    partySize: z.number().int().positive().max(100),
    requestedAreaId: z.string().uuid().optional().nullable(),
    accessibilityRequired: z.boolean().optional(),
    highChairCount: z.number().int().min(0).max(20).optional(),
    quotedWaitMinutes: z.number().int().min(0).max(600).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const waitlistListQuerySchema = z.object({
  branchId: z.string().uuid(),
  status: z.enum(WAITLIST_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const updateWaitlistSchema = z
  .object({
    quotedWaitMinutes: z.number().int().min(0).max(600).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    partySize: z.number().int().positive().max(100).optional(),
  })
  .strict();

const reportQuerySchema = z.object({
  branchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function createAdminReservationsRouter(deps: AdminReservationsRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  // ---------------------------------------------------------------- reservations

  router.get(
    "/availability",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = availabilityQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid availability query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.reservations.searchAvailability(scopeFrom(principal), parsed.data);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/reports/daily",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = reportQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId and date are required.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.reservations.getDailyReport(
          scopeFrom(principal),
          parsed.data.branchId,
          parsed.data.date,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(createReservationSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const idempotencyKey = readIdempotencyKey(req.header("idempotency-key"));
        if (!idempotencyKey) {
          throw new ApiError(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "Idempotency-Key header is required for reservation creation.",
          );
        }
        if (idempotencyKey.length > 100) {
          throw new ApiError(400, "VALIDATION_ERROR", "Idempotency-Key is too long.");
        }
        const result = await deps.reservations.createReservation(scopeFrom(principal), {
          ...req.body,
          idempotencyKey,
        });
        return res.status(result.idempotentReplay ? 200 : 201).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid list query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.reservations.listReservations(scopeFrom(principal), {
          branchId: parsed.data.branchId,
          date: parsed.data.date,
          status: parsed.data.status,
          limit: parsed.data.limit ?? 50,
          offset: parsed.data.offset ?? 0,
        });
        return res.json({
          ok: true,
          data: result.reservations,
          meta: { total: result.total },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/:id",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const reservation = await deps.reservations.getReservation(scopeFrom(principal), req.params.id);
        return res.json({ ok: true, data: reservation });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/:id",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(updateReservationSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const reservation = await deps.reservations.updateReservation(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: reservation });
      } catch (error) {
        return next(error);
      }
    },
  );

  for (const action of ["confirm", "cancel", "arrive", "no-show", "decline", "complete"] as const) {
    router.post(
      `/:id/${action}`,
      requireAuthenticatedUser,
      requirePermission("reservation.manage"),
      validateBody(reasonSchema),
      async (req, res, next) => {
        try {
          const principal = (req as AuthorizedRequest).principal!;
          const reservation = await deps.reservations.transitionReservation(
            scopeFrom(principal),
            req.params.id,
            action === "no-show" ? "no_show" : action,
            { reason: req.body.reason },
          );
          return res.json({ ok: true, data: reservation });
        } catch (error) {
          return next(error);
        }
      },
    );
  }

  router.post(
    "/:id/tables",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(assignTablesSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const reservation = await deps.reservations.assignTables(
          scopeFrom(principal),
          req.params.id,
          req.body.tableIds,
          req.body.overrideCapacity ?? false,
        );
        return res.json({ ok: true, data: reservation });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/:id/seat",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(seatSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const session = await deps.reservations.seatReservation(scopeFrom(principal), req.params.id, req.body);
        return res.status(201).json({ ok: true, data: session });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

export function createAdminWaitlistRouter(deps: AdminReservationsRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.post(
    "/",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(addWaitlistSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const entry = await deps.reservations.addWaitlistEntry(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data: entry });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/",
    requireAuthenticatedUser,
    requirePermission("reservation.read"),
    async (req, res, next) => {
      try {
        const parsed = waitlistListQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid waitlist query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.reservations.listWaitlist(scopeFrom(principal), {
          branchId: parsed.data.branchId,
          status: parsed.data.status,
          limit: parsed.data.limit ?? 50,
          offset: parsed.data.offset ?? 0,
        });
        return res.json({ ok: true, data: result.entries, meta: { total: result.total } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/:id",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(updateWaitlistSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const entry = await deps.reservations.updateWaitlistEntry(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data: entry });
      } catch (error) {
        return next(error);
      }
    },
  );

  for (const action of ["notify", "arrive", "cancel", "left", "expire"] as const) {
    router.post(
      `/:id/${action}`,
      requireAuthenticatedUser,
      requirePermission("reservation.manage"),
      async (req, res, next) => {
        try {
          const principal = (req as AuthorizedRequest).principal!;
          const entry = await deps.reservations.transitionWaitlistEntry(
            scopeFrom(principal),
            req.params.id,
            action,
          );
          return res.json({ ok: true, data: entry });
        } catch (error) {
          return next(error);
        }
      },
    );
  }

  router.post(
    "/:id/seat",
    requireAuthenticatedUser,
    requirePermission("dinein.manage"),
    validateBody(seatSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const session = await deps.reservations.seatWaitlistEntry(
          scopeFrom(principal),
          req.params.id,
          req.body,
        );
        return res.status(201).json({ ok: true, data: session });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import type { PublicBookingService } from "../../services/reservations/public-booking.js";
import { publicBookingRateLimitMiddleware } from "../../services/reservations/public-booking-rate-limit.js";

export interface PublicBookingRouterDependencies {
  publicBooking: PublicBookingService;
}

const availabilityQuerySchema = z.object({
  branchCode: z.string().trim().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.coerce.number().int().positive().max(100),
});

const createBodySchema = z
  .object({
    branchCode: z.string().trim().min(1).max(80),
    guestName: z.string().trim().min(1).max(150),
    guestPhone: z.string().trim().min(7).max(30),
    guestEmail: z.string().trim().email().max(255).optional().nullable(),
    partySize: z.number().int().positive().max(100),
    startAt: z.string().min(10).max(64),
    accessibilityRequired: z.boolean().optional(),
    highChairCount: z.number().int().min(0).max(20).optional(),
    specialRequests: z.string().trim().max(1000).optional().nullable(),
    privacyAccepted: z.literal(true),
  })
  .strict();

const cancelBodySchema = z
  .object({
    cancellationToken: z.string().trim().min(16).max(256),
  })
  .strict();

function readIdempotencyKey(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof raw === "string" ? raw.trim() : "";
}

function readCancellationToken(req: {
  query: Record<string, unknown>;
  header: (name: string) => string | undefined;
}): string {
  const fromQuery = req.query.token ?? req.query.cancellationToken;
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();
  const fromHeader = req.header("x-cancellation-token");
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader.trim();
  return "";
}

export function createPublicBookingRouter(dependencies: PublicBookingRouterDependencies) {
  const router = Router();

  router.get(
    "/availability",
    publicBookingRateLimitMiddleware("availability"),
    async (req, res, next) => {
      try {
        const parsed = availabilityQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", parsed.error.flatten());
        }
        const data = await dependencies.publicBooking.searchPublicAvailability(parsed.data);
        // Hard leak guard — public responses must never include table IDs.
        const serialized = JSON.stringify(data);
        if (/tableId|table_id|combinationId/i.test(serialized)) {
          throw new ApiError(500, "AVAILABILITY_LEAK", "Refusing to return internal table identifiers.");
        }
        return res.status(200).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/",
    publicBookingRateLimitMiddleware("create"),
    validateBody(createBodySchema),
    async (req, res, next) => {
      try {
        const idempotencyKey = readIdempotencyKey(req.headers["idempotency-key"]);
        if (!idempotencyKey) {
          throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.");
        }
        const body = req.body as z.infer<typeof createBodySchema>;
        const data = await dependencies.publicBooking.createPublicReservation({
          ...body,
          idempotencyKey,
        });
        const status = data.idempotentReplay ? 200 : 201;
        return res.status(status).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/:reservationNumber/cancel",
    publicBookingRateLimitMiddleware("cancel"),
    validateBody(cancelBodySchema),
    async (req, res, next) => {
      try {
        const reservationNumber = req.params.reservationNumber;
        if (typeof reservationNumber !== "string" || !reservationNumber.trim()) {
          throw new ApiError(404, "NOT_FOUND", "Reservation not found.");
        }
        const body = req.body as z.infer<typeof cancelBodySchema>;
        const data = await dependencies.publicBooking.cancelPublicReservation({
          reservationNumber,
          cancellationToken: body.cancellationToken,
        });
        return res.status(200).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/:reservationNumber",
    publicBookingRateLimitMiddleware("status"),
    async (req, res, next) => {
      try {
        const reservationNumber = req.params.reservationNumber;
        if (typeof reservationNumber !== "string" || !reservationNumber.trim()) {
          throw new ApiError(404, "NOT_FOUND", "Reservation not found.");
        }
        const cancellationToken = readCancellationToken(req);
        if (!cancellationToken) {
          throw new ApiError(404, "NOT_FOUND", "Reservation not found.");
        }
        const data = await dependencies.publicBooking.getPublicReservationStatus({
          reservationNumber,
          cancellationToken,
        });
        return res.status(200).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import { dineInResolveRateLimitMiddleware } from "../../services/dine-in/resolve-rate-limit.js";
import type {
  DineInSessionsService,
  SafePublicDineInSession,
} from "../../services/dine-in/sessions.js";

export interface DineInRouterDependencies {
  dineInSessions: DineInSessionsService;
}

const resolveBodySchema = z
  .object({
    qrToken: z.string().trim().min(16).max(512),
    guestCount: z.number().int().positive().max(50).optional().nullable(),
  })
  .strict();

/** Strip accidental internal/hash fields from public responses. */
function toSafeResponse(session: SafePublicDineInSession) {
  return {
    publicToken: session.publicToken,
    status: session.status,
    guestCount: session.guestCount,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    table: {
      tableNumber: session.table.tableNumber,
      displayName: session.table.displayName,
      capacity: session.table.capacity,
      floorOrZone: session.table.floorOrZone,
    },
    branch: {
      id: session.branch.id,
      code: session.branch.code,
      name: session.branch.name,
      city: session.branch.city,
    },
  };
}

export function createDineInRouter(dependencies: DineInRouterDependencies) {
  const router = Router();

  router.post(
    "/sessions/resolve",
    dineInResolveRateLimitMiddleware,
    validateBody(resolveBodySchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof resolveBodySchema>;
        const session = await dependencies.dineInSessions.resolveSession({
          qrToken: body.qrToken,
          guestCount: body.guestCount ?? null,
        });
        const safe = toSafeResponse(session);
        const payload = JSON.stringify(safe);
        if (/public_token_hash|tokenHash|qr_token_hash/i.test(payload)) {
          throw new ApiError(500, "SESSION_RESPONSE_LEAK", "Refusing to return secret fields.");
        }
        return res.status(200).json({ ok: true, data: safe });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/sessions/:publicToken", async (req, res, next) => {
    try {
      const publicToken = req.params.publicToken;
      if (typeof publicToken !== "string" || !publicToken.trim()) {
        throw new ApiError(404, "SESSION_NOT_FOUND", "Dine-in session not found.");
      }
      const session = await dependencies.dineInSessions.getSessionByPublicToken(publicToken);
      const safe = toSafeResponse(session);
      const payload = JSON.stringify(safe);
      if (/public_token_hash|tokenHash|qr_token_hash/i.test(payload)) {
        throw new ApiError(500, "SESSION_RESPONSE_LEAK", "Refusing to return secret fields.");
      }
      return res.status(200).json({ ok: true, data: safe });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

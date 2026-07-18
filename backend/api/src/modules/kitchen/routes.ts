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
  KITCHEN_TICKET_STATUSES,
  type KitchenActorScope,
  type KitchenTicketsService,
} from "../../services/kitchen/tickets.js";

export interface KitchenRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  kitchenTickets: KitchenTicketsService;
}

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(KITCHEN_TICKET_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const statusBodySchema = z
  .object({
    status: z.enum(KITCHEN_TICKET_STATUSES),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

function scopeFrom(principal: AuthPrincipal): KitchenActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

export function createKitchenRouter(deps: KitchenRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get("/tickets", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid list query parameters.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const result = await deps.kitchenTickets.listTickets(scopeFrom(principal), {
        branchId: parsed.data.branchId,
        status: parsed.data.status,
        limit: parsed.data.limit ?? 50,
        offset: parsed.data.offset ?? 0,
      });
      return res.json({
        ok: true,
        data: result.tickets,
        meta: { pagination: result.pagination },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.patch(
    "/tickets/:id/status",
    requireAuthenticatedUser,
    validateBody(statusBodySchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof statusBodySchema>;
        const result = await deps.kitchenTickets.transitionTicket({
          scope: scopeFrom(principal),
          ticketId: req.params.id,
          toStatus: body.status,
          note: body.note,
        });
        return res.status(200).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

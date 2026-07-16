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
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  type BranchOrderAction,
} from "../../services/orders/transitions.js";
import type {
  BranchActorScope,
  BranchOrderManagementDataSource,
} from "../../services/orders/management.js";

export interface AdminOrdersRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  branchOrderManagement: BranchOrderManagementDataSource;
}

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  orderType: z.enum(ORDER_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const transitionBodySchema = z
  .object({
    reasonCode: z.string().trim().min(1).max(50).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

export function createAdminOrdersRouter(deps: AdminOrdersRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  // Sprint 4.5 access model: the branch order-management surface (reads + transitions) is
  // gated by `order.manage` — the capability held by branch-manager, cashier, kitchen and
  // super-admin. This intentionally excludes rider and customer-support (who hold only
  // `order.read` for delivery/support tracking) from the branch dashboard, per the approved
  // actor list. It is stricter than the frozen §4.1 read note by design.
  router.get("/", requireAuthenticatedUser, requirePermission("order.manage"), async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid list query parameters.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const result = await deps.branchOrderManagement.listBranchOrders(scopeFrom(principal), {
        branchId: parsed.data.branchId,
        status: parsed.data.status,
        orderType: parsed.data.orderType,
        limit: parsed.data.limit ?? 20,
        offset: parsed.data.offset ?? 0,
      });
      return res.json({ ok: true, data: result.orders, meta: { pagination: result.pagination } });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", requireAuthenticatedUser, requirePermission("order.manage"), async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const detail = await deps.branchOrderManagement.getBranchOrderDetail(
        scopeFrom(principal),
        req.params.id,
      );
      return res.json({ ok: true, data: detail });
    } catch (error) {
      return next(error);
    }
  });

  // Transitions require order.manage + branch scope; role/state rules enforced in the state machine.
  const transition = (action: BranchOrderAction) =>
    async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof transitionBodySchema>;
        const result = await deps.branchOrderManagement.transitionOrder({
          scope: scopeFrom(principal),
          orderId: req.params.id,
          action,
          reasonCode: body.reasonCode,
          note: body.note,
        });
        return res.status(200).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    };

  for (const action of ["confirm", "reject", "preparing", "ready", "cancel"] as const) {
    router.post(
      `/:id/${action}`,
      requireAuthenticatedUser,
      requirePermission("order.manage"),
      validateBody(transitionBodySchema),
      transition(action),
    );
  }

  return router;
}

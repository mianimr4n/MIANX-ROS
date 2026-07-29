import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import {
  createRequireAuthenticatedUser,
  requirePermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import {
  assertBranchMembership,
  assertBranchOperational,
} from "../../services/branches/operational-status.js";
import { loadBranchByCode } from "../../services/branches/lookup.js";
import type { OrdersDataSource } from "../../services/orders/types.js";
import { createClient } from "@supabase/supabase-js";
import type { EnvironmentStatus } from "../../config/env.js";

const orderItemSchema = z
  .object({
    /** Preferred: exact sellable SKU. */
    menuItemId: z.string().uuid().optional(),
    /** Canonical SKU slug, or a legacy product-family slug. */
    menuItemSlug: z.string().min(1).max(100).optional(),
    /** LEGACY size hint; not required for new orders. */
    variantLabel: z.string().max(100).optional(),
    quantity: z.number().int().positive().max(20),
    unitPrice: z.number().nonnegative().optional(),
    productName: z.string().min(1).max(150).optional(),
    variantName: z.string().max(100).optional(),
    instructions: z.string().max(250).optional(),
    toppings: z.array(z.object({ slug: z.string().min(1).max(100) })).max(20).optional(),
    extras: z
      .array(
        z.object({
          label: z.string().min(1).max(100).optional(),
          slug: z.string().min(1).max(100).optional(),
          price: z.number().nonnegative().optional(),
        }),
      )
      .max(20)
      .optional(),
    modifiers: z
      .array(
        z.object({
          groupCode: z.string().min(1).max(80),
          optionCode: z.string().min(1).max(80),
        }),
      )
      .max(40)
      .optional(),
  })
  .refine((item) => Boolean(item.menuItemId ?? item.menuItemSlug), {
    message: "Each item requires menuItemId or menuItemSlug.",
    path: ["menuItemId"],
  });

const createPosOrderSchema = z.object({
  branchCode: z.string().min(2).max(100),
  orderType: z.enum(["delivery", "pickup", "dine-in"]),
  contactName: z.string().min(2).max(150),
  contactPhone: z.string().min(7).max(30),
  deliveryAddress: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
  quoteId: z.string().max(4096).optional(),
  /**
   * Launch payment contract: cash only at place-order.
   * Pickup cash → paid; delivery cash → pending COD; dine-in cash → pending until bill settle.
   */
  paymentMethod: z.literal("cash").optional().default("cash"),
  /** D3 — attach the order to an active dining session (dine-in only). */
  diningSessionId: z.string().uuid().optional(),
  items: z.array(orderItemSchema).min(1).max(50),
});

export interface AdminPosRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  ordersDataSource: OrdersDataSource;
  envStatus: EnvironmentStatus;
}

function readIdempotencyKey(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Authenticated POS order create.
 *
 * Public `POST /orders` with orderSource=pos is rejected without staff auth.
 * This route is the canonical cashier path: membership + operating status required.
 */
export function createAdminPosRouter(deps: AdminPosRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.post(
    "/orders",
    requireAuthenticatedUser,
    requirePermission("order.manage"),
    validateBody(createPosOrderSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal;
        if (!principal) {
          throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
        }

        const body = req.body as z.infer<typeof createPosOrderSchema>;
        const idempotencyKey = readIdempotencyKey(req.header("idempotency-key"));
        if (!idempotencyKey) {
          throw new ApiError(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "Idempotency-Key header is required for POS order creation.",
          );
        }
        if (idempotencyKey.length > 100) {
          throw new ApiError(400, "VALIDATION_ERROR", "Idempotency-Key is too long.");
        }
        if (body.orderType === "delivery" && !body.deliveryAddress?.trim()) {
          throw new ApiError(
            400,
            "DELIVERY_ADDRESS_REQUIRED",
            "Delivery address is required for delivery orders.",
          );
        }
        if (body.diningSessionId && body.orderType !== "dine-in") {
          throw new ApiError(
            400,
            "DINE_IN_SESSION_ORDER_TYPE_MISMATCH",
            "diningSessionId is only valid for dine-in orders.",
          );
        }

        if (!deps.envStatus.isReady) {
          throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
        }
        const supabase = createClient(
          deps.envStatus.config.supabaseUrl,
          deps.envStatus.config.supabaseServiceRoleKey,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const branch = await loadBranchByCode(supabase, body.branchCode);
        assertBranchMembership(
          { isSuperAdmin: principal.isSuperAdmin, branchIds: principal.branchIds },
          branch.id,
        );
        assertBranchOperational(branch.status);

        const order = await deps.ordersDataSource.createOrder({
          ...body,
          orderSource: "pos",
          idempotencyKey,
          authUserId: principal.authUserId,
        });

        return res.status(order.idempotentReplay ? 200 : 201).json({ ok: true, data: order });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

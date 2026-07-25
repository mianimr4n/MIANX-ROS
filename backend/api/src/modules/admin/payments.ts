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
  PAYMENT_METHODS,
  SPLIT_STRATEGIES,
  type PaymentSettlementService,
} from "../../services/payments/settlement.js";
import {
  DEPOSIT_METHODS,
  type DepositService,
} from "../../services/reservations/deposits.js";

/**
 * D3 corrective — payment settlement, bill splits, and reservation deposits.
 *
 * Permissions:
 *   - payment.settle → settle a bill, split a bill, read balances / session payments
 *   - payment.void   → void a payment
 *   - deposit.manage → record / waive / forfeit / refund / apply reservation deposits
 */

export interface AdminPaymentsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  paymentSettlement: PaymentSettlementService;
  depositService: DepositService;
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

const settleSchema = z
  .object({
    branchId: z.string().uuid(),
    billId: z.string().uuid(),
    amount: z.number().positive().max(100_000_000),
    method: z.enum(PAYMENT_METHODS),
    cashTendered: z.number().min(0).max(100_000_000).optional().nullable(),
    externalReference: z.string().trim().max(150).optional().nullable(),
    terminalDeviceRef: z.string().trim().max(150).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
    currency: z.string().trim().length(3).optional().nullable(),
  })
  .strict();

const splitSchema = z
  .object({
    billId: z.string().uuid(),
    strategy: z.enum(SPLIT_STRATEGIES),
    partyCount: z.number().int().min(1).max(50).optional(),
    amounts: z.array(z.number().min(0).max(100_000_000)).min(1).max(50).optional(),
    itemGroups: z
      .array(
        z.object({
          label: z.string().trim().max(120).optional().nullable(),
          orderItemIds: z.array(z.string().uuid()).max(200).optional(),
          items: z
            .array(
              z.object({
                orderItemId: z.string().uuid(),
                quantity: z.number().int().min(1).max(1000),
              }),
            )
            .max(200)
            .optional(),
        }),
      )
      .min(1)
      .max(50)
      .optional(),
  })
  .strict();

const voidSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict();

const recordDepositSchema = z
  .object({
    reservationId: z.string().uuid(),
    amount: z.number().positive().max(100_000_000),
    method: z.enum(DEPOSIT_METHODS),
    externalReference: z.string().trim().max(150).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const depositReasonSchema = z.object({ reason: z.string().trim().min(1).max(500) }).strict();

const applyDepositSchema = z.object({ billId: z.string().uuid() }).strict();

export function createAdminPaymentsRouter(deps: AdminPaymentsRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  // ------------------------------------------------------------- settlement

  router.post(
    "/settle",
    requireAuthenticatedUser,
    requirePermission("payment.settle"),
    validateBody(settleSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const idempotencyKey = readIdempotencyKey(req.header("idempotency-key"));
        if (!idempotencyKey) {
          throw new ApiError(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "Idempotency-Key header is required to settle a payment.",
          );
        }
        if (idempotencyKey.length > 100) {
          throw new ApiError(400, "VALIDATION_ERROR", "Idempotency-Key is too long.");
        }
        const body = req.body as {
          branchId: string;
          billId: string;
          amount: number;
          method: (typeof PAYMENT_METHODS)[number];
          cashTendered?: number | null;
          externalReference?: string | null;
          terminalDeviceRef?: string | null;
          note?: string | null;
          currency?: string | null;
        };
        const result = await deps.paymentSettlement.settleBillPayment(scopeFrom(principal), {
          branchId: body.branchId,
          restaurantBillId: body.billId,
          amount: body.amount,
          method: body.method,
          cashTendered: body.cashTendered ?? undefined,
          externalReference: body.externalReference ?? undefined,
          terminalDeviceRef: body.terminalDeviceRef ?? undefined,
          note: body.note ?? undefined,
          currency: body.currency ?? undefined,
          idempotencyKey,
        });
        return res.status(result.idempotentReplay ? 200 : 201).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/split",
    requireAuthenticatedUser,
    requirePermission("payment.settle"),
    validateBody(splitSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.paymentSettlement.splitBill(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/bills/:billId/balance",
    requireAuthenticatedUser,
    requirePermission("payment.settle"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.paymentSettlement.getBillBalance(
          scopeFrom(principal),
          req.params.billId,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/sessions/:sessionId",
    requireAuthenticatedUser,
    requirePermission("payment.settle"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.paymentSettlement.listSessionPayments(
          scopeFrom(principal),
          req.params.sessionId,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/:paymentId/void",
    requireAuthenticatedUser,
    requirePermission("payment.void"),
    validateBody(voidSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.paymentSettlement.voidPayment(
          scopeFrom(principal),
          req.params.paymentId,
          req.body.reason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --------------------------------------------------------------- deposits

  router.post(
    "/deposits",
    requireAuthenticatedUser,
    requirePermission("deposit.manage"),
    validateBody(recordDepositSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const idempotencyKey = readIdempotencyKey(req.header("idempotency-key"));
        if (!idempotencyKey) {
          throw new ApiError(
            400,
            "IDEMPOTENCY_KEY_REQUIRED",
            "Idempotency-Key header is required to record a deposit.",
          );
        }
        if (idempotencyKey.length > 100) {
          throw new ApiError(400, "VALIDATION_ERROR", "Idempotency-Key is too long.");
        }
        const data = await deps.depositService.recordDeposit(scopeFrom(principal), {
          ...req.body,
          idempotencyKey,
        });
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/deposits/:reservationId",
    requireAuthenticatedUser,
    requirePermission("deposit.manage"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.depositService.getDeposit(
          scopeFrom(principal),
          req.params.reservationId,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  for (const action of ["waive", "forfeit", "refund"] as const) {
    router.post(
      `/deposits/:reservationId/${action}`,
      requireAuthenticatedUser,
      requirePermission("deposit.manage"),
      validateBody(depositReasonSchema),
      async (req, res, next) => {
        try {
          const principal = (req as AuthorizedRequest).principal!;
          const scope = scopeFrom(principal);
          const payload = { reservationId: req.params.reservationId, reason: req.body.reason };
          const data =
            action === "waive"
              ? await deps.depositService.waiveDeposit(scope, payload)
              : action === "forfeit"
                ? await deps.depositService.forfeitDeposit(scope, payload)
                : await deps.depositService.refundDeposit(scope, payload);
          return res.json({ ok: true, data });
        } catch (error) {
          return next(error);
        }
      },
    );
  }

  router.post(
    "/deposits/:reservationId/apply",
    requireAuthenticatedUser,
    requirePermission("deposit.manage"),
    validateBody(applyDepositSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.depositService.applyDepositToBill(scopeFrom(principal), {
          reservationId: req.params.reservationId,
          billId: req.body.billId,
        });
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

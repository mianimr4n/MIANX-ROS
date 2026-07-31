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
  ACCOUNT_TYPES,
  JOURNAL_STATUSES,
  type FinanceService,
} from "../../services/finance/management.js";
import {
  MAPPING_PURPOSES,
  type FinanceOperationsService,
} from "../../services/finance/operations.js";

export interface AdminFinanceRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  finance: FinanceService;
  financeOperations: FinanceOperationsService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

function readIdempotencyKey(req: { header(name: string): string | undefined }): string | null {
  const raw = req.header("idempotency-key") ?? req.header("Idempotency-Key");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null;
}

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

const createAccountSchema = z
  .object({
    branchId: z.string().uuid(),
    accountCode: z.string().trim().min(1).max(32),
    accountName: z.string().trim().min(1).max(200),
    accountType: z.enum(ACCOUNT_TYPES),
    isActive: z.boolean().optional(),
  })
  .strict();

const createJournalSchema = z
  .object({
    branchId: z.string().uuid(),
    entryDate: z.string().trim().min(1).nullable().optional(),
    description: z.string().trim().min(1).max(2000),
    referenceType: z.string().trim().max(80).nullable().optional(),
    referenceId: z.string().uuid().nullable().optional(),
    status: z.enum(JOURNAL_STATUSES).optional(),
    lines: z
      .array(
        z
          .object({
            accountId: z.string().uuid(),
            debit: z.number().finite().min(0).optional(),
            credit: z.number().finite().min(0).optional(),
          })
          .strict(),
      )
      .min(2)
      .max(200),
  })
  .strict();

const trialBalanceQuerySchema = z.object({
  branchId: z.string().uuid(),
  asOf: z.string().trim().min(1).optional(),
});

const profitLossQuerySchema = z.object({
  branchId: z.string().uuid(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
});

const upsertMappingSchema = z
  .object({
    branchId: z.string().uuid(),
    purpose: z.string().trim().min(1).max(120),
    accountId: z.string().uuid(),
  })
  .strict();

const createCashReconSchema = z
  .object({
    branchId: z.string().uuid(),
    businessDate: z.string().trim().min(1).optional(),
    registerId: z.string().uuid().nullable().optional(),
    openingFloat: z.number().finite().min(0),
    cashRefunds: z.number().finite().min(0).optional(),
    cashDrops: z.number().finite().min(0).optional(),
    otherInflows: z.number().finite().min(0).optional(),
    otherOutflows: z.number().finite().min(0).optional(),
    countedCash: z.number().finite().min(0).nullable().optional(),
    closingNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const updateCashReconSchema = z
  .object({
    openingFloat: z.number().finite().min(0).optional(),
    cashRefunds: z.number().finite().min(0).optional(),
    cashDrops: z.number().finite().min(0).optional(),
    otherInflows: z.number().finite().min(0).optional(),
    otherOutflows: z.number().finite().min(0).optional(),
    countedCash: z.number().finite().min(0).nullable().optional(),
    closingNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const transitionSchema = z
  .object({
    action: z.enum(["submit", "approve", "reject", "void", "post", "pay"]),
    reason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const createExpenseSchema = z
  .object({
    branchId: z.string().uuid(),
    category: z.string().trim().min(1).max(80),
    expenseDate: z.string().trim().min(1).optional(),
    amount: z.number().finite().positive(),
    currency: z.string().trim().length(3).optional(),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "card", "other"]).optional(),
    payee: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().min(1).max(2000),
    receiptRef: z.string().trim().max(500).nullable().optional(),
    sourceContext: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

const updateExpenseSchema = z
  .object({
    category: z.string().trim().min(1).max(80).optional(),
    expenseDate: z.string().trim().min(1).optional(),
    amount: z.number().finite().positive().optional(),
    paymentMethod: z.enum(["cash", "bank_transfer", "cheque", "card", "other"]).optional(),
    payee: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    receiptRef: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const reverseJournalSchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();

/**
 * Finance GL + RC3 operations — mappings, cash recon, expenses, attention, reverse.
 * Gated by finance.manage or admin.access.
 */
export function createAdminFinanceRouter(deps: AdminFinanceRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireFinanceAccess = requireAnyPermission(["finance.manage", "admin.access"]);

  router.get(
    "/finance/accounts",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid finance accounts query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.finance.listAccounts(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/accounts",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(createAccountSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.finance.createAccount(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/account-mappings",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = z.object({ branchId: z.string().uuid() }).safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId is required.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.listAccountMappings(
          scopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({
          ok: true,
          data,
          meta: { count: data.length, knownPurposes: MAPPING_PURPOSES },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.put(
    "/finance/account-mappings",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(upsertMappingSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.upsertAccountMapping(scopeFrom(principal), req.body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/journal-entries",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid journal entries query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.finance.listJournalEntries(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/journal-entries",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(createJournalSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.finance.createJournalEntry(scopeFrom(principal), principal.userId, req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/journal-entries/:id/reverse",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(reverseJournalSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.reverseJournal(
          scopeFrom(principal),
          principal.userId,
          req.params.id,
          req.body.reason,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/reports/trial-balance",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = trialBalanceQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId is required for trial balance.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.finance.trialBalance(
          scopeFrom(principal),
          parsed.data.branchId,
          parsed.data.asOf,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/reports/profit-loss",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = profitLossQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "branchId is required for profit & loss.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.finance.profitLoss(
          scopeFrom(principal),
          parsed.data.branchId,
          parsed.data.from,
          parsed.data.to,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/attention",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid attention query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.getAttention(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/cash-reconciliations",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid cash reconciliation query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.listCashReconciliations(
          scopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/cash-reconciliations",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(createCashReconSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.createCashReconciliation(
          scopeFrom(principal),
          principal.userId,
          { ...req.body, idempotencyKey: readIdempotencyKey(req) },
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/finance/cash-reconciliations/:id",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(updateCashReconSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.updateCashReconciliationDraft(
          scopeFrom(principal),
          principal.userId,
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/cash-reconciliations/:id/transition",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(transitionSchema.omit({ action: true }).extend({
      action: z.enum(["submit", "approve", "reject", "void", "post"]),
    })),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.transitionCashReconciliation(
          scopeFrom(principal),
          principal.userId,
          req.params.id,
          req.body.action,
          req.body.reason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/finance/expenses",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid expenses query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.listExpenseClaims(
          scopeFrom(principal),
          parsed.data.branchId,
        );
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/expenses",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(createExpenseSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.createExpenseClaim(
          scopeFrom(principal),
          principal.userId,
          { ...req.body, idempotencyKey: readIdempotencyKey(req) },
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/finance/expenses/:id",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(updateExpenseSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.updateExpenseClaimDraft(
          scopeFrom(principal),
          principal.userId,
          req.params.id,
          req.body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/expenses/:id/transition",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(transitionSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.transitionExpenseClaim(
          scopeFrom(principal),
          principal.userId,
          req.params.id,
          req.body.action,
          req.body.reason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/supplier-payments/:id/post",
    requireAuthenticatedUser,
    requireFinanceAccess,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financeOperations.postSupplierPayment(
          scopeFrom(principal),
          principal.userId,
          req.params.id,
          { idempotencyKey: readIdempotencyKey(req) },
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

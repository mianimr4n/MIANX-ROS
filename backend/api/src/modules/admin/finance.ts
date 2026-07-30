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

export interface AdminFinanceRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  finance: FinanceService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
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

/**
 * Finance GL — chart of accounts, balanced journals, dynamic TB / P&L.
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

  return router;
}

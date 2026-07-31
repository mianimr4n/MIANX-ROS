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
import type { FinancePhase2Service } from "../../services/finance/phase2.js";
import { getRequestId } from "../../observability/index.js";

export interface AdminFinanceRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  finance: FinanceService;
  financeOperations: FinanceOperationsService;
  financePhase2: FinancePhase2Service;
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

  // --- RC4-8 Phase 2 foundation ---
  router.get("/finance/mapping-health", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const branchId = z.string().uuid().parse(req.query.branchId);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.mappingHealth(scopeFrom(principal), branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/finance/tax-definitions", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const branchId = req.query.branchId ? z.string().uuid().parse(req.query.branchId) : undefined;
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.listTaxDefinitions(scopeFrom(principal), branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.put(
    "/finance/tax-definitions",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(
      z
        .object({
          branchId: z.string().uuid().nullable().optional(),
          taxCode: z.string().trim().min(1).max(40),
          description: z.string().trim().max(500).optional(),
          rate: z.number().finite().min(0).max(1),
          taxBasis: z.enum(["exclusive", "inclusive"]).optional(),
          classification: z.enum(["input", "output"]).optional(),
          effectiveFrom: z.string().trim().optional(),
          effectiveTo: z.string().trim().nullable().optional(),
          isActive: z.boolean().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financePhase2.upsertTaxDefinition(scopeFrom(principal), req.body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/ar/invoices",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          customerId: z.string().uuid().nullable().optional(),
          sourceOrderId: z.string().uuid().nullable().optional(),
          invoiceNumber: z.string().trim().min(1).max(64),
          dueDate: z.string().trim().nullable().optional(),
          discountAmount: z.number().finite().min(0).optional(),
          taxDefinitionId: z.string().uuid().nullable().optional(),
          lines: z
            .array(
              z
                .object({
                  description: z.string().trim().min(1).max(500),
                  quantity: z.number().finite().positive(),
                  unitPrice: z.number().finite().min(0),
                })
                .strict(),
            )
            .min(1)
            .max(200),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financePhase2.createDraftInvoice(
          scopeFrom(principal),
          principal.userId,
          req.body,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/finance/ar/invoices/:id/issue", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.issueInvoice(
        scopeFrom(principal),
        principal.userId,
        z.string().uuid().parse(req.params.id),
        getRequestId(req),
      );
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/finance/ar/receipts",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          customerId: z.string().uuid().nullable().optional(),
          paymentMethod: z.enum(["cash", "bank", "card", "other"]),
          amount: z.number().finite().positive(),
          receivedDate: z.string().trim().optional(),
          reference: z.string().trim().max(200).nullable().optional(),
          allocations: z
            .array(
              z
                .object({
                  invoiceId: z.string().uuid(),
                  amount: z.number().finite().positive(),
                })
                .strict(),
            )
            .min(1),
          idempotencyKey: z.string().trim().max(100).nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financePhase2.createReceipt(
          scopeFrom(principal),
          principal.userId,
          { ...req.body, idempotencyKey: req.body.idempotencyKey ?? readIdempotencyKey(req) },
          getRequestId(req),
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/ar/credit-notes",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          invoiceId: z.string().uuid(),
          creditNumber: z.string().trim().min(1).max(64),
          reason: z.string().trim().min(1).max(2000),
          subtotal: z.number().finite().min(0),
          taxAmount: z.number().finite().min(0).optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financePhase2.createCreditNote(
          scopeFrom(principal),
          principal.userId,
          req.body,
          getRequestId(req),
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/finance/reports/balance-sheet", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const branchId = z.string().uuid().parse(req.query.branchId);
      const asOf = req.query.asOf ? String(req.query.asOf) : undefined;
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.getBalanceSheet(scopeFrom(principal), branchId, asOf);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/finance/reports/cash-flow", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const branchId = z.string().uuid().parse(req.query.branchId);
      const from = req.query.from ? String(req.query.from) : undefined;
      const to = req.query.to ? String(req.query.to) : undefined;
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.getCashFlow(scopeFrom(principal), branchId, from, to);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/finance/periods", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const branchId = z.string().uuid().parse(req.query.branchId);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.listPeriods(scopeFrom(principal), branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/finance/periods",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          periodStart: z.string().trim().min(1),
          periodEnd: z.string().trim().min(1),
          label: z.string().trim().max(120).nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financePhase2.createPeriod(scopeFrom(principal), req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/finance/periods/:id/status",
    requireAuthenticatedUser,
    requireFinanceAccess,
    validateBody(
      z
        .object({
          status: z.enum(["open", "soft_closed", "closed"]),
          reason: z.string().trim().max(2000).nullable().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.financePhase2.setPeriodStatus(
          scopeFrom(principal),
          principal.userId,
          z.string().uuid().parse(req.params.id),
          req.body.status,
          req.body.reason,
          getRequestId(req),
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/finance/exceptions", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.listExceptions(scopeFrom(principal), {
        branchId: req.query.branchId ? z.string().uuid().parse(req.query.branchId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/finance/sales/post-from-order/:orderId", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.postSalesFromOrder(
        scopeFrom(principal),
        principal.userId,
        z.string().uuid().parse(req.params.orderId),
        getRequestId(req),
      );
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/finance/ap/invoices/:id/post", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.postSupplierInvoice(
        scopeFrom(principal),
        principal.userId,
        z.string().uuid().parse(req.params.id),
        getRequestId(req),
      );
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/finance/cogs/events/:id/post", requireAuthenticatedUser, requireFinanceAccess, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.financePhase2.postCogsEvent(
        scopeFrom(principal),
        principal.userId,
        z.string().uuid().parse(req.params.id),
        getRequestId(req),
      );
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

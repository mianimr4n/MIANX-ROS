/**
 * Admin AI proxy + approvals + logs routes (Phase 2.6 — ADR-013/014/015).
 *
 * Mounts under `/api/v1/admin/ai/...`:
 *
 * ADR-013 (Provider Boundary):
 *   - GET  /ai/providers         — list active AI provider configs
 *   - GET  /ai/call-logs         — list call logs (branch-scoped)
 *
 * ADR-014 (Approval Gate):
 *   - POST /ai/approvals         — create pending approval (from AI suggestion)
 *   - GET  /ai/approvals         — list approvals (filtered)
 *   - GET  /ai/approvals/:id     — single approval detail
 *   - POST /ai/approvals/:id/approve — approve (super-admin, branch-manager)
 *   - POST /ai/approvals/:id/reject  — reject (super-admin, branch-manager)
 *
 * ADR-015 (Prompt Retention):
 *   - GET  /ai/prompt-logs       — trend analytics (hashed metadata)
 *
 * Authorization:
 *   - Read routes: ai.read OR ai.use OR admin.access
 *   - Approve/reject: ai.approve (super-admin, branch-manager)
 *
 * Authority: ADR-013 §1 (backend proxy), ADR-014 §4 (ai.approve), ADR-015 §1 (no raw prompts)
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AiPromptLogService } from "../../services/ai/prompt-log-service.js";
import type { AiApprovalService } from "../../services/ai/approval-service.js";
import {
  AI_APPROVAL_ACTION_TYPES,
  AI_APPROVAL_STATUSES,
} from "../../services/ai/approval-service.js";

export interface AdminAiRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  promptLogService: AiPromptLogService;
  approvalService: AiApprovalService;
}

interface BranchContext {
  branchIds: string[];
  isSuperAdmin: boolean;
  userId: string;
}

const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many AI admin requests. Please retry later." },
  },
});

function resolveBranchContext(req: AuthorizedRequest): BranchContext {
  const principal = req.principal;
  if (!principal) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return {
    branchIds: principal.isSuperAdmin ? [] : principal.branchIds,
    isSuperAdmin: principal.isSuperAdmin,
    userId: principal.userId,
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const listCallLogsSchema = z
  .object({
    provider: z.string().trim().max(50).optional(),
    actorUserId: z.string().uuid().optional(),
    fromCalledAt: z.string().datetime().optional(),
    toCalledAt: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const listPromptLogsSchema = z
  .object({
    promptLanguage: z.string().trim().max(8).optional(),
    minOccurrenceCount: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const createApprovalSchema = z
  .object({
    aiCallLogId: z.number().int().positive().optional().nullable(),
    actionType: z.enum(AI_APPROVAL_ACTION_TYPES as [string, ...string[]]),
    actionPayload: z.record(z.string(), z.unknown()),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

const listApprovalsSchema = z
  .object({
    status: z.enum(AI_APPROVAL_STATUSES as [string, ...string[]]).optional(),
    requestedBy: z.string().uuid().optional(),
    decidedBy: z.string().uuid().optional(),
    actionType: z.enum(AI_APPROVAL_ACTION_TYPES as [string, ...string[]]).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const approveSchema = z
  .object({
    reason: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

const rejectSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createAdminAiRouter(deps: AdminAiRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireReadAccess = requireAnyPermission(["ai.read", "ai.use", "admin.access"]);
  const requireApproveAccess = requireAnyPermission(["ai.approve"]);

  // -------------------------------------------------------------------------
  // ADR-013: Call logs (per-call audit; NO raw prompts)
  // -------------------------------------------------------------------------
  router.get(
    "/ai/call-logs",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const parsed = listCallLogsSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const result = await deps.promptLogService.listCallLogs({
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          provider: parsed.data.provider,
          actorUserId: parsed.data.actorUserId,
          fromCalledAt: parsed.data.fromCalledAt,
          toCalledAt: parsed.data.toCalledAt,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        });
        res.json({
          ok: true,
          data: result.rows,
          pagination: {
            total: result.total,
            limit: parsed.data.limit ?? 50,
            offset: parsed.data.offset ?? 0,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // ADR-015: Prompt logs (hashed metadata for trend analytics)
  // -------------------------------------------------------------------------
  router.get(
    "/ai/prompt-logs",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = listPromptLogsSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const result = await deps.promptLogService.listPromptLogs({
          promptLanguage: parsed.data.promptLanguage,
          minOccurrenceCount: parsed.data.minOccurrenceCount,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        });
        res.json({
          ok: true,
          data: result.rows,
          pagination: {
            total: result.total,
            limit: parsed.data.limit ?? 50,
            offset: parsed.data.offset ?? 0,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // ADR-014: Approvals
  // -------------------------------------------------------------------------
  router.post(
    "/ai/approvals",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    validateBody(createApprovalSchema),
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const body = req.body as z.infer<typeof createApprovalSchema>;
        const row = await deps.approvalService.createApproval({
          aiCallLogId: body.aiCallLogId ?? null,
          actionType: body.actionType as never,
          actionPayload: body.actionPayload,
          requestedBy: ctx.userId,
          metadata: body.metadata ?? null,
        });
        res.status(201).json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/ai/approvals",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = listApprovalsSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const result = await deps.approvalService.listApprovals({
          status: parsed.data.status as never,
          requestedBy: parsed.data.requestedBy,
          decidedBy: parsed.data.decidedBy,
          actionType: parsed.data.actionType as never,
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        });
        res.json({
          ok: true,
          data: result.rows,
          pagination: {
            total: result.total,
            limit: parsed.data.limit ?? 50,
            offset: parsed.data.offset ?? 0,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/ai/approvals/:id",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const row = await deps.approvalService.getApproval({ approvalId: req.params.id });
        if (!row) {
          throw new ApiError(404, "APPROVAL_NOT_FOUND", "Approval not found.");
        }
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/ai/approvals/:id/approve",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireApproveAccess,
    validateBody(approveSchema),
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const body = req.body as z.infer<typeof approveSchema>;
        const row = await deps.approvalService.approve({
          approvalId: req.params.id,
          actorUserId: ctx.userId,
          reason: body.reason ?? null,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/ai/approvals/:id/reject",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireApproveAccess,
    validateBody(rejectSchema),
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const body = req.body as z.infer<typeof rejectSchema>;
        const row = await deps.approvalService.reject({
          approvalId: req.params.id,
          actorUserId: ctx.userId,
          reason: body.reason,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

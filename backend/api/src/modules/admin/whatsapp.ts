/**
 * Admin WhatsApp routes (ADR-004 §1, §4, §5).
 *
 * Mounts under `/api/v1/admin/whatsapp/...`:
 *   - GET    /conversations              — list (branch-scoped)
 *   - GET    /conversations/:id          — detail
 *   - GET    /conversations/:id/messages — message list
 *   - GET    /conversations/:id/events   — audit log
 *   - POST   /conversations/:id/messages — send outbound (text or template)
 *   - POST   /conversations/:id/assign   — assign / unassign agent
 *   - POST   /conversations/:id/status   — state-machine transition
 *   - GET    /templates                  — list (active+inactive by default)
 *   - POST   /templates                  — create
 *   - PATCH  /templates/:id              — update (activate, body, status)
 *   - DELETE /templates/:id              — delete
 *
 * Authorization:
 *   - All routes require authenticated principal with `whatsapp.manage` or
 *     `admin.access` permission.
 *   - Branch scoping: principal.branchIds filter every query. Super-admin
 *     (isSuperAdmin=true) bypasses — the service accepts isSuperAdmin=true
 *     and skips the branch_id filter entirely.
 *
 * Authority: ADR-004 §2 (branch-owned conversations)
 *           ADR-004 §4 (state machine)
 *           ADR-004 §5 (message immutability — outbound send flow)
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
import {
  CONVERSATION_STATUSES,
  createWhatsAppAdminService,
  type ConversationStatus,
  type WhatsAppAdminService,
} from "../../services/whatsapp/admin-service.js";

export interface AdminWhatsAppRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  whatsappAdmin: WhatsAppAdminService;
}

const listConversationsSchema = z
  .object({
    status: z.enum(CONVERSATION_STATUSES as [ConversationStatus, ...ConversationStatus[]]).optional(),
    q: z.string().trim().max(60).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const sendMessageSchema = z
  .object({
    contentType: z.enum(["text", "template"]),
    text: z.string().trim().max(4096).optional().nullable(),
    templateKey: z.string().trim().max(120).optional().nullable(),
    templateLanguage: z.string().trim().max(8).optional().nullable(),
    templateParameters: z.array(z.unknown()).max(20).optional().nullable(),
  })
  .strict();

const assignAgentSchema = z
  .object({
    agentUserId: z.string().uuid().nullable(),
  })
  .strict();

const transitionStatusSchema = z
  .object({
    toStatus: z.enum(CONVERSATION_STATUSES as [ConversationStatus, ...ConversationStatus[]]),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const createTemplateSchema = z
  .object({
    templateKey: z.string().trim().min(1).max(120),
    providerTemplateId: z.string().trim().min(1).max(200),
    language: z.string().trim().min(2).max(8).default("en"),
    category: z.enum(["marketing", "utility", "authentication"]),
    bodyText: z.string().trim().min(1).max(4096),
    variables: z.array(z.unknown()).max(20).default([]),
    isActive: z.boolean().default(true),
    providerStatus: z.enum(["pending", "approved", "rejected", "paused"]).default("pending"),
  })
  .strict();

const updateTemplateSchema = z
  .object({
    isActive: z.boolean().optional(),
    providerStatus: z.enum(["pending", "approved", "rejected", "paused"]).optional(),
    bodyText: z.string().trim().min(1).max(4096).optional(),
    variables: z.array(z.unknown()).max(20).optional(),
  })
  .strict();

interface BranchContext {
  branchIds: string[];
  isSuperAdmin: boolean;
}

/**
 * Per-IP rate limit for ALL admin WhatsApp routes (reads + writes).
 *
 * 60/min/IP is generous for legitimate admin operators; bursts above this
 * indicate either a buggy client retry loop or a stolen session token being
 * abused. Read endpoints are also rate-limited because they can be used for
 * data exfiltration if a session is compromised.
 *
 * Uses express-rate-limit (CodeQL-recognized).
 */
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many WhatsApp write requests from this IP. Please retry later." },
  },
});

function resolveBranchContext(req: AuthorizedRequest): BranchContext {
  const principal = req.principal;
  if (!principal) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (principal.isSuperAdmin) {
    return { branchIds: [], isSuperAdmin: true };
  }
  if (principal.branchIds.length === 0) {
    throw new ApiError(
      403,
      "NO_BRANCH_SCOPE",
      "Your account has no branch assignments. Contact an administrator.",
    );
  }
  return { branchIds: principal.branchIds, isSuperAdmin: false };
}

export function createAdminWhatsAppRouter(deps: AdminWhatsAppRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireWhatsAppAccess = requireAnyPermission(["whatsapp.manage", "admin.access"]);
  const service = deps.whatsappAdmin;

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------

  router.get(
    "/whatsapp/conversations",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    async (req, res, next) => {
      try {
        const parsed = listConversationsSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);

        const result = await service.listConversations({
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          status: parsed.data.status ?? null,
          search: parsed.data.q ?? null,
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
    "/whatsapp/conversations/:conversationId",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    async (req, res, next) => {
      try {
        const conversationId = req.params.conversationId;
        if (!z.string().uuid().safeParse(conversationId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "conversationId must be a UUID.");
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);

        const detail = await service.getConversation({
          conversationId,
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
        });

        res.json({ ok: true, data: detail });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/whatsapp/conversations/:conversationId/messages",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    async (req, res, next) => {
      try {
        const conversationId = req.params.conversationId;
        if (!z.string().uuid().safeParse(conversationId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "conversationId must be a UUID.");
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const limit = req.query.limit ? Number(req.query.limit) : 100;

        const messages = await service.listMessages({
          conversationId,
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          limit,
        });
        res.json({ ok: true, data: messages });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/whatsapp/conversations/:conversationId/events",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    async (req, res, next) => {
      try {
        const conversationId = req.params.conversationId;
        if (!z.string().uuid().safeParse(conversationId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "conversationId must be a UUID.");
        }
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const limit = req.query.limit ? Number(req.query.limit) : 100;

        const events = await service.listEvents({
          conversationId,
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          limit,
        });
        res.json({ ok: true, data: events });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/whatsapp/conversations/:conversationId/messages",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    validateBody(sendMessageSchema),
    async (req, res, next) => {
      try {
        const conversationId = req.params.conversationId;
        if (!z.string().uuid().safeParse(conversationId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "conversationId must be a UUID.");
        }
        const body = req.body as z.infer<typeof sendMessageSchema>;
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const principal = (req as AuthorizedRequest).principal!;

        const result = await service.sendMessage({
          conversationId,
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          actorUserId: principal.authUserId,
          contentType: body.contentType,
          text: body.text ?? null,
          templateKey: body.templateKey ?? null,
          templateLanguage: body.templateLanguage ?? null,
          templateParameters: body.templateParameters ?? null,
        });

        res.status(202).json({
          ok: true,
          data: result,
          message: "Message queued for delivery. The outbox worker will send it within 15 seconds.",
        });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/whatsapp/conversations/:conversationId/assign",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    validateBody(assignAgentSchema),
    async (req, res, next) => {
      try {
        const conversationId = req.params.conversationId;
        if (!z.string().uuid().safeParse(conversationId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "conversationId must be a UUID.");
        }
        const body = req.body as z.infer<typeof assignAgentSchema>;
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const principal = (req as AuthorizedRequest).principal!;

        const result = await service.assignAgent({
          conversationId,
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          actorUserId: principal.authUserId,
          agentUserId: body.agentUserId,
        });

        res.json({ ok: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/whatsapp/conversations/:conversationId/status",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    validateBody(transitionStatusSchema),
    async (req, res, next) => {
      try {
        const conversationId = req.params.conversationId;
        if (!z.string().uuid().safeParse(conversationId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "conversationId must be a UUID.");
        }
        const body = req.body as z.infer<typeof transitionStatusSchema>;
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const principal = (req as AuthorizedRequest).principal!;

        const result = await service.transitionStatus({
          conversationId,
          branchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          actorUserId: principal.authUserId,
          actorRole: principal.isSuperAdmin ? "super-admin" : "agent",
          toStatus: body.toStatus,
          reason: body.reason ?? null,
        });

        res.json({ ok: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // Templates
  // -------------------------------------------------------------------------

  router.get(
    "/whatsapp/templates",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    async (req, res, next) => {
      try {
        const activeOnly = req.query.active === "true" || req.query.active === "1";
        const templates = await service.listTemplates({ activeOnly });
        res.json({ ok: true, data: templates });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/whatsapp/templates",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    validateBody(createTemplateSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof createTemplateSchema>;
        const created = await service.createTemplate({
          templateKey: body.templateKey,
          providerTemplateId: body.providerTemplateId,
          language: body.language,
          category: body.category,
          bodyText: body.bodyText,
          variables: body.variables,
          isActive: body.isActive,
          providerStatus: body.providerStatus,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    "/whatsapp/templates/:templateId",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    validateBody(updateTemplateSchema),
    async (req, res, next) => {
      try {
        const templateId = req.params.templateId;
        if (!z.string().uuid().safeParse(templateId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "templateId must be a UUID.");
        }
        const body = req.body as z.infer<typeof updateTemplateSchema>;
        const updated = await service.updateTemplate({
          templateId,
          isActive: body.isActive,
          providerStatus: body.providerStatus,
          bodyText: body.bodyText,
          variables: body.variables,
        });
        res.json({ ok: true, data: updated });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    "/whatsapp/templates/:templateId",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireWhatsAppAccess,
    async (req, res, next) => {
      try {
        const templateId = req.params.templateId;
        if (!z.string().uuid().safeParse(templateId).success) {
          throw new ApiError(400, "VALIDATION_ERROR", "templateId must be a UUID.");
        }
        await service.deleteTemplate({ templateId });
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

// Re-export factory for app-dependencies wiring.
export { createWhatsAppAdminService };

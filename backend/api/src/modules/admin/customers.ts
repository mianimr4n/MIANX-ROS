/**
 * Admin customer routes (Phase 2.3 — ADR-005/006).
 *
 * Mounts under `/api/v1/admin/customers/...`:
 *
 * Identity (ADR-005):
 *   - GET    /customers                — search by name/phone/email
 *   - GET    /customers/:id            — get customer summary + identities
 *   - GET    /customers/:id/identities — list identities only
 *   - POST   /customers/:id/identities — add identity (phone/email/auth_user_id)
 *   - POST   /customers/resolve        — resolve customer by identity (POST for caching privacy)
 *
 * Merge (ADR-006):
 *   - POST   /customers/merge          — merge source → target (super-admin only)
 *   - POST   /customers/merge/:id/reverse — reverse a merge (super-admin only)
 *   - GET    /customers/merge-log      — list merge history (customer.read)
 *
 * Authorization:
 *   - Read routes: customer.read OR admin.access.
 *   - Merge routes: customer.merge (super-admin only).
 *
 * Authority: ADR-005 §1, §7 (canonical identity + lookup RPC)
 *           ADR-006 §1 (super-admin only merge)
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
import type { CustomerIdentityService } from "../../services/customers/identity-service.js";
import { IDENTITY_TYPES } from "../../services/customers/identity-service.js";
import type { CustomerMergeService } from "../../services/customers/merge-service.js";

export interface AdminCustomersRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  identityService: CustomerIdentityService;
  mergeService: CustomerMergeService;
}

const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many customer admin requests. Please retry later." },
  },
});

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const searchSchema = z
  .object({
    q: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const addIdentitySchema = z
  .object({
    identityType: z.enum(IDENTITY_TYPES as [string, ...string[]]),
    value: z.string().trim().min(1).max(300),
    verifiedAt: z.string().datetime().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

const resolveSchema = z
  .object({
    identityType: z.enum(IDENTITY_TYPES as [string, ...string[]]),
    value: z.string().trim().min(1).max(300),
  })
  .strict();

const mergeSchema = z
  .object({
    sourceCustomerId: z.string().uuid(),
    targetCustomerId: z.string().uuid(),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const reverseMergeSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

const listMergeLogSchema = z
  .object({
    sourceCustomerId: z.string().uuid().optional(),
    targetCustomerId: z.string().uuid().optional(),
    unreversedOnly: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createAdminCustomersRouter(deps: AdminCustomersRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireReadAccess = requireAnyPermission(["customer.read", "admin.access"]);
  const requireMergeAccess = requireAnyPermission(["customer.merge"]);

  // Search customers
  router.get(
    "/customers",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = searchSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const results = await deps.identityService.searchCustomers({
          query: parsed.data.q,
          limit: parsed.data.limit,
        });
        res.json({ ok: true, data: results });
      } catch (err) {
        next(err);
      }
    },
  );

  // Get customer summary
  router.get(
    "/customers/:id",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const customer = await deps.identityService.getCustomer({
          customerId: req.params.id,
        });
        if (!customer) {
          throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found.");
        }
        res.json({ ok: true, data: customer });
      } catch (err) {
        next(err);
      }
    },
  );

  // List identities for a customer
  router.get(
    "/customers/:id/identities",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const identities = await deps.identityService.listIdentities({
          customerId: req.params.id,
        });
        res.json({ ok: true, data: identities });
      } catch (err) {
        next(err);
      }
    },
  );

  // Add identity to a customer
  router.post(
    "/customers/:id/identities",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    validateBody(addIdentitySchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof addIdentitySchema>;
        const row = await deps.identityService.addIdentity({
          customerId: req.params.id,
          identityType: body.identityType as "phone_e164" | "email" | "auth_user_id" | "whatsapp_phone",
          value: body.value,
          verifiedAt: body.verifiedAt ?? null,
          metadata: body.metadata ?? null,
        });
        res.status(201).json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  // Resolve customer by identity
  router.post(
    "/customers/resolve",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    validateBody(resolveSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof resolveSchema>;
        const customerId = await deps.identityService.resolveCustomer({
          identityType: body.identityType as "phone_e164" | "email" | "auth_user_id" | "whatsapp_phone",
          value: body.value,
        });
        res.json({ ok: true, data: { customerId } });
      } catch (err) {
        next(err);
      }
    },
  );

  // Merge customers (super-admin only)
  router.post(
    "/customers/merge",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireMergeAccess,
    validateBody(mergeSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal;
        const body = req.body as z.infer<typeof mergeSchema>;
        const result = await deps.mergeService.mergeCustomers({
          sourceCustomerId: body.sourceCustomerId,
          targetCustomerId: body.targetCustomerId,
          actorUserId: principal?.userId ?? "",
          reason: body.reason,
        });
        res.json({ ok: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  // Reverse a merge (super-admin only)
  router.post(
    "/customers/merge/:id/reverse",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireMergeAccess,
    validateBody(reverseMergeSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal;
        const body = req.body as z.infer<typeof reverseMergeSchema>;
        const result = await deps.mergeService.reverseMerge({
          mergeLogId: req.params.id,
          actorUserId: principal?.userId ?? "",
          reason: body.reason,
        });
        res.json({ ok: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  // List merge log
  router.get(
    "/customers/merge-log",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReadAccess,
    async (req, res, next) => {
      try {
        const parsed = listMergeLogSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const result = await deps.mergeService.listMergeLog({
          sourceCustomerId: parsed.data.sourceCustomerId,
          targetCustomerId: parsed.data.targetCustomerId,
          unreversedOnly: parsed.data.unreversedOnly,
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

  return router;
}

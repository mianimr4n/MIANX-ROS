/**
 * Admin rider-location + delivery-pod + cod-reconciliation routes
 * (Phase 2.4 — ADR-008/009/010).
 *
 * Mounts under `/api/v1/admin/...`:
 *
 * Rider location (ADR-008):
 *   - POST   /rider-locations              — rider ingests a GPS ping
 *   - GET    /rider-locations/delivery/:id — list pings for a delivery
 *   - GET    /rider-locations/rider/:id/latest — latest ping for a rider
 *
 * Proof of Delivery (ADR-009):
 *   - POST   /delivery-pod                 — rider captures POD (URLs already uploaded to storage)
 *   - GET    /delivery-pod/:deliveryId     — fetch POD for a delivery
 *
 * COD reconciliation (ADR-010):
 *   - POST   /cod/collections              — rider records a COD collection at delivery
 *   - GET    /cod/collections              — list (branch-scoped, filtered)
 *   - GET    /cod/collections/:id          — single detail
 *   - POST   /cod/collections/:id/reconcile — branch-manager reconcile with handed-in amount
 *   - POST   /cod/collections/:id/resolve  — resolve shortage/overage → reconciled
 *
 * Authorization:
 *   - All routes require authenticated principal.
 *   - Rider ingest routes: rider themselves OR super-admin.
 *   - Read routes: any branch staff (whatsapp.manage OR admin.access OR
 *     delivery.access OR finance.manage).
 *   - COD reconcile: branch-manager or super-admin only.
 *
 * Authority: ADR-008 §3 (branch-scoped access)
 *           ADR-009 §3 (POD mandatory for delivered)
 *           ADR-010 §6 (branch-scoped access; branch-manager reconcile)
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
import type { RiderLocationService } from "../../services/deliveries/rider-location-service.js";
import type { DeliveryPodService } from "../../services/deliveries/pod-service.js";
import type { CodService } from "../../services/deliveries/cod-service.js";
import {
  RECIPIENT_RELATIONSHIPS,
} from "../../services/deliveries/pod-service.js";
import {
  COD_RECONCILIATION_STATUSES,
} from "../../services/deliveries/cod-service.js";

export interface AdminDeliveryRiderRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  riderLocationService: RiderLocationService;
  podService: DeliveryPodService;
  codService: CodService;
}

interface BranchContext {
  branchIds: string[];
  isSuperAdmin: boolean;
  userId: string;
}

const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many delivery admin requests from this IP. Please retry later." },
  },
});

// Rider-ingest rate limiter — more permissive (rider app sends pings every 5s).
const riderIngestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many rider location pings from this IP." },
  },
});

function resolveBranchContext(req: AuthorizedRequest): BranchContext {
  const principal = req.principal;
  if (!principal) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (principal.isSuperAdmin) {
    return { branchIds: [], isSuperAdmin: true, userId: principal.userId };
  }
  return {
    branchIds: principal.branchIds,
    isSuperAdmin: false,
    userId: principal.userId,
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ingestPingSchema = z
  .object({
    riderId: z.string().uuid(),
    deliveryId: z.string().uuid().optional().nullable(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    heading: z.number().min(0).max(360).optional().nullable(),
    speed: z.number().min(0).optional().nullable(),
    accuracyM: z.number().min(0).optional().nullable(),
    recordedAt: z.string().datetime().optional().nullable(),
  })
  .strict();

const capturePodSchema = z
  .object({
    deliveryId: z.string().uuid(),
    capturedByRiderId: z.string().uuid(),
    photoStoragePath: z.string().trim().min(1).max(500),
    photoUrl: z.string().trim().min(1).max(2000),
    signatureSvgPath: z.string().trim().max(500).optional().nullable(),
    signatureUrl: z.string().trim().max(2000).optional().nullable(),
    recipientName: z.string().trim().min(1).max(150),
    recipientRelationship: z.enum(RECIPIENT_RELATIONSHIPS as [string, ...string[]]).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

const recordCodSchema = z
  .object({
    deliveryId: z.string().uuid(),
    collectedByRiderId: z.string().uuid(),
    amount: z.number().min(0),
    currency: z.string().trim().length(3).default("PKR"),
    customerReceivedBy: z.string().trim().max(150).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

const listCodSchema = z
  .object({
    branchId: z.string().uuid().optional(),
    riderId: z.string().uuid().optional(),
    status: z.enum(COD_RECONCILIATION_STATUSES as [string, ...string[]]).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

const reconcileCodSchema = z
  .object({
    reconciledAmount: z.number().min(0),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

const resolveCodSchema = z
  .object({
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createAdminDeliveryRiderRouter(deps: AdminDeliveryRiderRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireAnyAdminAccess = requireAnyPermission([
    "admin.access",
    "delivery.access",
    "whatsapp.manage",
    "finance.manage",
  ]);
  const requireReconcileAccess = requireAnyPermission([
    "admin.access",
    "finance.manage",
  ]);

  // -------------------------------------------------------------------------
  // Rider location ingest (ADR-008)
  // -------------------------------------------------------------------------
  router.post(
    "/rider-locations",
    riderIngestRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    validateBody(ingestPingSchema),
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const body = req.body as z.infer<typeof ingestPingSchema>;
        const row = await deps.riderLocationService.ingestPing({
          actorUserId: ctx.userId,
          ping: {
            riderId: body.riderId,
            deliveryId: body.deliveryId ?? null,
            latitude: body.latitude,
            longitude: body.longitude,
            heading: body.heading ?? null,
            speed: body.speed ?? null,
            accuracyM: body.accuracyM ?? null,
            recordedAt: body.recordedAt ?? null,
          },
        });
        res.status(201).json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/rider-locations/delivery/:deliveryId",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const limit = req.query.limit ? Number(req.query.limit) : 100;
        const rows = await deps.riderLocationService.listForDelivery({
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          deliveryId: req.params.deliveryId,
          limit,
        });
        res.json({ ok: true, data: rows });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/rider-locations/rider/:riderId/latest",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const row = await deps.riderLocationService.getLatestForRider({
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          riderId: req.params.riderId,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // Proof of Delivery (ADR-009)
  // -------------------------------------------------------------------------
  router.post(
    "/delivery-pod",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    validateBody(capturePodSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof capturePodSchema>;
        const row = await deps.podService.capturePod({
          deliveryId: body.deliveryId,
          capturedByRiderId: body.capturedByRiderId,
          photoStoragePath: body.photoStoragePath,
          photoUrl: body.photoUrl,
          signatureSvgPath: body.signatureSvgPath ?? null,
          signatureUrl: body.signatureUrl ?? null,
          recipientName: body.recipientName,
          recipientRelationship: body.recipientRelationship as
            | "self" | "family" | "neighbor" | "guard" | "other"
            | undefined,
          notes: body.notes ?? null,
          metadata: body.metadata ?? null,
        });
        res.status(201).json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/delivery-pod/:deliveryId",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const row = await deps.podService.getPod({
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          deliveryId: req.params.deliveryId,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------------------------
  // COD reconciliation (ADR-010)
  // -------------------------------------------------------------------------
  router.post(
    "/cod/collections",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    validateBody(recordCodSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof recordCodSchema>;
        const row = await deps.codService.recordCollection({
          deliveryId: body.deliveryId,
          collectedByRiderId: body.collectedByRiderId,
          amount: body.amount,
          currency: body.currency,
          customerReceivedBy: body.customerReceivedBy ?? null,
          notes: body.notes ?? null,
          metadata: body.metadata ?? null,
        });
        res.status(201).json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/cod/collections",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const parsed = listCodSchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", parsed.error.message);
        }
        const result = await deps.codService.listCollections({
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          filters: {
            branchId: parsed.data.branchId,
            riderId: parsed.data.riderId,
            status: parsed.data.status as "pending" | "reconciled" | "shortage" | "overage" | undefined,
            fromDate: parsed.data.fromDate,
            toDate: parsed.data.toDate,
            limit: parsed.data.limit,
            offset: parsed.data.offset,
          },
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
    "/cod/collections/:id",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireAnyAdminAccess,
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const row = await deps.codService.getCollection({
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          codCollectionId: req.params.id,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/cod/collections/:id/reconcile",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReconcileAccess,
    validateBody(reconcileCodSchema),
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const body = req.body as z.infer<typeof reconcileCodSchema>;
        const row = await deps.codService.reconcile({
          codCollectionId: req.params.id,
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          reconciledAmount: body.reconciledAmount,
          notes: body.notes ?? null,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/cod/collections/:id/resolve",
    adminRateLimiter,
    requireAuthenticatedUser,
    requireReconcileAccess,
    validateBody(resolveCodSchema),
    async (req, res, next) => {
      try {
        const ctx = resolveBranchContext(req as AuthorizedRequest);
        const body = req.body as z.infer<typeof resolveCodSchema>;
        const row = await deps.codService.resolveShortageOrOverage({
          codCollectionId: req.params.id,
          actorUserId: ctx.userId,
          actorBranchIds: ctx.branchIds,
          isSuperAdmin: ctx.isSuperAdmin,
          notes: body.notes ?? null,
        });
        res.json({ ok: true, data: row });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

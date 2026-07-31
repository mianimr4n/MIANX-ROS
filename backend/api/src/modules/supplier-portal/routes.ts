import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import {
  DELIVERY_REF_STATUSES,
  SUPPLIER_DOCUMENT_TYPES,
  SUPPLIER_RESPONSE_TYPES,
  type SupplierPortalService,
} from "../../services/supplier-portal/management.js";

export interface SupplierPortalRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  supplierPortal: SupplierPortalService;
}

const respondSchema = z
  .object({
    responseType: z.enum(SUPPLIER_RESPONSE_TYPES),
    reason: z.string().trim().max(1000).optional().nullable(),
    confirmedDeliveryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "confirmedDeliveryDate must be YYYY-MM-DD")
      .optional()
      .nullable(),
  })
  .strict();

const documentSchema = z
  .object({
    documentType: z.enum(SUPPLIER_DOCUMENT_TYPES),
    title: z.string().trim().min(1).max(200),
    fileUrl: z.string().trim().url().max(2000),
    purchaseOrderId: z.string().uuid().optional().nullable(),
  })
  .strict();

const deliveryRefSchema = z
  .object({
    dispatchNote: z.string().trim().max(160).optional().nullable(),
    invoiceReference: z.string().trim().max(160).optional().nullable(),
    expectedDelivery: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expectedDelivery must be YYYY-MM-DD")
      .optional()
      .nullable(),
    receivingStatus: z.enum(DELIVERY_REF_STATUSES).optional(),
    discrepancyNotes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export function createSupplierPortalRouter(deps: SupplierPortalRouterDependencies) {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  async function withContext(req: AuthorizedRequest) {
    const principal = req.principal!;
    return deps.supplierPortal.resolveContext(principal);
  }

  router.get("/me", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const profile = await deps.supplierPortal.getProfile(ctx);
      return res.json({
        ok: true,
        data: {
          context: ctx,
          profile,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/orders", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.listOrders(ctx);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/orders/:id", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.getOrder(ctx, req.params.id);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/orders/:id/respond",
    requireAuthenticatedUser,
    validateBody(respondSchema),
    async (req, res, next) => {
      try {
        const ctx = await withContext(req as AuthorizedRequest);
        const data = await deps.supplierPortal.respondToOrder(ctx, req.params.id, req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/orders/:id/delivery-ref",
    requireAuthenticatedUser,
    validateBody(deliveryRefSchema),
    async (req, res, next) => {
      try {
        const ctx = await withContext(req as AuthorizedRequest);
        const data = await deps.supplierPortal.upsertDeliveryRef(ctx, req.params.id, req.body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/documents", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.listDocuments(ctx);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/documents",
    requireAuthenticatedUser,
    validateBody(documentSchema),
    async (req, res, next) => {
      try {
        const ctx = await withContext(req as AuthorizedRequest);
        const data = await deps.supplierPortal.createDocument(ctx, req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/performance", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.getPerformance(ctx);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  // Explicit deny for accidental admin-style approve endpoints under portal prefix
  router.post("/orders/:id/approve", requireAuthenticatedUser, (_req, _res, next) => {
    next(
      new ApiError(
        403,
        "SUPPLIER_CANNOT_APPROVE_PO",
        "Suppliers cannot approve purchase orders. Use respond with accept/reject/amendment.",
      ),
    );
  });

  return router;
}

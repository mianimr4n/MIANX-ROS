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
  type SupplierResponseType,
} from "../../services/supplier-portal/management.js";

export interface SupplierPortalRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  supplierPortal: SupplierPortalService;
}

const reasonSchema = z
  .object({
    reason: z.string().trim().min(1).max(1000),
    idempotencyKey: z.string().trim().min(8).max(100).optional().nullable(),
  })
  .strict();

const optionalReasonSchema = z
  .object({
    reason: z.string().trim().max(1000).optional().nullable(),
    confirmedDeliveryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    idempotencyKey: z.string().trim().min(8).max(100).optional().nullable(),
  })
  .strict();

const deliveryDateSchema = z
  .object({
    confirmedDeliveryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "confirmedDeliveryDate must be YYYY-MM-DD"),
    reason: z.string().trim().max(1000).optional().nullable(),
    idempotencyKey: z.string().trim().min(8).max(100).optional().nullable(),
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
      .regex(/^\d{4}-\d{2}-\d{2}$/)
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
    return deps.supplierPortal.resolveContext(req.principal!);
  }

  async function respond(
    req: AuthorizedRequest,
    orderId: string,
    responseType: SupplierResponseType,
    body: {
      reason?: string | null;
      confirmedDeliveryDate?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    const ctx = await withContext(req);
    return deps.supplierPortal.respondToOrder(ctx, orderId, {
      responseType,
      reason: body.reason,
      confirmedDeliveryDate: body.confirmedDeliveryDate,
      idempotencyKey: body.idempotencyKey,
    });
  }

  router.get("/me", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const profile = await deps.supplierPortal.getProfile(ctx);
      return res.json({ ok: true, data: { context: ctx, profile } });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/dashboard", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.getDashboard(ctx);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/orders", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.listOrders(ctx);
      return res.json({ ok: true, data, meta: { count: data.length } });
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
    "/orders/:id/acknowledge",
    requireAuthenticatedUser,
    validateBody(optionalReasonSchema),
    async (req, res, next) => {
      try {
        const data = await respond(req as AuthorizedRequest, req.params.id, "acknowledge", req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/orders/:id/accept",
    requireAuthenticatedUser,
    validateBody(optionalReasonSchema),
    async (req, res, next) => {
      try {
        const data = await respond(req as AuthorizedRequest, req.params.id, "accept", req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/orders/:id/reject",
    requireAuthenticatedUser,
    validateBody(reasonSchema),
    async (req, res, next) => {
      try {
        const data = await respond(req as AuthorizedRequest, req.params.id, "reject", req.body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/orders/:id/request-amendment",
    requireAuthenticatedUser,
    validateBody(reasonSchema),
    async (req, res, next) => {
      try {
        const data = await respond(
          req as AuthorizedRequest,
          req.params.id,
          "request_amendment",
          req.body,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/orders/:id/propose-delivery-date",
    requireAuthenticatedUser,
    validateBody(deliveryDateSchema),
    async (req, res, next) => {
      try {
        const data = await respond(
          req as AuthorizedRequest,
          req.params.id,
          "propose_delivery_date",
          req.body,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/orders/:id/confirm-delivery-date",
    requireAuthenticatedUser,
    validateBody(deliveryDateSchema),
    async (req, res, next) => {
      try {
        const data = await respond(
          req as AuthorizedRequest,
          req.params.id,
          "confirm_delivery_date",
          req.body,
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // Backward-compatible combined respond endpoint
  router.post(
    "/orders/:id/respond",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          responseType: z.enum(SUPPLIER_RESPONSE_TYPES),
          reason: z.string().trim().max(1000).optional().nullable(),
          confirmedDeliveryDate: z
            .string()
            .trim()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .nullable(),
          idempotencyKey: z.string().trim().min(8).max(100).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const data = await respond(
          req as AuthorizedRequest,
          req.params.id,
          req.body.responseType,
          req.body,
        );
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

  router.get("/profile", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const ctx = await withContext(req as AuthorizedRequest);
      const data = await deps.supplierPortal.getProfile(ctx);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/orders/:id/approve", requireAuthenticatedUser, (_req, _res, next) => {
    next(
      new ApiError(
        403,
        "SUPPLIER_CANNOT_APPROVE_PO",
        "Suppliers cannot approve purchase orders. Use accept/reject/amendment responses.",
      ),
    );
  });

  return router;
}

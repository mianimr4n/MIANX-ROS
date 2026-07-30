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
  GOODS_RECEIVING_STATUSES,
  PURCHASE_ORDER_APPROVAL_DECISIONS,
  PURCHASE_ORDER_STATUSES,
  REQUISITION_STATUSES,
  SUPPLIER_INVOICE_STATUSES,
  SUPPLIER_PAYMENT_METHODS,
  SUPPLIER_STATUSES,
  type PurchasingService,
} from "../../services/purchasing/management.js";

export interface AdminPurchasingRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  purchasing: PurchasingService;
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

const createSupplierSchema = z
  .object({
    branchId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    contactPerson: z.string().trim().max(150).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    email: z.union([z.email(), z.literal(""), z.null()]).optional(),
    address: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(SUPPLIER_STATUSES).optional(),
  })
  .strict()
  .transform((body) => ({
    ...body,
    email: body.email === "" ? null : body.email,
  }));

const createOrderSchema = z
  .object({
    branchId: z.string().uuid(),
    supplierId: z.string().uuid(),
    poNumber: z.string().trim().min(1).max(40).nullable().optional(),
    status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
    totalAmount: z.number().finite().min(0).optional(),
    expectedDeliveryDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expectedDeliveryDate must be YYYY-MM-DD")
      .nullable()
      .optional(),
  })
  .strict();

const createRequisitionSchema = z
  .object({
    branchId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(REQUISITION_STATUSES).optional(),
  })
  .strict();

const createReceivingSchema = z
  .object({
    branchId: z.string().uuid(),
    purchaseOrderId: z.string().uuid().nullable().optional(),
    grnNumber: z.string().trim().min(1).max(40).nullable().optional(),
    status: z.enum(GOODS_RECEIVING_STATUSES).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    receivedAt: z.string().trim().min(1).nullable().optional(),
    lines: z
      .array(
        z
          .object({
            inventoryItemId: z.string().uuid().nullable().optional(),
            quantity: z.number().finite().positive(),
          })
          .strict(),
      )
      .max(200)
      .optional(),
  })
  .strict();

const decideOrderApprovalSchema = z
  .object({
    decision: z.enum(PURCHASE_ORDER_APPROVAL_DECISIONS),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const createInvoiceSchema = z
  .object({
    branchId: z.string().uuid(),
    supplierId: z.string().uuid(),
    purchaseOrderId: z.string().uuid().nullable().optional(),
    invoiceNumber: z.string().trim().min(1).max(80),
    invoiceDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "invoiceDate must be YYYY-MM-DD")
      .nullable()
      .optional(),
    totalAmount: z.number().finite().min(0),
    status: z.enum(SUPPLIER_INVOICE_STATUSES).optional(),
  })
  .strict();

const createPaymentSchema = z
  .object({
    branchId: z.string().uuid(),
    supplierId: z.string().uuid(),
    supplierInvoiceId: z.string().uuid(),
    amount: z.number().finite().positive(),
    paymentDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "paymentDate must be YYYY-MM-DD")
      .nullable()
      .optional(),
    paymentMethod: z.enum(SUPPLIER_PAYMENT_METHODS).optional(),
    reference: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

/**
 * Purchasing — suppliers, POs, requisitions, GRN, invoices, payments.
 * Gated by purchasing.manage, finance.manage, or admin.access.
 */
export function createAdminPurchasingRouter(deps: AdminPurchasingRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requirePurchasingAccess = requireAnyPermission([
    "purchasing.manage",
    "finance.manage",
    "admin.access",
  ]);

  router.get(
    "/purchasing/suppliers",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid suppliers query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listSuppliers(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/suppliers",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createSupplierSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createSupplierSchema>;
        const data = await deps.purchasing.createSupplier(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/purchasing/orders",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid purchase orders query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const result = await deps.purchasing.listOrders(scopeFrom(principal), parsed.data.branchId);
        return res.json({
          ok: true,
          data: result.orders,
          meta: {
            count: result.orders.length,
            awaitingDeliveryCount: result.awaitingDeliveryCount,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/orders",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createOrderSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createOrderSchema>;
        const data = await deps.purchasing.createOrder(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/purchasing/orders/:id/approve",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(decideOrderApprovalSchema),
    async (req, res, next) => {
      try {
        const id = z.string().uuid().safeParse(req.params.id);
        if (!id.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid purchase order id.");
        }
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof decideOrderApprovalSchema>;
        const data = await deps.purchasing.decideOrderApproval(
          scopeFrom(principal),
          principal.userId,
          id.data,
          body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/purchasing/requisitions",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid requisitions query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listRequisitions(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/requisitions",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createRequisitionSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createRequisitionSchema>;
        const data = await deps.purchasing.createRequisition(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/purchasing/receiving",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid receiving query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listReceiving(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/receiving",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createReceivingSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createReceivingSchema>;
        const data = await deps.purchasing.createReceiving(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/purchasing/invoices",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid invoices query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listInvoices(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/invoices",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createInvoiceSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createInvoiceSchema>;
        const data = await deps.purchasing.createInvoice(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/purchasing/payments",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid payments query.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.purchasing.listPayments(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/purchasing/payments",
    requireAuthenticatedUser,
    requirePurchasingAccess,
    validateBody(createPaymentSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createPaymentSchema>;
        const data = await deps.purchasing.createPayment(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import type { OrdersDataSource } from "../../services/orders/types.js";

const toppingSlugSchema = z.object({
  slug: z.string().min(1).max(100),
});

const orderExtraSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  /** Accepted for backward compatibility — ignored by pricing engine. */
  price: z.number().nonnegative().optional(),
});

const orderItemSchema = z.object({
  menuItemSlug: z.string().min(1).max(100),
  variantLabel: z.string().max(100).optional(),
  quantity: z.number().int().positive().max(20),
  /** Ignored by server. */
  unitPrice: z.number().nonnegative().optional(),
  /** Ignored by server. */
  productName: z.string().min(1).max(150).optional(),
  variantName: z.string().max(100).optional(),
  instructions: z.string().max(250).optional(),
  toppings: z.array(toppingSlugSchema).max(20).optional(),
  extras: z.array(orderExtraSchema).max(20).optional(),
});

const quoteOrderSchema = z.object({
  branchCode: z.string().min(2).max(100),
  orderType: z.enum(["delivery", "pickup", "dine-in"]),
  couponCode: z.string().max(50).optional(),
  items: z.array(orderItemSchema).min(1).max(50),
});

const createOrderSchema = quoteOrderSchema.extend({
  customerId: z.uuid().optional(),
  orderSource: z.enum(["website", "whatsapp", "mobile", "pos", "admin"]),
  contactName: z.string().min(2).max(150),
  contactPhone: z.string().min(7).max(30),
  deliveryAddress: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

function readIdempotencyKey(headerValue: string | string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof raw === "string" ? raw.trim() : "";
}

export function createOrdersRouter(ordersDataSource: OrdersDataSource) {
  const router = Router();

  router.post("/quote", validateBody(quoteOrderSchema), async (req, res, next) => {
    try {
      const quote = await ordersDataSource.quoteOrder(req.body);
      return res.status(200).json({ ok: true, data: quote });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", validateBody(createOrderSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createOrderSchema>;
      if (body.orderType === "delivery" && !body.deliveryAddress?.trim()) {
        throw new ApiError(
          400,
          "DELIVERY_ADDRESS_REQUIRED",
          "Delivery address is required for delivery orders.",
        );
      }

      const idempotencyKey = readIdempotencyKey(req.header("idempotency-key"));
      if (!idempotencyKey) {
        throw new ApiError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key header is required for order creation.",
        );
      }
      if (idempotencyKey.length > 100) {
        throw new ApiError(400, "VALIDATION_ERROR", "Idempotency-Key is too long.");
      }

      const order = await ordersDataSource.createOrder({
        ...body,
        idempotencyKey,
      });

      const status = order.idempotentReplay ? 200 : 201;
      return res.status(status).json({ ok: true, data: order });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:orderNumber/tracking", async (req, res, next) => {
    try {
      const contactPhone = req.query.phone;

      if (typeof contactPhone !== "string" || contactPhone.trim().length < 7) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Query parameter 'phone' is required for order tracking.",
        );
      }

      const tracking = await ordersDataSource.getOrderTracking(
        req.params.orderNumber,
        contactPhone,
      );

      if (!tracking) {
        throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      }

      return res.json({ ok: true, data: tracking });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

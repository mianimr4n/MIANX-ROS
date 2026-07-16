import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import type { OrdersDataSource } from "../../services/orders/types.js";

const orderExtraSchema = z.object({
  label: z.string().min(1).max(100),
  price: z.number().nonnegative(),
});

const orderItemSchema = z.object({
  menuItemSlug: z.string().min(1).max(100),
  variantLabel: z.string().max(100).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  productName: z.string().min(1).max(150),
  variantName: z.string().max(100).optional(),
  instructions: z.string().max(250).optional(),
  extras: z.array(orderExtraSchema).optional(),
});

const createOrderSchema = z.object({
  branchCode: z.string().min(2).max(100),
  customerId: z.uuid().optional(),
  orderType: z.enum(["delivery", "pickup", "dine-in"]),
  orderSource: z.enum(["website", "whatsapp", "mobile", "pos", "admin"]),
  contactName: z.string().min(2).max(150),
  contactPhone: z.string().min(7).max(30),
  deliveryAddress: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(50).optional(),
  items: z.array(orderItemSchema).min(1),
});

export function createOrdersRouter(ordersDataSource: OrdersDataSource) {
  const router = Router();

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

      const order = await ordersDataSource.createOrder(body);
      return res.status(201).json({ ok: true, data: order });
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

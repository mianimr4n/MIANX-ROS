import { Router } from "express";
import { z } from "zod";

import { sendNotImplemented, validateBody } from "../../common/http.js";

const orderItemSchema = z.object({
  menuItemId: z.uuid(),
  variantId: z.uuid().optional(),
  quantity: z.number().int().positive(),
  instructions: z.string().max(250).optional(),
});

const createOrderSchema = z.object({
  branchId: z.uuid(),
  customerId: z.uuid().optional(),
  orderType: z.enum(["delivery", "pickup", "dine-in"]),
  orderSource: z.enum(["website", "whatsapp", "mobile", "pos", "admin"]),
  contactName: z.string().min(2).max(150),
  contactPhone: z.string().min(7).max(30),
  deliveryAddress: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1),
});

export function createOrdersRouter() {
  const router = Router();

  router.post("/", validateBody(createOrderSchema), (_req, res) =>
    sendNotImplemented(res, "Order creation", ["order.create"]),
  );

  router.get("/:orderNumber/tracking", (_req, res) =>
    sendNotImplemented(res, "Order tracking", ["order.read"]),
  );

  return router;
}

import { isApiConfigured } from "@/lib/api";
import {
  type CreateWebsiteOrderPayload,
  type CreatedOrderResult,
  saveLocalOrder,
  pushNotification,
} from "@/lib/customer-store";
import { createOrderWithIdempotency, quoteOrder } from "@/lib/telepizza-api";

export async function submitWebsiteOrder(
  payload: CreateWebsiteOrderPayload,
): Promise<CreatedOrderResult> {
  if (isApiConfigured) {
    try {
      // 1) Request a server quote (bind cart/branch/type/phone)
      const quote = await quoteOrder({
        branchCode: payload.branchCode,
        orderType: payload.orderType,
        couponCode: payload.couponCode,
        contactPhone: payload.contactPhone,
        items: payload.items,
      });

      // 2) Generate an idempotency key for this attempt
      const idempotencyKey = crypto.randomUUID();

      // 3) Create order with quoteId + Idempotency-Key
      const apiOrder = await createOrderWithIdempotency({
        branchCode: payload.branchCode,
        orderType: payload.orderType,
        orderSource: "website",
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        deliveryAddress: payload.deliveryAddress,
        notes: payload.notes,
        couponCode: payload.couponCode,
        items: payload.items,
        quoteId: quote.quoteId,
      }, idempotencyKey);

      const result: CreatedOrderResult = {
        orderNumber: apiOrder.orderNumber,
        status: apiOrder.status,
        subtotal: apiOrder.subtotal,
        totalAmount: apiOrder.totalAmount,
        createdAt: apiOrder.createdAt,
        source: "api",
      };

      saveLocalOrder(payload, {
        orderNumber: apiOrder.orderNumber,
        status: apiOrder.status,
        source: "api",
      });

      pushNotification(
        payload.contactPhone,
        "Order placed",
        `Your order ${apiOrder.orderNumber} was received by ${payload.branchName}.`,
      );

      return result;
    } catch (error) {
      console.warn("API order failed; saving locally.", error);
    }
  }

  const local = saveLocalOrder(payload);
  pushNotification(
    payload.contactPhone,
    "Order saved locally",
    `Your order ${local.orderNumber} is ready to confirm on WhatsApp.`,
  );
  return local;
}

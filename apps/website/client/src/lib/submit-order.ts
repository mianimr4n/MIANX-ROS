import { isApiConfigured } from "@/lib/api";
import {
  type CreateWebsiteOrderPayload,
  type CreatedOrderResult,
  saveLocalOrder,
  addLoyaltyPoints,
  pushNotification,
} from "@/lib/customer-store";
import { createOrder } from "@/lib/telepizza-api";

export async function submitWebsiteOrder(
  payload: CreateWebsiteOrderPayload,
): Promise<CreatedOrderResult> {
  if (isApiConfigured) {
    try {
      const apiOrder = await createOrder({
        branchCode: payload.branchCode,
        orderType: payload.orderType,
        orderSource: "website",
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        deliveryAddress: payload.deliveryAddress,
        notes: payload.notes,
        couponCode: payload.couponCode,
        items: payload.items,
      });

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

      const points = Math.floor(apiOrder.totalAmount / 100);
      if (points > 0) {
        addLoyaltyPoints(payload.contactPhone, points);
      }

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
  const points = Math.floor(local.totalAmount / 100);
  if (points > 0) {
    addLoyaltyPoints(payload.contactPhone, points);
  }
  pushNotification(
    payload.contactPhone,
    "Order saved locally",
    `Your order ${local.orderNumber} is ready to confirm on WhatsApp.`,
  );
  return local;
}

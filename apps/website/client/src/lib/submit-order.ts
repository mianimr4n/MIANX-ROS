import { isApiConfigured } from "@/lib/api";
import {
  type CreateWebsiteOrderPayload,
  type CreatedOrderResult,
  saveLocalOrder,
  pushNotification,
} from "@/lib/customer-store";
import { createOrderWithIdempotency, quoteOrder } from "@/lib/telepizza-api";
import { getSupabaseClient } from "@/lib/supabase";
import { normalizePhoneE164 } from "@/lib/phone";

export async function submitWebsiteOrder(
  payload: CreateWebsiteOrderPayload,
): Promise<CreatedOrderResult> {
  if (isApiConfigured) {
    try {
      // 1) Request a server quote (bind cart/branch/type/phone)
      const normalizedPhone = normalizePhoneE164(payload.contactPhone);
      const quote = await quoteOrder({
        branchCode: payload.branchCode,
        orderType: payload.orderType,
        couponCode: payload.couponCode,
        contactPhone: normalizedPhone,
        items: payload.items,
      });

      // 2) Use (or generate) an idempotency key for this attempt (callers should persist across retries)
      const idempotencyKey =
        (globalThis as any).__telepizza_idk__ || ((globalThis as any).__telepizza_idk__ = crypto.randomUUID());

      // 2.a) Resolve optional bearer token
      const supabase = getSupabaseClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const accessToken = data?.session?.access_token;

      // 3) Create order with quoteId + Idempotency-Key
      const apiOrder = await createOrderWithIdempotency({
        branchCode: payload.branchCode,
        orderType: payload.orderType,
        orderSource: "website",
        contactName: payload.contactName,
        contactPhone: normalizedPhone,
        deliveryAddress: payload.deliveryAddress,
        notes: payload.notes,
        couponCode: payload.couponCode,
        items: payload.items,
        quoteId: quote.quoteId,
      }, idempotencyKey, accessToken);

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
    normalizePhoneE164(payload.contactPhone),
    "Order saved locally",
    `Your order ${local.orderNumber} is ready to confirm on WhatsApp.`,
  );
  return local;
}

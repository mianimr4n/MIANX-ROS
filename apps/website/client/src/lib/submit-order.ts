import { ApiRequestError, isApiConfigured } from "@/lib/api";
import {
  type CreateWebsiteOrderPayload,
  type CreatedOrderResult,
  saveLocalOrder,
  pushNotification,
} from "@/lib/customer-store";
import { createOrderWithIdempotency } from "@/lib/telepizza-api";
import { normalizePhoneE164 } from "@/lib/phone";
import { mapCheckoutApiError } from "@/lib/checkout-order";

export interface SubmitWebsiteOrderOptions {
  idempotencyKey: string;
  quoteId: string;
  accessToken?: string;
  /** When true and API is configured, API failures throw instead of LOC-* fallback. */
  requireApiSuccess?: boolean;
}

export class CheckoutSubmitError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = "CheckoutSubmitError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function wrapApiError(error: unknown): never {
  if (error instanceof ApiRequestError) {
    const code = (error as ApiRequestError & { code?: string }).code;
    throw new CheckoutSubmitError(
      mapCheckoutApiError(code, error.message),
      code,
      error.statusCode,
    );
  }
  if (error instanceof CheckoutSubmitError) {
    throw error;
  }
  throw new CheckoutSubmitError("Could not place order. Please try again.");
}

export async function submitWebsiteOrder(
  payload: CreateWebsiteOrderPayload,
  options: SubmitWebsiteOrderOptions,
): Promise<CreatedOrderResult> {
  const normalizedPhone = normalizePhoneE164(payload.contactPhone);

  if (isApiConfigured) {
    try {
      const apiOrder = await createOrderWithIdempotency(
        {
          branchCode: payload.branchCode,
          orderType: payload.orderType,
          orderSource: "website",
          contactName: payload.contactName,
          contactPhone: normalizedPhone,
          deliveryAddress: payload.deliveryAddress,
          notes: payload.notes,
          couponCode: payload.couponCode,
          items: payload.items,
          quoteId: options.quoteId,
        },
        options.idempotencyKey,
        options.accessToken,
      );

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
        subtotal: apiOrder.subtotal,
        totalAmount: apiOrder.totalAmount,
        createdAt: apiOrder.createdAt,
        source: "api",
      });

      try {
        pushNotification(
          payload.contactPhone,
          "Order placed",
          `Your order ${apiOrder.orderNumber} was received by ${payload.branchName}.`,
        );
      } catch (notificationError) {
        console.warn("Order placed but local notification failed.");
        void notificationError;
      }

      return result;
    } catch (error) {
      if (options.requireApiSuccess !== false) {
        wrapApiError(error);
      }
      console.warn("API order failed; saving locally.");
    }
  }

  const local = saveLocalOrder(payload, { source: "local" });
  try {
    pushNotification(
      normalizedPhone,
      "Order saved locally",
      `Your order ${local.orderNumber} is pending — confirm on WhatsApp.`,
    );
  } catch (notificationError) {
    console.warn("Local order saved but notification failed.");
    void notificationError;
  }
  return local;
}

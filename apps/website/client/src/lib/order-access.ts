/** Mirrors backend O5 — pending only, 15-minute guest cancel window. */
export const CUSTOMER_CANCEL_WINDOW_MS = 15 * 60 * 1000;

const CANCEL_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: "Order not found. Check the order number and phone.",
  ORDER_ACCESS_DENIED: "Phone number does not match this order.",
  ORDER_CANCEL_NOT_ALLOWED:
    "This order can no longer be cancelled online. Please contact the branch on WhatsApp.",
  ORDER_CANCEL_WINDOW_EXPIRED:
    "The online cancellation window has expired. Please contact the branch on WhatsApp.",
  ORDER_INVALID_TRANSITION:
    "Order status changed and can no longer be cancelled online.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
};

export function canGuestCancelOrder(status: string, createdAt: string, nowMs: number = Date.now()): boolean {
  if (status !== "pending") return false;
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= CUSTOMER_CANCEL_WINDOW_MS;
}

export function mapCancelApiError(code: string | undefined, fallbackMessage: string): string {
  if (code && CANCEL_ERROR_MESSAGES[code]) {
    return CANCEL_ERROR_MESSAGES[code];
  }
  if (fallbackMessage) return fallbackMessage;
  return "Could not cancel order. Please try again or contact the branch on WhatsApp.";
}

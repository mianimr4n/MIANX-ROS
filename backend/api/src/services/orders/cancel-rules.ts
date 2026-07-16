/** Customer self-cancel window for pending orders (O5). */
export const CUSTOMER_CANCEL_WINDOW_MS = 15 * 60 * 1000;

const TERMINAL_STATUSES = new Set(["dispatched", "completed", "cancelled"]);

export function assertCustomerCancelAllowed(input: {
  status: string;
  createdAt: string;
  nowMs?: number;
}): void {
  const nowMs = input.nowMs ?? Date.now();
  const createdMs = Date.parse(input.createdAt);

  if (TERMINAL_STATUSES.has(input.status)) {
    throw new CustomerCancelNotAllowedError(
      "ORDER_CANCEL_NOT_ALLOWED",
      "This order can no longer be cancelled online.",
    );
  }

  if (input.status !== "pending") {
    throw new CustomerCancelNotAllowedError(
      "ORDER_CANCEL_NOT_ALLOWED",
      "Only pending orders can be cancelled online. Please contact the branch on WhatsApp.",
    );
  }

  if (!Number.isFinite(createdMs) || nowMs - createdMs > CUSTOMER_CANCEL_WINDOW_MS) {
    throw new CustomerCancelNotAllowedError(
      "ORDER_CANCEL_WINDOW_EXPIRED",
      "The online cancellation window has expired. Please contact the branch on WhatsApp.",
    );
  }
}

export class CustomerCancelNotAllowedError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CustomerCancelNotAllowedError";
    this.code = code;
  }
}

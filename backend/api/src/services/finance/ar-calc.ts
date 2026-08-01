/**
 * RC4-8 AR allocation / overdue helpers (pure).
 */

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID"
  | "CREDITED";

export function classifyInvoiceStatus(input: {
  status: InvoiceStatus;
  balanceDue: number;
  totalAmount: number;
  dueDate: string | null;
  asOf: string;
}): InvoiceStatus {
  if (["DRAFT", "VOID", "CREDITED", "PAID"].includes(input.status)) {
    return input.status;
  }
  if (input.balanceDue <= 0) return "PAID";
  if (input.balanceDue < input.totalAmount) {
    if (input.dueDate && input.asOf > input.dueDate) return "OVERDUE";
    return "PARTIALLY_PAID";
  }
  if (input.dueDate && input.asOf > input.dueDate) return "OVERDUE";
  return "ISSUED";
}

export function allocateReceiptAmount(
  receiptAmount: number,
  allocations: Array<{ invoiceId: string; amount: number; balanceDue: number }>,
): { ok: true; remaining: number } | { ok: false; error: string } {
  if (!(receiptAmount > 0)) return { ok: false, error: "RECEIPT_AMOUNT_INVALID" };
  let remaining = Math.round(receiptAmount * 100) / 100;
  const seen = new Set<string>();
  for (const row of allocations) {
    if (seen.has(row.invoiceId)) return { ok: false, error: "DUPLICATE_INVOICE_ALLOCATION" };
    seen.add(row.invoiceId);
    if (!(row.amount > 0)) return { ok: false, error: "ALLOCATION_AMOUNT_INVALID" };
    if (row.amount - row.balanceDue > 0.001) return { ok: false, error: "OVER_ALLOCATION" };
    remaining = Math.round((remaining - row.amount) * 100) / 100;
    if (remaining < -0.001) return { ok: false, error: "OVER_ALLOCATION" };
  }
  return { ok: true, remaining: Math.max(0, remaining) };
}

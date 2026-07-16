/** Pure helpers for Sprint 4.1 order create hardening (no I/O). */

export function normalizeContactPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function requireDeliveryAddress(
  orderType: "delivery" | "pickup" | "dine-in",
  deliveryAddress: string | undefined,
): string | undefined {
  if (orderType !== "delivery") {
    return deliveryAddress?.trim() || undefined;
  }

  const trimmed = deliveryAddress?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

export function formatExtrasInstructions(
  existing: string | undefined,
  extras: Array<{ label: string; price: number }> | undefined,
): string | null {
  const parts: string[] = [];
  if (existing?.trim()) {
    parts.push(existing.trim());
  }
  if (extras?.length) {
    const extrasLine = extras
      .map((extra) => `${extra.label} (+${extra.price})`)
      .join(", ");
    parts.push(`Extras: ${extrasLine}`);
  }
  return parts.length ? parts.join(" | ") : null;
}

export function buildOrderNotes(
  notes: string | undefined,
  couponCode: string | undefined,
): string | null {
  const parts = [notes?.trim(), couponCode?.trim() ? `Promo code: ${couponCode.trim()}` : null].filter(
    Boolean,
  ) as string[];
  return parts.length ? parts.join("\n") : null;
}

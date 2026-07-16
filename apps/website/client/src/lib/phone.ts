export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Checkout/order contact phone — best-effort Pakistan E.164 (+923XXXXXXXXX).
 * Keeps a trimmed fallback for non-PK formats rather than throwing.
 */
export function normalizePhoneE164(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.startsWith("92") && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+92${digits}`;
  }
  if (digits.length >= 7) {
    return `+${digits}`;
  }
  return phone.trim();
}

export type PhoneNormalizationResult =
  | { ok: true; e164: string }
  | { ok: false; message: string };

/**
 * Strict Pakistani mobile for customer profile storage.
 * Accepts 03XXXXXXXXX, +923XXXXXXXXX, or 3XXXXXXXXX → +923XXXXXXXXX.
 */
export function normalizePakistaniMobileE164(phone: string): PhoneNormalizationResult {
  const digits = normalizePhoneDigits(phone);

  let national: string | null = null;
  if (digits.startsWith("92") && digits.length === 12 && digits[2] === "3") {
    national = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11 && digits[1] === "3") {
    national = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    national = digits;
  }

  if (!national || !/^3\d{9}$/.test(national)) {
    return {
      ok: false,
      message: "Enter a valid Pakistani mobile number (03XXXXXXXXX or +923XXXXXXXXX).",
    };
  }

  return { ok: true, e164: `+92${national}` };
}

export function isPakistaniMobileE164(phone: string | null | undefined): boolean {
  return typeof phone === "string" && /^\+923\d{9}$/.test(phone);
}

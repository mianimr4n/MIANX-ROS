import { normalizePhoneDigits } from "./pricing.js";

/** Guest/customer phone proof — digits-only with Pakistan local/intl tolerance. */
export function contactPhoneMatchesOrder(
  storedPhone: string | null | undefined,
  storedPhoneE164: string | null | undefined,
  inputPhone: string,
): boolean {
  const storedDigits = normalizePhoneDigits(storedPhoneE164 || storedPhone || "");
  const inputDigits = normalizePhoneDigits(inputPhone);
  if (!storedDigits || !inputDigits) return false;

  return (
    storedDigits === inputDigits ||
    storedDigits.endsWith(inputDigits) ||
    inputDigits.endsWith(storedDigits.replace(/^92/, "")) ||
    normalizePhoneDigits(storedPhone || "") === inputDigits
  );
}

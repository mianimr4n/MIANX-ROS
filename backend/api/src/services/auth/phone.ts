import { ApiError } from "../../common/http.js";

/**
 * Normalize Pakistani mobile numbers to +923XXXXXXXXX.
 * Accepts 03XXXXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX, or 3XXXXXXXXX.
 */
export function normalizePakistaniMobileE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  let national: string | null = null;
  if (digits.startsWith("92") && digits.length === 12 && digits[2] === "3") {
    national = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11 && digits[1] === "3") {
    national = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    national = digits;
  }

  if (!national || !/^3\d{9}$/.test(national)) {
    throw new ApiError(
      400,
      "INVALID_PHONE",
      "Enter a valid Pakistani mobile number (03XXXXXXXXX or +923XXXXXXXXX).",
    );
  }

  return `+92${national}`;
}

export function isPakistaniMobileE164(phone: string | null | undefined): boolean {
  return typeof phone === "string" && /^\+923\d{9}$/.test(phone);
}

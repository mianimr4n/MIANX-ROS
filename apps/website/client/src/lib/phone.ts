export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Canonical Pakistan E.164 (+923XXXXXXXXX)
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


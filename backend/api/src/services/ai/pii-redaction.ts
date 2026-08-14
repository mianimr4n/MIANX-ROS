/**
 * PII redaction utility (ADR-013 §2).
 *
 * Redacts PII from prompts BEFORE forwarding to AI providers.
 * Defense-in-depth — not a guarantee. ADR-015 ensures raw prompts are
 * NEVER stored, so even if redaction misses something, the database
 * does not accumulate PII.
 *
 * Redaction rules:
 *   - E.164 phone numbers (+923XXXXXXXXX) → [PHONE]
 *   - Pakistani mobile without + (03XXXXXXXXX) → [PHONE]
 *   - Email addresses → [EMAIL]
 *   - Credit card numbers (16 digits, optional dashes) → [CARD]
 *   - Pakistani CNIC (XXXXX-XXXXXXX-X) → [CNIC]
 *
 * Authority: ADR-013 §2 (PII redaction before forwarding)
 */

/**
 * Redact PII from a prompt. Returns the redacted string.
 * Pure function — no side effects, no DB calls.
 */
export function redactPii(prompt: string): string {
  if (typeof prompt !== "string" || prompt.length === 0) {
    return "";
  }

  let result = prompt;

  // E.164 phone: +<country><number> (8-15 digits after +)
  result = result.replace(/\+\d{8,15}\b/g, "[PHONE]");

  // Pakistani mobile without +: 03XXXXXXXXX (11 digits starting with 03)
  result = result.replace(/\b03\d{9}\b/g, "[PHONE]");

  // Email addresses
  result = result.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    "[EMAIL]",
  );

  // Credit card numbers (16 digits, optional spaces or dashes between groups)
  result = result.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    "[CARD]",
  );

  // Pakistani CNIC: XXXXX-XXXXXXX-X (5 digits, dash, 7 digits, dash, 1 digit)
  result = result.replace(/\b\d{5}-\d{7}-\d\b/g, "[CNIC]");

  return result;
}

/**
 * Detect the dominant language of a prompt. Very simple heuristic:
 *   - If contains Urdu Unicode characters (U+0600-U+06FF), returns "ur"
 *   - Otherwise returns "en"
 *
 * This is NOT a real language detector — just enough for analytics
 * routing. For production, consider a library like franc or langdetect.
 */
export function detectPromptLanguage(prompt: string): string {
  if (typeof prompt !== "string" || prompt.length === 0) {
    return "en";
  }
  // Count Urdu characters
  const urduChars = (prompt.match(/[\u0600-\u06FF]/g) || []).length;
  // If >10% of alphanumeric characters are Urdu, classify as "ur"
  const alphaChars = (prompt.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
  if (alphaChars > 0 && urduChars / alphaChars > 0.1) {
    return "ur";
  }
  return "en";
}

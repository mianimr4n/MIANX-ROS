/**
 * Safe post-auth redirects for customer Google + email login.
 * Never trust arbitrary external `next` URLs.
 */

export const DEFAULT_AUTH_DESTINATION = "/account";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Approved website origins (Supabase redirect allowlist must match). */
export const APPROVED_AUTH_ORIGINS = [
  "https://telepizza-website.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
] as const;

const AUTH_NEXT_STORAGE_KEY = "telepizza.auth.next";

/** Internal destinations customers may resume after OAuth / login. */
const SAFE_AUTH_DESTINATION_PREFIXES = [
  "/account",
  "/checkout",
  "/orders",
  "/menu",
  "/track",
  "/order-success",
] as const;

export function isSafeInternalAuthPath(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[\s<>"']/.test(trimmed)) return false;
  // Never bounce back into the callback itself (loop guard).
  if (trimmed === AUTH_CALLBACK_PATH || trimmed.startsWith(`${AUTH_CALLBACK_PATH}?`)) {
    return false;
  }
  if (trimmed === "/login" || trimmed.startsWith("/login?")) return false;
  if (trimmed === "/register" || trimmed.startsWith("/register?")) return false;

  const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
  return SAFE_AUTH_DESTINATION_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );
}

export function sanitizeAuthNextPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_AUTH_DESTINATION,
): string {
  return isSafeInternalAuthPath(value) ? value.trim() : fallback;
}

export function rememberAuthNextPath(value: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeAuthNextPath(value, "");
  if (!safe) {
    window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, safe);
}

export function consumeAuthNextPath(fallback: string = DEFAULT_AUTH_DESTINATION): string {
  if (typeof window === "undefined") return fallback;
  const stored = window.sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
  return sanitizeAuthNextPath(stored, fallback);
}

export function peekAuthNextFromLocationSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const next = params.get("next");
    return isSafeInternalAuthPath(next) ? next.trim() : null;
  } catch {
    return null;
  }
}

/**
 * OAuth redirectTo — always this website's `/auth/callback`.
 * Intended destination is carried via sessionStorage, not an open redirect.
 */
export function getGoogleOAuthRedirectTo(): string {
  if (typeof window === "undefined") {
    return AUTH_CALLBACK_PATH;
  }
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

/**
 * Email confirmation + resend redirect — same callback as Google OAuth.
 * Must be listed under Supabase Auth → Redirect URLs.
 */
export function getEmailConfirmationRedirectTo(): string {
  return getGoogleOAuthRedirectTo();
}

export function mapOAuthCallbackError(raw: string | null | undefined): string {
  const normalized = (raw ?? "").toLowerCase();
  if (!normalized) {
    return "Sign-in could not be completed. Please try again.";
  }
  if (
    normalized.includes("access_denied") ||
    normalized.includes("user cancelled") ||
    normalized.includes("user canceled") ||
    normalized.includes("consent")
  ) {
    return "Google sign-in was cancelled. You can try again or use email.";
  }
  return "Sign-in could not be completed. Please try again.";
}

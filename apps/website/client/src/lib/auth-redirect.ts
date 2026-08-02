/**
 * Safe post-auth redirects for customer Google + email login.
 * Never trust arbitrary external `next` URLs.
 */

export const DEFAULT_AUTH_DESTINATION = "/my-telepizza";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const PASSWORD_RECOVERY_PATH = "/reset-password";

/** Canonical Production website origin (password recovery redirect fallback). */
export const PRODUCTION_AUTH_ORIGIN = "https://telepizza-website.vercel.app";

/** Canonical local website origin for password recovery. */
export const LOCAL_AUTH_ORIGIN = "http://localhost:3000";

/** Approved website origins (Supabase redirect allowlist must match). */
export const APPROVED_AUTH_ORIGINS = [
  PRODUCTION_AUTH_ORIGIN,
  LOCAL_AUTH_ORIGIN,
  "http://localhost:5173",
] as const;

const AUTH_NEXT_STORAGE_KEY = "telepizza.auth.next";

/** Internal destinations customers may resume after OAuth / login / recovery. */
const SAFE_AUTH_DESTINATION_PREFIXES = [
  "/my-telepizza",
  "/welcome",
  "/account",
  "/checkout",
  "/orders",
  "/menu",
  "/track",
  "/order-success",
  "/reset-password",
  "/forgot-password",
  "/branches",
  "/settings",
  "/favorites",
  "/notifications",
] as const;

/** After email confirmation (signup), land here for profile completion — not a generic dashboard. */
export const POST_SIGNUP_DESTINATION = "/welcome";

const AUTH_FLOW_STORAGE_KEY = "telepizza.auth.flow";

export type AuthEmailFlow = "recovery" | "email_change" | "signup";

export function rememberAuthEmailFlow(flow: AuthEmailFlow): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_FLOW_STORAGE_KEY, flow);
}

export function consumeAuthEmailFlow(): AuthEmailFlow | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(AUTH_FLOW_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_FLOW_STORAGE_KEY);
  if (value === "recovery" || value === "email_change" || value === "signup") {
    return value;
  }
  return null;
}

export function peekAuthEmailFlowFromLocation(): AuthEmailFlow | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = (params.get("type") || hashParams.get("type") || "").toLowerCase();
    if (type === "recovery") return "recovery";
    if (type === "email_change" || type === "email_change_current" || type === "email_change_new") {
      return "email_change";
    }
    if (type === "signup" || type === "invite") return "signup";
  } catch {
    /* ignore */
  }
  return null;
}

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

/** Build an auth route href that preserves a safe post-login destination. */
export function buildAuthHref(path: string, next?: string | null): string {
  const safeNext = next && isSafeInternalAuthPath(next) ? next.trim() : null;
  if (!safeNext || safeNext === DEFAULT_AUTH_DESTINATION) {
    return path;
  }
  return `${path}?next=${encodeURIComponent(safeNext)}`;
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
export function getOAuthRedirectTo(): string {
  if (typeof window === "undefined") {
    return AUTH_CALLBACK_PATH;
  }
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

/** @deprecated Prefer getOAuthRedirectTo — kept for existing call sites/tests. */
export function getGoogleOAuthRedirectTo(): string {
  return getOAuthRedirectTo();
}

/**
 * Email confirmation + resend redirect — same callback as social OAuth.
 * Must be listed under Supabase Auth → Redirect URLs.
 */
export function getEmailConfirmationRedirectTo(): string {
  return getOAuthRedirectTo();
}

/**
 * Resolve an allowlisted website origin for auth redirects.
 * Never trusts arbitrary client-provided URLs — unknown origins fall back to Production.
 */
export function resolveApprovedAuthOrigin(candidate?: string | null): string {
  const raw =
    (candidate ?? (typeof window !== "undefined" ? window.location.origin : "")).trim() ||
    PRODUCTION_AUTH_ORIGIN;
  let origin = raw;
  try {
    origin = new URL(raw).origin;
  } catch {
    return PRODUCTION_AUTH_ORIGIN;
  }
  if ((APPROVED_AUTH_ORIGINS as readonly string[]).includes(origin)) {
    // Prefer canonical local :3000 when the app is served from Vite :5173 unless caller is already :3000.
    if (origin === "http://localhost:5173") {
      return LOCAL_AUTH_ORIGIN;
    }
    return origin;
  }
  return PRODUCTION_AUTH_ORIGIN;
}

/**
 * Password recovery email redirect — lands directly on `/reset-password`.
 * Production: https://telepizza-website.vercel.app/reset-password
 * Local: http://localhost:3000/reset-password
 * Must be listed under Supabase Auth → Redirect URLs.
 */
export function getPasswordRecoveryRedirectTo(): string {
  return `${resolveApprovedAuthOrigin()}${PASSWORD_RECOVERY_PATH}`;
}

/**
 * After Supabase consumes the recovery fragment/code, drop tokens from the visible URL.
 * Never logs the previous URL, hash, or query.
 */
export function clearSensitiveAuthUrl(pathname: string = PASSWORD_RECOVERY_PATH): void {
  if (typeof window === "undefined") return;
  const safePath = pathname.startsWith("/") ? pathname.split(/[?#]/)[0] || PASSWORD_RECOVERY_PATH : PASSWORD_RECOVERY_PATH;
  window.history.replaceState({}, document.title, safePath);
}

export function getEmailChangeRedirectTo(): string {
  return getOAuthRedirectTo();
}

export function mapOAuthCallbackError(raw: string | null | undefined): string {
  const normalized = (raw ?? "").toLowerCase();
  if (!normalized) {
    return "Unable to sign in. Please try again.";
  }
  if (
    normalized.includes("otp_expired") ||
    normalized.includes("expired") ||
    normalized.includes("token has expired") ||
    normalized.includes("flow_state_expired")
  ) {
    return "This link has expired. Request a new email and try again.";
  }
  if (
    normalized.includes("otp_disabled") ||
    normalized.includes("invalid") ||
    normalized.includes("token not found") ||
    normalized.includes("flow_state_not_found")
  ) {
    return "This link is invalid or was already used. Request a new email if you still need access.";
  }
  if (normalized.includes("email_exists") || normalized.includes("already been registered")) {
    return "This sign-in method is already linked to another Telepizza account. Sign in with that method, or use a different email.";
  }
  if (
    normalized.includes("access_denied") ||
    normalized.includes("user cancelled") ||
    normalized.includes("user canceled") ||
    normalized.includes("consent")
  ) {
    return "Login cancelled. You can try again or use email.";
  }
  return "Unable to sign in. Please try again.";
}

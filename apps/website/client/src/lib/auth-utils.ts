import { mapIdentityConflictMessage } from "@/lib/auth-identity";

export const AUTH_MIN_PASSWORD_LENGTH = 8;

/** Matches production Supabase strength policy (letters + digit + symbol). */
export const AUTH_PASSWORD_REQUIREMENTS_COPY =
  "At least 8 characters, including uppercase, lowercase, a number, and a symbol.";

export type SignupInput = {
  email: string;
  password: string;
  fullName?: string;
};

export type SignupValidationResult =
  | { ok: true; email: string; password: string; fullName?: string }
  | { ok: false; message: string };

export type PasswordValidationResult = { ok: true } | { ok: false; message: string };

/**
 * Google OAuth for customers (social-first UX).
 * Enabled by default when Supabase is configured; set VITE_GOOGLE_OAUTH_ENABLED=false to hide.
 * Provider credentials live in Supabase Auth (Google) — never in the frontend.
 */
export function isGoogleOAuthConfigured(): boolean {
  const flag = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  return flag === "true" || flag === "1" || flag === "on" || flag === undefined || flag === "";
}

/**
 * Facebook OAuth for customers.
 * Enabled by default when Supabase is configured; set VITE_FACEBOOK_OAUTH_ENABLED=false to hide.
 * App credentials live in Supabase Auth (Facebook) — never in the frontend.
 * Scopes are limited to public_profile + email (see auth-identity.ts).
 */
export function isFacebookOAuthConfigured(): boolean {
  const flag = import.meta.env.VITE_FACEBOOK_OAUTH_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  return flag === "true" || flag === "1" || flag === "on" || flag === undefined || flag === "";
}

export { getGoogleOAuthRedirectTo, getOAuthRedirectTo } from "@/lib/auth-redirect";

export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (!hasLower || !hasUpper || !hasDigit || !hasSymbol) {
    return {
      ok: false,
      message: AUTH_PASSWORD_REQUIREMENTS_COPY,
    };
  }

  return { ok: true };
}

export function validateSignupInput(input: SignupInput): SignupValidationResult {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.ok) {
    return passwordCheck;
  }

  return {
    ok: true,
    email,
    password,
    fullName: fullName || undefined,
  };
}

export type AuthIdentityUser = {
  app_metadata?: { provider?: string; providers?: string[] };
  identities?: Array<{ provider?: string }>;
  user_metadata?: Record<string, unknown> | null;
} | null;

/** True when the Supabase user has a Google OAuth identity linked. */
export function hasGoogleIdentity(user: AuthIdentityUser): boolean {
  return hasProviderIdentity(user, "google");
}

/** True when the Supabase user has a Facebook OAuth identity linked. */
export function hasFacebookIdentity(user: AuthIdentityUser): boolean {
  return hasProviderIdentity(user, "facebook");
}

function hasProviderIdentity(user: AuthIdentityUser, provider: string): boolean {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes(provider)) return true;
  if (user.app_metadata?.provider === provider) return true;
  if (Array.isArray(user.identities) && user.identities.some((entry) => entry.provider === provider)) {
    return true;
  }
  return false;
}

/**
 * True when email/password is already attached (email identity present).
 * Used to decide first-time password set (OAuth-only) vs change-password.
 * Never treats Google OAuth alone as having a Telepizza password.
 */
export function hasEmailIdentity(user: AuthIdentityUser): boolean {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("email")) return true;
  if (user.app_metadata?.provider === "email") return true;
  if (Array.isArray(user.identities) && user.identities.some((entry) => entry.provider === "email")) {
    return true;
  }
  return false;
}

/** OAuth-only (or any account without email/password identity) setting a Telepizza password. */
export function isFirstTimePasswordAttach(user: AuthIdentityUser): boolean {
  if (!user) return false;
  // Email/password identity present → change-password requires current Telepizza password.
  if (hasEmailIdentity(user)) return false;
  // Google (or other OAuth) without email identity → set password with updateUser({ password }) only.
  return true;
}

export function genericAuthErrorMessage(): string {
  return "Invalid email or password.";
}

export function mapSupabaseAuthError(message: string | undefined): string {
  const conflict = mapIdentityConflictMessage(message);
  if (conflict) return conflict;

  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("email rate limit") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("429")
  ) {
    return "Too many email requests. Please wait a few minutes and try again.";
  }

  if (
    normalized.includes("error sending confirmation") ||
    normalized.includes("error sending magic link") ||
    normalized.includes("error sending recovery") ||
    normalized.includes("unable to send") ||
    normalized.includes("smtp")
  ) {
    return "We could not send the email right now. Check spam later or try again in a few minutes.";
  }

  if (
    normalized.includes("otp_expired") ||
    normalized.includes("token has expired") ||
    normalized.includes("flow_state_expired") ||
    (normalized.includes("expired") && normalized.includes("link"))
  ) {
    return "This link has expired. Request a new email and try again.";
  }

  if (
    normalized.includes("same email") ||
    normalized.includes("email address is the same") ||
    normalized.includes("new email is the same")
  ) {
    return "Enter a different email address than your current one.";
  }

  if (
    normalized.includes("provider is not enabled") ||
    normalized.includes("unsupported provider") ||
    normalized.includes("validation_failed")
  ) {
    return "That sign-in method is not available right now. Please use another option, or try again later.";
  }

  // Secure password-change setting: current Telepizza password required (never Google password).
  if (
    normalized.includes("current password required") ||
    normalized.includes("current_password") ||
    normalized.includes("error_code_current_password")
  ) {
    return "Enter your current Telepizza password to change it. This is not your Google password.";
  }

  if (
    normalized.includes("reauthentication") ||
    normalized.includes("reauth") ||
    normalized.includes("session is not recent") ||
    normalized.includes("fresh authentication")
  ) {
    return "For security, sign out and sign back in with Google or Facebook, then set your password again.";
  }

  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("user not found") ||
    normalized.includes("invalid_grant")
  ) {
    return genericAuthErrorMessage();
  }

  if (normalized.includes("already registered") || normalized.includes("user already")) {
    return "Unable to create account. Please try again or sign in.";
  }

  // Strength / composition before length — Supabase says "at least one character of each…".
  if (
    normalized.includes("pwned") ||
    normalized.includes("data breach") ||
    normalized.includes("have i been pwned") ||
    (normalized.includes("password") && normalized.includes("breach"))
  ) {
    return "This password is too common or appeared in a data breach. Choose a different password.";
  }

  if (
    normalized.includes("weak") ||
    normalized.includes("easy to guess") ||
    normalized.includes("character of each") ||
    (normalized.includes("password") &&
      (normalized.includes("strength") ||
        normalized.includes("uppercase") ||
        normalized.includes("lowercase") ||
        (normalized.includes("number") && normalized.includes("symbol")) ||
        normalized.includes("special character")))
  ) {
    return AUTH_PASSWORD_REQUIREMENTS_COPY;
  }

  // Length-only messages — do NOT map every error that merely contains "password".
  if (
    normalized.includes("password should be at least") ||
    normalized.includes("password is too short") ||
    (normalized.includes("password") &&
      normalized.includes("minimum") &&
      normalized.includes("character")) ||
    (normalized.includes("password") &&
      /at least \d+ characters?/.test(normalized))
  ) {
    return `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`;
  }

  // Never leak raw provider/Supabase internals to the UI.
  if (!message?.trim()) {
    return "Something went wrong. Please try again.";
  }
  if (
    normalized.includes("supabase") ||
    normalized.includes("jwt") ||
    normalized.includes("postgres") ||
    normalized.includes("stack") ||
    normalized.includes("oauth") ||
    normalized.includes("provider") ||
    normalized.includes("identity") ||
    normalized.includes("access_token") ||
    normalized.includes("refresh_token")
  ) {
    return "Something went wrong. Please try again.";
  }

  // Never surface raw Supabase/provider messages — use generic copy.
  return "Unable to sign in. Please try again.";
}

export type AuthMeResponse = {
  authUserId: string;
  email: string | null;
  profile: {
    id: string;
    fullName: string;
    phone: string | null;
  } | null;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  organizationIds: string[];
  ownedOrganizationIds: string[];
  isPlatformSuperAdmin: boolean;
  isSuperAdmin: boolean;
};

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
 * Google OAuth for customers (Gmail-first UX).
 * Enabled by default when Supabase is configured; set VITE_GOOGLE_OAUTH_ENABLED=false to hide.
 * Provider credentials live in Supabase Auth (Google) — never in the frontend.
 */
export function isGoogleOAuthConfigured(): boolean {
  const flag = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  // Explicit enable, or default-on when flag unset.
  return flag === "true" || flag === "1" || flag === "on" || flag === undefined || flag === "";
}

export { getGoogleOAuthRedirectTo } from "@/lib/auth-redirect";

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

export function genericAuthErrorMessage(): string {
  return "Invalid email or password.";
}

export function mapSupabaseAuthError(message: string | undefined): string {
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
    normalized.includes("unable to send") ||
    normalized.includes("smtp")
  ) {
    return "We could not send the confirmation email right now. Check spam later or try Resend.";
  }

  if (
    normalized.includes("provider is not enabled") ||
    normalized.includes("unsupported provider") ||
    normalized.includes("validation_failed")
  ) {
    return "Google sign-in is not available right now. Please use email and password, or try again later.";
  }

  if (
    normalized.includes("reauthentication") ||
    normalized.includes("reauth") ||
    normalized.includes("session is not recent") ||
    normalized.includes("fresh authentication")
  ) {
    return "For security, sign out and sign back in with Google, then set your password again.";
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
    normalized.includes("stack")
  ) {
    return "Something went wrong. Please try again.";
  }

  return message.trim();
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
  isSuperAdmin: boolean;
};

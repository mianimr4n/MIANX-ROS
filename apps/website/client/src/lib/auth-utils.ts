export const AUTH_MIN_PASSWORD_LENGTH = 8;

export type SignupInput = {
  email: string;
  password: string;
  fullName?: string;
};

export type SignupValidationResult =
  | { ok: true; email: string; password: string; fullName?: string }
  | { ok: false; message: string };

export function isGoogleOAuthConfigured(): boolean {
  // Slice 1: Google OAuth remains disabled regardless of miscellaneous env noise.
  return false;
}

export function validateSignupInput(input: SignupInput): SignupValidationResult {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`,
    };
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

  if (normalized.includes("password")) {
    return `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`;
  }

  return message?.trim() || "Something went wrong. Please try again.";
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
};

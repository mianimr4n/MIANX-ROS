/**
 * Safe customer identity-linking rules (no silent merges, no role inheritance).
 *
 * Allowed:
 * - Same provider identity (returning Google/Facebook user)
 * - Verified email match handled by Supabase Auth when providers are configured
 *
 * Forbidden:
 * - Unverified email merge
 * - Role inheritance from OAuth metadata
 * - Silent duplicate-account merges in the client
 */

export type SocialProvider = "google" | "facebook";

/** Scopes we may request for Facebook Login. Never extend this list. */
export const FACEBOOK_OAUTH_SCOPES = "public_profile,email" as const;

const FORBIDDEN_FACEBOOK_SCOPE_HINTS = [
  "friends",
  "user_friends",
  "user_photos",
  "user_posts",
  "user_birthday",
  "user_gender",
  "user_location",
  "user_likes",
] as const;

/** Guard for tests / reviews — S2 must never request these scopes. */
export function facebookScopesAreMinimal(scopes: string): boolean {
  const normalized = scopes.toLowerCase().replace(/\s+/g, "");
  if (!normalized.includes("email") || !normalized.includes("public_profile")) {
    return false;
  }
  return !FORBIDDEN_FACEBOOK_SCOPE_HINTS.some((hint) => normalized.includes(hint));
}

/**
 * Map identity-conflict / linking failures to safe customer copy.
 * Never surface provider payloads or account IDs.
 */
export function mapIdentityConflictMessage(raw: string | null | undefined): string | null {
  const normalized = (raw ?? "").toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes("identity_already_exists") ||
    normalized.includes("identity is already linked") ||
    normalized.includes("already linked") ||
    normalized.includes("multiple accounts") ||
    (normalized.includes("email") &&
      (normalized.includes("already") || normalized.includes("exists")) &&
      (normalized.includes("different") || normalized.includes("another") || normalized.includes("conflict")))
  ) {
    return "This sign-in method is already linked to another Telepizza account. Sign in with that method, or use a different email.";
  }

  if (
    normalized.includes("email_not_confirmed") ||
    normalized.includes("unverified email") ||
    (normalized.includes("email") && normalized.includes("not verified") && normalized.includes("link"))
  ) {
    return "We could not link accounts because the email is not verified. Confirm your email, then try again.";
  }

  if (
    normalized.includes("manual linking") ||
    normalized.includes("linking is disabled") ||
    normalized.includes("cannot link")
  ) {
    return "We could not link this sign-in method automatically. Please try again or use email.";
  }

  return null;
}

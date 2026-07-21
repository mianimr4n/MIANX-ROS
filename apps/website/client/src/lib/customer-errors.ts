/**
 * Safe customer-facing copy for API / auth failures.
 * Never surface table names, PostgREST payloads, or schema-cache internals.
 */

import { ApiRequestError } from "@/lib/api";

const TABLE_OR_SCHEMA =
  /relation\s+["']?[\w.]+["']?\s+does not exist|schema cache|Could not find the table|PGRST|42P01|undefined table|column .+ does not exist/i;

export type CustomerErrorContext =
  | "addresses"
  | "orders"
  | "favorites"
  | "reviews"
  | "profile"
  | "generic";

const CONTEXT_LOAD: Record<CustomerErrorContext, string> = {
  addresses: "We could not load your saved addresses right now.",
  orders: "We could not load all order details right now.",
  favorites: "We could not load your favorites right now.",
  reviews: "We could not load all order details right now.",
  profile: "We could not update your profile right now. Please try again shortly.",
  generic: "This feature is temporarily unavailable. Please try again shortly.",
};

/**
 * Map any thrown value to a short, non-technical customer message.
 */
export function toCustomerMessage(
  error: unknown,
  context: CustomerErrorContext = "generic",
): string {
  if (error instanceof ApiRequestError) {
    if (error.statusCode === 401) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.statusCode === 403 || error.code === "USER_ACCESS_DISABLED") {
      return "This account cannot use My Telepizza right now. Please contact support.";
    }
    if (error.message && TABLE_OR_SCHEMA.test(error.message)) {
      return context === "generic"
        ? "This feature is temporarily unavailable. Please try again shortly."
        : CONTEXT_LOAD[context];
    }
    if (error.statusCode === 404 || error.statusCode === 503) {
      return CONTEXT_LOAD[context];
    }
    if (error.code === "PHONE_ALREADY_IN_USE") {
      return "That phone number is already linked to another Telepizza account.";
    }
    if (error.code === "INVALID_PHONE") {
      return "Enter a valid Pakistani mobile number (03XXXXXXXXX or +92…).";
    }
    if (
      error.message &&
      !TABLE_OR_SCHEMA.test(error.message) &&
      !/sql|postgres|supabase|stack|exception|pgrst/i.test(error.message)
    ) {
      return error.message;
    }
    return CONTEXT_LOAD[context];
  }

  if (error instanceof Error) {
    if (TABLE_OR_SCHEMA.test(error.message)) {
      return context === "generic"
        ? "This feature is temporarily unavailable. Please try again shortly."
        : CONTEXT_LOAD[context];
    }
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "You appear to be offline. Check your connection and try again.";
    }
  }

  return "Something went wrong. Please try again.";
}

/** True when the failure looks like a missing relation / schema-cache issue. */
export function isSchemaUnavailableError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return Boolean(error.message && TABLE_OR_SCHEMA.test(error.message));
  }
  if (error instanceof Error) {
    return TABLE_OR_SCHEMA.test(error.message);
  }
  return false;
}

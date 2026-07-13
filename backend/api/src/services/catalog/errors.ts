import { ApiError } from "../../common/http.js";
import { ServiceConfigurationError } from "./supabase.js";

export function mapCatalogError(error: unknown, feature: string) {
  if (error instanceof ServiceConfigurationError) {
    return new ApiError(
      503,
      "SERVICE_CONFIGURATION_ERROR",
      `${feature} is unavailable because Supabase credentials are not configured.`,
    );
  }

  const message = error instanceof Error ? error.message : `Unable to load ${feature.toLowerCase()}.`;

  return new ApiError(502, "DATA_SOURCE_ERROR", message);
}

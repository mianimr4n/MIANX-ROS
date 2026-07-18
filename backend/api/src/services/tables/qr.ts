import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";

/** Safe public shape for a validated table — never includes qr_token_hash. */
export interface ValidatedRestaurantTable {
  id: string;
  branchId: string;
  tableNumber: string;
  displayName: string | null;
  capacity: number | null;
  floorOrZone: string | null;
  status: RestaurantTableStatus;
  qrVersion: number;
  isActive: boolean;
}

export type RestaurantTableStatus = "available" | "occupied" | "reserved" | "inactive";

type RestaurantTableRow = {
  id: string;
  branch_id: string;
  table_number: string;
  display_name: string | null;
  capacity: number | null;
  floor_or_zone: string | null;
  status: RestaurantTableStatus;
  qr_token_hash: string | null;
  qr_version: number;
  is_active: boolean;
};

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hashQrToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Generates a cryptographically random QR token (≥256 bits).
 * Returns the raw token once for QR encoding; store only `tokenHash`.
 */
export function generateSecureQrToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashQrToken(rawToken) };
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function toValidated(row: RestaurantTableRow): ValidatedRestaurantTable {
  return {
    id: row.id,
    branchId: row.branch_id,
    tableNumber: row.table_number,
    displayName: row.display_name,
    capacity: row.capacity,
    floorOrZone: row.floor_or_zone,
    status: row.status,
    qrVersion: row.qr_version,
    isActive: row.is_active,
  };
}

/**
 * Hash lookup for an inbound QR token. Safe miss: returns null (no enumeration).
 * Requires is_active and status != 'inactive'. Never logs the raw token.
 */
export async function validateQrToken(
  envStatus: EnvironmentStatus,
  rawToken: string,
): Promise<ValidatedRestaurantTable | null> {
  if (typeof rawToken !== "string" || rawToken.length < 16 || rawToken.length > 512) {
    return null;
  }

  const tokenHash = hashQrToken(rawToken);
  const supabase = createServiceClient(envStatus);

  const { data, error } = await supabase
    .from("restaurant_tables")
    .select(
      "id, branch_id, table_number, display_name, capacity, floor_or_zone, status, qr_token_hash, qr_version, is_active",
    )
    .eq("qr_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "QR_LOOKUP_FAILED", "Unable to validate table QR token.");
  }
  if (!data) {
    return null;
  }

  const row = data as RestaurantTableRow;
  if (!row.qr_token_hash || !hashesEqual(row.qr_token_hash, tokenHash)) {
    return null;
  }
  if (!row.is_active || row.status === "inactive") {
    return null;
  }

  return toValidated(row);
}

export interface QrTokenValidator {
  validateQrToken(rawToken: string): Promise<ValidatedRestaurantTable | null>;
}

export function createQrTokenValidator(envStatus: EnvironmentStatus): QrTokenValidator {
  return {
    validateQrToken(rawToken: string) {
      return validateQrToken(envStatus, rawToken);
    },
  };
}

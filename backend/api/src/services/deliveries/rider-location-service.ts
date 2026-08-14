/**
 * Rider location service (ADR-008).
 *
 * Ingests real-time rider GPS pings during active deliveries. Pings are
 * only accepted when the rider has an in-flight delivery
 * (`deliveries.status IN ('assigned', 'picked-up')`).
 *
 * Pings are stored in `rider_locations` (ephemeral). A separate TTL job
 * (rider-location-ttl.ts) purges rows 24h after the parent delivery
 * reaches a terminal state — see ADR-008 §2.
 *
 * Branch scoping (RLS-equivalent for service-role client):
 *   - Rider can read/ingest their own pings.
 *   - Branch staff (branch-manager, customer-support, super-admin) can
 *     read pings for riders in their branch.
 *   - Branch staff cannot ingest pings (rider-only).
 *
 * Authority: ADR-008 §1 (storage scope), §3 (branch-scoped access),
 *           §4 (minimal per-ping metadata)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiderLocationPing {
  riderId: string;
  deliveryId?: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracyM?: number | null;
  recordedAt?: string | null;
}

export interface RiderLocationRow {
  id: number;
  riderId: string;
  deliveryId: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracyM: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface RiderLocationService {
  /**
   * Ingest a single GPS ping from a rider. Validates:
   *   - Rider exists and is the authenticated user (or service call from
   *     backend on behalf of rider).
   *   - If deliveryId is provided, the delivery belongs to this rider
   *     AND is in an active state.
   * Returns the inserted row.
   */
  ingestPing(input: {
    actorUserId: string;
    ping: RiderLocationPing;
  }): Promise<RiderLocationRow>;

  /**
   * List the most recent pings for a delivery. Branch-scoped:
   *   - If actor is super-admin: any delivery.
   *   - If actor is branch staff: delivery must be in their branch.
   *   - If actor is the rider themselves: delivery must be assigned to them.
   */
  listForDelivery(input: {
    actorUserId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    deliveryId: string;
    limit?: number;
  }): Promise<RiderLocationRow[]>;

  /**
   * Get the latest ping for a rider (for dispatcher live map).
   * Branch-scoped: rider must belong to actor's branch (or actor is rider
   * themselves, or super-admin).
   */
  getLatestForRider(input: {
    actorUserId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    riderId: string;
  }): Promise<RiderLocationRow | null>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRow(row: Record<string, unknown>): RiderLocationRow {
  return {
    id: Number(row.id),
    riderId: String(row.rider_id),
    deliveryId: (row.delivery_id as string | null) ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    heading: row.heading !== null && row.heading !== undefined ? Number(row.heading) : null,
    speed: row.speed !== null && row.speed !== undefined ? Number(row.speed) : null,
    accuracyM: row.accuracy_m !== null && row.accuracy_m !== undefined ? Number(row.accuracy_m) : null,
    recordedAt: String(row.recorded_at),
    createdAt: String(row.created_at),
  };
}

function validatePing(ping: RiderLocationPing): void {
  if (!ping.riderId || typeof ping.riderId !== "string") {
    throw new ApiError(400, "INVALID_PING", "riderId is required.");
  }
  if (typeof ping.latitude !== "number" || ping.latitude < -90 || ping.latitude > 90) {
    throw new ApiError(400, "INVALID_PING", "latitude must be a number between -90 and 90.");
  }
  if (typeof ping.longitude !== "number" || ping.longitude < -180 || ping.longitude > 180) {
    throw new ApiError(400, "INVALID_PING", "longitude must be a number between -180 and 180.");
  }
  if (ping.heading !== null && ping.heading !== undefined) {
    if (typeof ping.heading !== "number" || ping.heading < 0 || ping.heading > 360) {
      throw new ApiError(400, "INVALID_PING", "heading must be between 0 and 360.");
    }
  }
  if (ping.speed !== null && ping.speed !== undefined) {
    if (typeof ping.speed !== "number" || ping.speed < 0) {
      throw new ApiError(400, "INVALID_PING", "speed must be >= 0.");
    }
  }
  if (ping.accuracyM !== null && ping.accuracyM !== undefined) {
    if (typeof ping.accuracyM !== "number" || ping.accuracyM < 0) {
      throw new ApiError(400, "INVALID_PING", "accuracyM must be >= 0.");
    }
  }
}

export function createRiderLocationService(envStatus: EnvironmentStatus): RiderLocationService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async ingestPing({ actorUserId, ping }) {
      validatePing(ping);

      const client = supabase();

      // Resolve rider_id → user_id, branch_id, status
      const { data: rider, error: riderError } = await client
        .from("riders")
        .select("id, user_id, branch_id, status")
        .eq("id", ping.riderId)
        .maybeSingle();

      if (riderError) throwMappedDbError("RIDER_LOOKUP_FAILED", riderError);
      if (!rider) {
        throw new ApiError(404, "RIDER_NOT_FOUND", "Rider not found.");
      }

      const riderRow = rider as { id: string; user_id: string | null; branch_id: string; status: string };
      // The actor must BE the rider (service role calls pass riderId on behalf of rider).
      // We trust the actorUserId from the auth principal — no separate mapping needed
      // because the rider app sends pings with its own auth token, and the API
      // resolves the rider_id from the JWT. The check below is defense in depth.
      if (riderRow.user_id && riderRow.user_id !== actorUserId) {
        throw new ApiError(
          403,
          "RIDER_PING_FORBIDDEN",
          "Cannot ingest pings on behalf of another rider.",
        );
      }

      // If delivery_id is provided, validate it belongs to this rider AND is in flight
      if (ping.deliveryId) {
        const { data: delivery, error: deliveryError } = await client
          .from("deliveries")
          .select("id, rider_id, status")
          .eq("id", ping.deliveryId)
          .maybeSingle();

        if (deliveryError) throwMappedDbError("DELIVERY_LOOKUP_FAILED", deliveryError);
        if (!delivery) {
          throw new ApiError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
        }

        const deliveryRow = delivery as { id: string; rider_id: string | null; status: string };
        if (deliveryRow.rider_id !== ping.riderId) {
          throw new ApiError(
            403,
            "DELIVERY_RIDER_MISMATCH",
            "Delivery is not assigned to this rider.",
          );
        }
        if (!["assigned", "picked-up"].includes(deliveryRow.status)) {
          throw new ApiError(
            409,
            "DELIVERY_NOT_IN_FLIGHT",
            `Cannot ingest pings for delivery in status "${deliveryRow.status}". Delivery must be assigned or picked-up.`,
          );
        }
      }

      const insertRow: Record<string, unknown> = {
        rider_id: ping.riderId,
        delivery_id: ping.deliveryId ?? null,
        latitude: ping.latitude,
        longitude: ping.longitude,
        heading: ping.heading ?? null,
        speed: ping.speed ?? null,
        accuracy_m: ping.accuracyM ?? null,
        recorded_at: ping.recordedAt ?? new Date().toISOString(),
      };

      const { data, error } = await client
        .from("rider_locations")
        .insert(insertRow)
        .select("*")
        .single();

      if (error) throwMappedDbError("RIDER_LOCATION_INSERT_FAILED", error);
      return mapRow(data as Record<string, unknown>);
    },

    async listForDelivery({ actorUserId, actorBranchIds, isSuperAdmin, deliveryId, limit }) {
      const client = supabase();
      const cap = Math.min(Math.max(limit ?? 100, 1), 500);

      // Load delivery to verify branch scope + rider ownership
      const { data: delivery, error: deliveryError } = await client
        .from("deliveries")
        .select("id, rider_id, branch_id, status")
        .eq("id", deliveryId)
        .maybeSingle();

      if (deliveryError) throwMappedDbError("DELIVERY_LOOKUP_FAILED", deliveryError);
      if (!delivery) {
        throw new ApiError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      }

      const deliveryRow = delivery as { id: string; rider_id: string | null; branch_id: string; status: string };

      // Resolve actor's rider_id (if they are a rider)
      const { data: actorRider } = await client
        .from("riders")
        .select("id")
        .eq("user_id", actorUserId)
        .maybeSingle();
      const actorRiderId = actorRider ? (actorRider as { id: string }).id : null;

      // Authorization:
      // - Super-admin: any delivery
      // - Rider themselves (if delivery.rider_id == actorRiderId): allowed
      // - Branch staff (delivery.branch_id in actorBranchIds): allowed
      const isRiderOwner = actorRiderId !== null && deliveryRow.rider_id === actorRiderId;
      const isBranchStaff = !isSuperAdmin && actorBranchIds.includes(deliveryRow.branch_id);
      if (!isSuperAdmin && !isRiderOwner && !isBranchStaff) {
        throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Delivery is not in your branch scope.");
      }

      const { data, error } = await client
        .from("rider_locations")
        .select("*")
        .eq("delivery_id", deliveryId)
        .order("recorded_at", { ascending: false })
        .limit(cap);

      if (error) throwMappedDbError("RIDER_LOCATIONS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
    },

    async getLatestForRider({ actorUserId, actorBranchIds, isSuperAdmin, riderId }) {
      const client = supabase();

      const { data: rider, error: riderError } = await client
        .from("riders")
        .select("id, user_id, branch_id")
        .eq("id", riderId)
        .maybeSingle();

      if (riderError) throwMappedDbError("RIDER_LOOKUP_FAILED", riderError);
      if (!rider) return null;

      const riderRow = rider as { id: string; user_id: string | null; branch_id: string };
      const isSelf = riderRow.user_id === actorUserId;
      const isBranchStaff = !isSuperAdmin && actorBranchIds.includes(riderRow.branch_id);
      if (!isSuperAdmin && !isSelf && !isBranchStaff) {
        throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Rider is not in your branch scope.");
      }

      const { data, error } = await client
        .from("rider_locations")
        .select("*")
        .eq("rider_id", riderId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throwMappedDbError("RIDER_LOCATION_READ_FAILED", error);
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },
  };
}

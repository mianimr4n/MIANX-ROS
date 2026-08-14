/**
 * Proof of Delivery service (ADR-009).
 *
 * Captures photo + signature + recipient metadata at the moment of delivery.
 * POD storage is split:
 *   - Binary assets (photo + signature SVG) live in Supabase Storage bucket
 *     `delivery-pod` (managed via dashboard, NOT SQL migrations).
 *   - DB row (`delivery_pod`) stores URLs + recipient metadata + audit.
 *
 * One POD per delivery (UNIQUE constraint on delivery_id). POD becomes
 * immutable once the parent delivery reaches `delivered` (SQL trigger).
 *
 * The ADR-007 transition validator (extended by ADR-009 migration) rejects
 * `deliveries.status -> 'delivered'` unless a `delivery_pod` row exists.
 * This service provides a pre-flight check that mirrors the SQL rule so
 * riders get a helpful 422 error BEFORE the DB rejects the transition.
 *
 * Authority: ADR-009 §1 (storage separation), §2 (one POD per delivery),
 *           §3 (mandatory for delivered), §6 (server timestamps),
 *           §7 (immutability after delivered)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecipientRelationship =
  | "self"
  | "family"
  | "neighbor"
  | "guard"
  | "other";

export const RECIPIENT_RELATIONSHIPS: RecipientRelationship[] = [
  "self",
  "family",
  "neighbor",
  "guard",
  "other",
];

export interface DeliveryPodInput {
  deliveryId: string;
  capturedByRiderId: string;
  photoStoragePath: string;
  photoUrl: string;
  signatureSvgPath?: string | null;
  signatureUrl?: string | null;
  recipientName: string;
  recipientRelationship?: RecipientRelationship;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DeliveryPodRow {
  id: string;
  deliveryId: string;
  capturedByRiderId: string;
  photoStoragePath: string;
  photoUrl: string;
  signatureSvgPath: string | null;
  signatureUrl: string | null;
  recipientName: string;
  recipientRelationship: RecipientRelationship;
  notes: string | null;
  metadata: Record<string, unknown>;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPodService {
  /**
   * Create a new POD for a delivery. Validates:
   *   - Delivery exists and is in `assigned` or `picked-up` status (POD
   *     must be captured BEFORE the `delivered` transition).
   *   - The capturing rider is the rider assigned to the delivery.
   *   - No existing POD for this delivery (UNIQUE constraint).
   */
  capturePod(input: DeliveryPodInput): Promise<DeliveryPodRow>;

  /**
   * Get the POD for a delivery. Branch-scoped:
   *   - Super-admin: any delivery.
   *   - Branch staff: delivery must be in their branch.
   *   - Rider themselves: delivery must be assigned to them.
   *   - Customer: delivery must belong to their order.
   */
  getPod(input: {
    actorUserId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    deliveryId: string;
  }): Promise<DeliveryPodRow | null>;

  /**
   * Pre-flight check: returns true if a POD exists for the delivery.
   * Used by the delivery transition service to produce a helpful 422 error
   * BEFORE the SQL trigger rejects the `delivered` transition.
   */
  podExistsForDelivery(deliveryId: string): Promise<boolean>;
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

function mapRow(row: Record<string, unknown>): DeliveryPodRow {
  return {
    id: String(row.id),
    deliveryId: String(row.delivery_id),
    capturedByRiderId: String(row.captured_by_rider_id),
    photoStoragePath: String(row.photo_storage_path ?? ""),
    photoUrl: String(row.photo_url ?? ""),
    signatureSvgPath: (row.signature_svg_path as string | null) ?? null,
    signatureUrl: (row.signature_url as string | null) ?? null,
    recipientName: String(row.recipient_name ?? ""),
    recipientRelationship: (row.recipient_relationship as RecipientRelationship) ?? "self",
    notes: (row.notes as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    capturedAt: String(row.captured_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function validateInput(input: DeliveryPodInput): void {
  if (!input.deliveryId) throw new ApiError(400, "INVALID_POD", "deliveryId is required.");
  if (!input.capturedByRiderId) throw new ApiError(400, "INVALID_POD", "capturedByRiderId is required.");
  if (!input.photoStoragePath) throw new ApiError(400, "INVALID_POD", "photoStoragePath is required.");
  if (!input.photoUrl) throw new ApiError(400, "INVALID_POD", "photoUrl is required.");
  if (!input.recipientName || input.recipientName.trim().length === 0) {
    throw new ApiError(400, "INVALID_POD", "recipientName is required.");
  }
  if (input.recipientName.length > 150) {
    throw new ApiError(400, "INVALID_POD", "recipientName must be at most 150 characters.");
  }
  if (input.notes && input.notes.length > 1000) {
    throw new ApiError(400, "INVALID_POD", "notes must be at most 1000 characters.");
  }
  if (
    input.recipientRelationship &&
    !RECIPIENT_RELATIONSHIPS.includes(input.recipientRelationship)
  ) {
    throw new ApiError(
      400,
      "INVALID_POD",
      `recipientRelationship must be one of: ${RECIPIENT_RELATIONSHIPS.join(", ")}.`,
    );
  }
}

export function createDeliveryPodService(envStatus: EnvironmentStatus): DeliveryPodService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async capturePod(input) {
      validateInput(input);

      const client = supabase();

      // Load delivery to validate status + rider assignment
      const { data: delivery, error: deliveryError } = await client
        .from("deliveries")
        .select("id, rider_id, status, branch_id")
        .eq("id", input.deliveryId)
        .maybeSingle();

      if (deliveryError) throwMappedDbError("DELIVERY_LOOKUP_FAILED", deliveryError);
      if (!delivery) {
        throw new ApiError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      }

      const deliveryRow = delivery as { id: string; rider_id: string | null; status: string; branch_id: string };

      if (!["assigned", "picked-up"].includes(deliveryRow.status)) {
        throw new ApiError(
          409,
          "DELIVERY_NOT_IN_FLIGHT",
          `Cannot capture POD for delivery in status "${deliveryRow.status}". Delivery must be assigned or picked-up.`,
        );
      }

      if (deliveryRow.rider_id !== input.capturedByRiderId) {
        throw new ApiError(
          403,
          "DELIVERY_RIDER_MISMATCH",
          "POD can only be captured by the rider assigned to this delivery.",
        );
      }

      const insertRow: Record<string, unknown> = {
        delivery_id: input.deliveryId,
        captured_by_rider_id: input.capturedByRiderId,
        photo_storage_path: input.photoStoragePath,
        photo_url: input.photoUrl,
        signature_svg_path: input.signatureSvgPath ?? null,
        signature_url: input.signatureUrl ?? null,
        recipient_name: input.recipientName.trim(),
        recipient_relationship: input.recipientRelationship ?? "self",
        notes: input.notes?.trim() || null,
        metadata: input.metadata ?? {},
      };

      const { data, error } = await client
        .from("delivery_pod")
        .insert(insertRow)
        .select("*")
        .single();

      if (error) {
        // Unique violation: POD already exists for this delivery
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "POD_ALREADY_EXISTS",
            "A Proof of Delivery already exists for this delivery. One POD per delivery is allowed.",
          );
        }
        throwMappedDbError("POD_INSERT_FAILED", error);
      }

      return mapRow(data as Record<string, unknown>);
    },

    async getPod({ actorUserId, actorBranchIds, isSuperAdmin, deliveryId }) {
      const client = supabase();

      // Load delivery to check authorization
      const { data: delivery, error: deliveryError } = await client
        .from("deliveries")
        .select("id, rider_id, branch_id, order_id")
        .eq("id", deliveryId)
        .maybeSingle();

      if (deliveryError) throwMappedDbError("DELIVERY_LOOKUP_FAILED", deliveryError);
      if (!delivery) return null;

      const deliveryRow = delivery as {
        id: string;
        rider_id: string | null;
        branch_id: string;
        order_id: string;
      };

      // Resolve actor's rider_id (if they are a rider)
      const { data: actorRider } = await client
        .from("riders")
        .select("id")
        .eq("user_id", actorUserId)
        .maybeSingle();
      const actorRiderId = actorRider ? (actorRider as { id: string }).id : null;

      // Resolve order's customer_id
      const { data: order } = await client
        .from("orders")
        .select("customer_id")
        .eq("id", deliveryRow.order_id)
        .maybeSingle();
      const orderCustomerId = order ? (order as { customer_id: string | null }).customer_id : null;

      const isRiderOwner = actorRiderId !== null && deliveryRow.rider_id === actorRiderId;
      const isBranchStaff = !isSuperAdmin && actorBranchIds.includes(deliveryRow.branch_id);
      const isOrderCustomer = orderCustomerId === actorUserId;

      if (!isSuperAdmin && !isRiderOwner && !isBranchStaff && !isOrderCustomer) {
        throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Delivery is not in your branch scope.");
      }

      const { data, error } = await client
        .from("delivery_pod")
        .select("*")
        .eq("delivery_id", deliveryId)
        .maybeSingle();

      if (error) throwMappedDbError("POD_READ_FAILED", error);
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },

    async podExistsForDelivery(deliveryId) {
      const client = supabase();
      const { count, error } = await client
        .from("delivery_pod")
        .select("id", { count: "exact", head: true })
        .eq("delivery_id", deliveryId);

      if (error) throwMappedDbError("POD_LOOKUP_FAILED", error);
      return (count ?? 0) > 0;
    },
  };
}

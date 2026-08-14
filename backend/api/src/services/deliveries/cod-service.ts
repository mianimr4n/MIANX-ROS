/**
 * Cash on Delivery (COD) service (ADR-010).
 *
 * Records cash collected by riders upon delivery. Tracks reconciliation
 * status (pending → reconciled/shortage/overage) and triggers automated
 * double-entry GL posting when reconciliation completes.
 *
 * Reconciliation flow:
 *   1. Rider collects cash → INSERT cod_collections row (status=pending)
 *      at delivery time.
 *   2. End-of-shift, branch manager opens reconciliation screen.
 *   3. Branch manager enters the actual cash amount the rider handed in.
 *      - If equal to `amount`: status = reconciled.
 *      - If less: status = shortage (then write-off → reconciled).
 *      - If more: status = overage (then top-up income → reconciled).
 *   4. When status transitions to reconciled, a SQL trigger fires
 *      `create_journal_entry_atomic` to post the double-entry (Dr Cash,
 *      Cr AR) and links via finance_postings (idempotent).
 *
 * Authority: ADR-010 §1 (one COD per delivery), §3 (reconciliation states),
 *           §4 (GL posting trigger), §6 (branch-scoped access)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CodReconciliationStatus =
  | "pending"
  | "reconciled"
  | "shortage"
  | "overage";

export const COD_RECONCILIATION_STATUSES: CodReconciliationStatus[] = [
  "pending",
  "reconciled",
  "shortage",
  "overage",
];

export interface CodCollectionRow {
  id: string;
  deliveryId: string;
  branchId: string;
  orderId: string;
  amount: number;
  currency: string;
  collectedByRiderId: string;
  customerReceivedBy: string | null;
  notes: string | null;
  reconciliationStatus: CodReconciliationStatus;
  reconciledAmount: number | null;
  reconciledAt: string | null;
  reconciledBy: string | null;
  journalEntryId: string | null;
  metadata: Record<string, unknown>;
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodCollectionInput {
  deliveryId: string;
  collectedByRiderId: string;
  amount: number;
  currency?: string;
  customerReceivedBy?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CodReconciliationInput {
  codCollectionId: string;
  actorUserId: string;
  actorBranchIds: string[];
  isSuperAdmin: boolean;
  reconciledAmount: number;
  notes?: string | null;
}

export interface CodListFilters {
  branchId?: string;
  riderId?: string;
  status?: CodReconciliationStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface CodService {
  /**
   * Record a COD collection at delivery time. Validates:
   *   - Delivery exists, is in `picked-up` or `delivered` status, and is
   *     assigned to the capturing rider.
   *   - No existing COD collection for this delivery (UNIQUE).
   *   - Amount is non-negative.
   */
  recordCollection(input: CodCollectionInput): Promise<CodCollectionRow>;

  /**
   * Get a single COD collection by id. Branch-scoped.
   */
  getCollection(input: {
    actorUserId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    codCollectionId: string;
  }): Promise<CodCollectionRow>;

  /**
   * List COD collections. Branch-scoped. Filters by branch, rider, status, date range.
   */
  listCollections(input: {
    actorUserId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    filters: CodListFilters;
  }): Promise<{ rows: CodCollectionRow[]; total: number }>;

  /**
   * Reconcile a COD collection. Branch-manager or super-admin only.
   *   - If reconciledAmount == amount: status = reconciled.
   *   - If reconciledAmount < amount: status = shortage.
   *   - If reconciledAmount > amount: status = overage.
   *   - If already reconciled: idempotent no-op.
   *
   * The SQL trigger handles GL posting when status transitions to reconciled.
   */
  reconcile(input: CodReconciliationInput): Promise<CodCollectionRow>;

  /**
   * Mark a shortage/overage as resolved (transitions to reconciled).
   * Same authorization as reconcile().
   */
  resolveShortageOrOverage(input: {
    codCollectionId: string;
    actorUserId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    notes?: string | null;
  }): Promise<CodCollectionRow>;
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

function mapRow(row: Record<string, unknown>): CodCollectionRow {
  return {
    id: String(row.id),
    deliveryId: String(row.delivery_id),
    branchId: String(row.branch_id),
    orderId: String(row.order_id),
    amount: Number(row.amount),
    currency: String(row.currency ?? "PKR"),
    collectedByRiderId: String(row.collected_by_rider_id),
    customerReceivedBy: (row.customer_received_by as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    reconciliationStatus: (row.reconciliation_status as CodReconciliationStatus) ?? "pending",
    reconciledAmount: row.reconciled_amount !== null && row.reconciled_amount !== undefined
      ? Number(row.reconciled_amount)
      : null,
    reconciledAt: (row.reconciled_at as string | null) ?? null,
    reconciledBy: (row.reconciled_by as string | null) ?? null,
    journalEntryId: (row.journal_entry_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    collectedAt: String(row.collected_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function assertBranchInScope(branchId: string, allowedBranchIds: string[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return;
  if (!allowedBranchIds.includes(branchId)) {
    throw new ApiError(403, "BRANCH_ACCESS_DENIED", "COD collection is not in your branch scope.");
  }
}

function classifyReconciliation(amount: number, reconciledAmount: number): CodReconciliationStatus {
  if (reconciledAmount === amount) return "reconciled";
  if (reconciledAmount < amount) return "shortage";
  return "overage";
}

export function createCodService(envStatus: EnvironmentStatus): CodService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async recordCollection(input) {
      if (!input.deliveryId) throw new ApiError(400, "INVALID_COD", "deliveryId is required.");
      if (!input.collectedByRiderId) throw new ApiError(400, "INVALID_COD", "collectedByRiderId is required.");
      if (typeof input.amount !== "number" || input.amount < 0) {
        throw new ApiError(400, "INVALID_COD", "amount must be a non-negative number.");
      }
      if (input.customerReceivedBy && input.customerReceivedBy.length > 150) {
        throw new ApiError(400, "INVALID_COD", "customerReceivedBy must be at most 150 characters.");
      }
      if (input.notes && input.notes.length > 1000) {
        throw new ApiError(400, "INVALID_COD", "notes must be at most 1000 characters.");
      }

      const client = supabase();

      // Load delivery to validate rider assignment + branch
      const { data: delivery, error: deliveryError } = await client
        .from("deliveries")
        .select("id, rider_id, status, branch_id, order_id")
        .eq("id", input.deliveryId)
        .maybeSingle();

      if (deliveryError) throwMappedDbError("DELIVERY_LOOKUP_FAILED", deliveryError);
      if (!delivery) {
        throw new ApiError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      }

      const deliveryRow = delivery as {
        id: string;
        rider_id: string | null;
        status: string;
        branch_id: string;
        order_id: string;
      };

      if (!["picked-up", "delivered"].includes(deliveryRow.status)) {
        throw new ApiError(
          409,
          "DELIVERY_NOT_READY_FOR_COD",
          `Cannot record COD for delivery in status "${deliveryRow.status}". Delivery must be picked-up or delivered.`,
        );
      }

      if (deliveryRow.rider_id !== input.collectedByRiderId) {
        throw new ApiError(
          403,
          "DELIVERY_RIDER_MISMATCH",
          "COD can only be recorded by the rider assigned to this delivery.",
        );
      }

      const insertRow: Record<string, unknown> = {
        delivery_id: input.deliveryId,
        branch_id: deliveryRow.branch_id,
        order_id: deliveryRow.order_id,
        amount: input.amount,
        currency: input.currency ?? "PKR",
        collected_by_rider_id: input.collectedByRiderId,
        customer_received_by: input.customerReceivedBy?.trim() || null,
        notes: input.notes?.trim() || null,
        metadata: input.metadata ?? {},
      };

      const { data, error } = await client
        .from("cod_collections")
        .insert(insertRow)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "COD_ALREADY_EXISTS",
            "A COD collection already exists for this delivery. One COD per delivery is allowed.",
          );
        }
        throwMappedDbError("COD_INSERT_FAILED", error);
      }

      return mapRow(data as Record<string, unknown>);
    },

    async getCollection({ actorUserId, actorBranchIds, isSuperAdmin, codCollectionId }) {
      const client = supabase();
      const { data, error } = await client
        .from("cod_collections")
        .select("*")
        .eq("id", codCollectionId)
        .maybeSingle();

      if (error) throwMappedDbError("COD_READ_FAILED", error);
      if (!data) {
        throw new ApiError(404, "COD_NOT_FOUND", "COD collection not found.");
      }

      const row = mapRow(data as Record<string, unknown>);

      // Authorization:
      // - Super-admin: any
      // - Rider themselves: allowed (collected_by_rider_id matches their rider_id)
      // - Branch staff: branch must be in scope
      const { data: actorRider } = await client
        .from("riders")
        .select("id")
        .eq("user_id", actorUserId)
        .maybeSingle();
      const actorRiderId = actorRider ? (actorRider as { id: string }).id : null;
      const isRiderOwner = actorRiderId !== null && row.collectedByRiderId === actorRiderId;

      if (!isSuperAdmin && !isRiderOwner) {
        assertBranchInScope(row.branchId, actorBranchIds, isSuperAdmin);
      }

      return row;
    },

    async listCollections({ actorBranchIds, isSuperAdmin, filters }) {
      const client = supabase();
      const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
      const offset = Math.max(filters.offset ?? 0, 0);

      let q = client
        .from("cod_collections")
        .select("*", { count: "exact" });

      if (!isSuperAdmin) {
        if (actorBranchIds.length === 0) {
          throw new ApiError(403, "BRANCH_SCOPE_REQUIRED", "Branch scope is required.");
        }
        q = q.in("branch_id", actorBranchIds);
      }

      if (filters.branchId) q = q.eq("branch_id", filters.branchId);
      if (filters.riderId) q = q.eq("collected_by_rider_id", filters.riderId);
      if (filters.status) q = q.eq("reconciliation_status", filters.status);
      if (filters.fromDate) q = q.gte("collected_at", filters.fromDate);
      if (filters.toDate) q = q.lte("collected_at", filters.toDate);

      q = q
        .order("collected_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("COD_LIST_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapRow),
        total: count ?? 0,
      };
    },

    async reconcile(input) {
      if (typeof input.reconciledAmount !== "number" || input.reconciledAmount < 0) {
        throw new ApiError(400, "INVALID_RECONCILIATION", "reconciledAmount must be a non-negative number.");
      }

      const client = supabase();
      const { data: existing, error: loadError } = await client
        .from("cod_collections")
        .select("*")
        .eq("id", input.codCollectionId)
        .maybeSingle();

      if (loadError) throwMappedDbError("COD_READ_FAILED", loadError);
      if (!existing) {
        throw new ApiError(404, "COD_NOT_FOUND", "COD collection not found.");
      }

      const existingRow = mapRow(existing as Record<string, unknown>);
      assertBranchInScope(existingRow.branchId, input.actorBranchIds, input.isSuperAdmin);

      // Idempotent: if already reconciled, return as-is
      if (existingRow.reconciliationStatus === "reconciled") {
        return existingRow;
      }

      const newStatus = classifyReconciliation(existingRow.amount, input.reconciledAmount);

      const updateRow: Record<string, unknown> = {
        reconciliation_status: newStatus,
        reconciled_amount: input.reconciledAmount,
        reconciled_at: new Date().toISOString(),
        reconciled_by: input.actorUserId,
      };

      if (input.notes) {
        updateRow.notes = input.notes.trim();
      }

      const { data, error } = await client
        .from("cod_collections")
        .update(updateRow)
        .eq("id", input.codCollectionId)
        .select("*")
        .single();

      if (error) throwMappedDbError("COD_RECONCILE_FAILED", error);

      return mapRow(data as Record<string, unknown>);
    },

    async resolveShortageOrOverage(input) {
      const client = supabase();
      const { data: existing, error: loadError } = await client
        .from("cod_collections")
        .select("*")
        .eq("id", input.codCollectionId)
        .maybeSingle();

      if (loadError) throwMappedDbError("COD_READ_FAILED", loadError);
      if (!existing) {
        throw new ApiError(404, "COD_NOT_FOUND", "COD collection not found.");
      }

      const existingRow = mapRow(existing as Record<string, unknown>);
      assertBranchInScope(existingRow.branchId, input.actorBranchIds, input.isSuperAdmin);

      if (existingRow.reconciliationStatus === "pending") {
        throw new ApiError(
          409,
          "COD_NOT_RECONCILED_YET",
          "Cannot resolve shortage/overage for a collection that has not been reconciled yet.",
        );
      }
      if (existingRow.reconciliationStatus === "reconciled") {
        return existingRow; // idempotent
      }

      const updateRow: Record<string, unknown> = {
        reconciliation_status: "reconciled",
        reconciled_at: new Date().toISOString(),
        reconciled_by: input.actorUserId,
      };

      if (input.notes) {
        updateRow.notes = input.notes.trim();
      }

      const { data, error } = await client
        .from("cod_collections")
        .update(updateRow)
        .eq("id", input.codCollectionId)
        .select("*")
        .single();

      if (error) throwMappedDbError("COD_RESOLVE_FAILED", error);

      return mapRow(data as Record<string, unknown>);
    },
  };
}

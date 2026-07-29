import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";

export interface DeliverySettingsRecord {
  branchId: string;
  branchCode: string;
  branchName: string;
  deliveryRadiusKm: number | null;
  minimumOrderAmount: number | null;
  deliveryFee: number | null;
  updatedAt: string;
}

export interface DeliverySettingsUpdateInput {
  branchId: string;
  deliveryRadiusKm?: number | null;
  minimumOrderAmount?: number | null;
  deliveryFee?: number | null;
}

export interface DeliverySettingsService {
  get(scope: BranchActorScope, branchId: string): Promise<DeliverySettingsRecord>;
  update(actor: AuthPrincipal, input: DeliverySettingsUpdateInput): Promise<DeliverySettingsRecord>;
}

type BranchRow = {
  id: string;
  branch_code: string;
  name: string;
  delivery_radius_km: number | string | null;
  minimum_order_amount: number | string | null;
  delivery_fee: number | string | null;
  updated_at: string;
};

const SELECT =
  "id, branch_code, name, delivery_radius_km, minimum_order_amount, delivery_fee, updated_at";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asScope(actor: AuthPrincipal): BranchActorScope {
  return {
    userId: actor.userId,
    isSuperAdmin: actor.isSuperAdmin,
    roles: actor.roles,
    branchIds: actor.branchIds,
  };
}

function toMoney(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: BranchRow): DeliverySettingsRecord {
  return {
    branchId: row.id,
    branchCode: row.branch_code,
    branchName: row.name,
    deliveryRadiusKm: toMoney(row.delivery_radius_km),
    minimumOrderAmount: toMoney(row.minimum_order_amount),
    deliveryFee: toMoney(row.delivery_fee),
    updatedAt: row.updated_at,
  };
}

function normalizeMoney(
  value: number | null | undefined,
  field: string,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(400, "VALIDATION_ERROR", `${field} must be a non-negative number.`);
  }
  return Math.round(value * 100) / 100;
}

export function createDeliverySettingsService(envStatus: EnvironmentStatus): DeliverySettingsService {
  const supabase = () => createServiceClient(envStatus);

  async function load(client: SupabaseClient, branchId: string): Promise<BranchRow> {
    const { data, error } = await client.from("branches").select(SELECT).eq("id", branchId).maybeSingle();
    if (error) {
      throw new ApiError(500, "DELIVERY_SETTINGS_READ_FAILED", error.message);
    }
    if (!data) {
      throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
    }
    return data as BranchRow;
  }

  return {
    async get(scope, branchId) {
      assertBranchMembership(scope, branchId);
      return mapRow(await load(supabase(), branchId));
    },

    async update(actor, input) {
      assertBranchMembership(asScope(actor), input.branchId);
      const patch: Record<string, unknown> = {};

      const radius = normalizeMoney(input.deliveryRadiusKm, "deliveryRadiusKm");
      if (radius !== undefined) patch.delivery_radius_km = radius;

      const minOrder = normalizeMoney(input.minimumOrderAmount, "minimumOrderAmount");
      if (minOrder !== undefined) patch.minimum_order_amount = minOrder;

      const fee = normalizeMoney(input.deliveryFee, "deliveryFee");
      if (fee !== undefined) patch.delivery_fee = fee;

      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No delivery settings fields to update.");
      }

      const client = supabase();
      const { data, error } = await client
        .from("branches")
        .update(patch)
        .eq("id", input.branchId)
        .select(SELECT)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "DELIVERY_SETTINGS_UPDATE_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      return mapRow(data as BranchRow);
    },
  };
}

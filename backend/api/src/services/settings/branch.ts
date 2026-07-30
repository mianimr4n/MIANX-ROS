import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";

/**
 * Owner ERP branch operational settings — hours + delivery commercial fields.
 * Persisted on public.branches (opening_hours jsonb + delivery_* columns).
 * There is no separate branch_settings table; columns already exist via Phase 2 migrations.
 */

export interface BranchSettingsRecord {
  branchId: string;
  branchCode: string;
  branchName: string;
  opensAt: string | null;
  closesAt: string | null;
  hoursDaily: string | null;
  deliveryRadiusKm: number | null;
  minimumOrderAmount: number | null;
  deliveryFee: number | null;
  updatedAt: string;
}

export interface BranchSettingsUpdateInput {
  opensAt?: string | null;
  closesAt?: string | null;
  deliveryRadiusKm?: number | null;
  minimumOrderAmount?: number | null;
  deliveryFee?: number | null;
}

export interface BranchSettingsService {
  get(scope: BranchActorScope, branchId: string): Promise<BranchSettingsRecord>;
  update(
    actor: AuthPrincipal,
    branchId: string,
    input: BranchSettingsUpdateInput,
  ): Promise<BranchSettingsRecord>;
}

type BranchRow = {
  id: string;
  branch_code: string;
  name: string;
  opening_hours: Record<string, unknown> | null;
  delivery_radius_km: number | string | null;
  minimum_order_amount: number | string | null;
  delivery_fee: number | string | null;
  updated_at: string;
};

const SELECT =
  "id, branch_code, name, opening_hours, delivery_radius_km, minimum_order_amount, delivery_fee, updated_at";

const TIME_HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

function parseHours(openingHours: Record<string, unknown> | null): {
  opensAt: string | null;
  closesAt: string | null;
  hoursDaily: string | null;
} {
  const oh = openingHours ?? {};
  const opensAt = typeof oh.opensAt === "string" && oh.opensAt.trim() ? oh.opensAt.trim() : null;
  const closesAt = typeof oh.closesAt === "string" && oh.closesAt.trim() ? oh.closesAt.trim() : null;
  const hoursDaily = typeof oh.daily === "string" && oh.daily.trim() ? oh.daily.trim() : null;
  return { opensAt, closesAt, hoursDaily };
}

function toMoney(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: BranchRow): BranchSettingsRecord {
  const hours = parseHours(row.opening_hours);
  return {
    branchId: row.id,
    branchCode: row.branch_code,
    branchName: row.name,
    opensAt: hours.opensAt,
    closesAt: hours.closesAt,
    hoursDaily: hours.hoursDaily,
    deliveryRadiusKm: toMoney(row.delivery_radius_km),
    minimumOrderAmount: toMoney(row.minimum_order_amount),
    deliveryFee: toMoney(row.delivery_fee),
    updatedAt: row.updated_at,
  };
}

function normalizeTime(value: string | null | undefined, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!TIME_HH_MM.test(trimmed)) {
    throw new ApiError(400, "VALIDATION_ERROR", `${field} must be HH:MM (24-hour).`);
  }
  return trimmed;
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

export function createBranchSettingsService(envStatus: EnvironmentStatus): BranchSettingsService {
  const supabase = () => createServiceClient(envStatus);

  async function load(client: SupabaseClient, branchId: string): Promise<BranchRow> {
    const { data, error } = await client.from("branches").select(SELECT).eq("id", branchId).maybeSingle();
    if (error) {
      throw new ApiError(500, "BRANCH_SETTINGS_READ_FAILED", error.message);
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

    async update(actor, branchId, input) {
      assertBranchMembership(asScope(actor), branchId);
      const client = supabase();
      const current = await load(client, branchId);
      const patch: Record<string, unknown> = {};

      const opensAt = normalizeTime(input.opensAt, "opensAt");
      const closesAt = normalizeTime(input.closesAt, "closesAt");
      if (opensAt !== undefined || closesAt !== undefined) {
        const nextOpens = opensAt === undefined ? parseHours(current.opening_hours).opensAt : opensAt;
        const nextCloses = closesAt === undefined ? parseHours(current.opening_hours).closesAt : closesAt;
        const base =
          current.opening_hours && typeof current.opening_hours === "object"
            ? { ...current.opening_hours }
            : {};
        if (nextOpens === null) delete base.opensAt;
        else base.opensAt = nextOpens;
        if (nextCloses === null) delete base.closesAt;
        else base.closesAt = nextCloses;
        if (nextOpens && nextCloses) {
          base.daily = `${nextOpens} - ${nextCloses}`;
        } else {
          delete base.daily;
        }
        patch.opening_hours = base;
      }

      const radius = normalizeMoney(input.deliveryRadiusKm, "deliveryRadiusKm");
      if (radius !== undefined) patch.delivery_radius_km = radius;

      const minOrder = normalizeMoney(input.minimumOrderAmount, "minimumOrderAmount");
      if (minOrder !== undefined) patch.minimum_order_amount = minOrder;

      const fee = normalizeMoney(input.deliveryFee, "deliveryFee");
      if (fee !== undefined) patch.delivery_fee = fee;

      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No branch settings fields to update.");
      }

      const { data, error } = await client
        .from("branches")
        .update(patch)
        .eq("id", branchId)
        .select(SELECT)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "BRANCH_SETTINGS_UPDATE_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      return mapRow(data as BranchRow);
    },
  };
}

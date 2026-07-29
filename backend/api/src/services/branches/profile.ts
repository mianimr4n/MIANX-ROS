import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "./operational-status.js";

export interface BranchProfileRecord {
  id: string;
  branchCode: string;
  name: string;
  city: string;
  area: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  status: string;
  timezone: string;
  opensAt: string | null;
  closesAt: string | null;
  hoursDaily: string | null;
  deliveryRadiusKm: number | null;
  updatedAt: string;
}

export interface BranchProfileUpdateInput {
  phone?: string | null;
  email?: string | null;
  address?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  deliveryRadiusKm?: number | null;
}

export interface BranchProfileService {
  get(scope: BranchActorScope, branchId: string): Promise<BranchProfileRecord>;
  update(actor: AuthPrincipal, branchId: string, input: BranchProfileUpdateInput): Promise<BranchProfileRecord>;
}

type BranchRow = {
  id: string;
  branch_code: string;
  name: string;
  city: string;
  area: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  status: string;
  timezone: string;
  opening_hours: Record<string, unknown> | null;
  delivery_radius_km: number | string | null;
  updated_at: string;
};

const SELECT =
  "id, branch_code, name, city, area, address, phone, email, status, timezone, opening_hours, delivery_radius_km, updated_at";

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

function toRadiusKm(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: BranchRow): BranchProfileRecord {
  const hours = parseHours(row.opening_hours);
  return {
    id: row.id,
    branchCode: row.branch_code,
    name: row.name,
    city: row.city,
    area: row.area,
    address: row.address,
    phone: row.phone,
    email: row.email,
    status: row.status,
    timezone: row.timezone,
    opensAt: hours.opensAt,
    closesAt: hours.closesAt,
    hoursDaily: hours.hoursDaily,
    deliveryRadiusKm: toRadiusKm(row.delivery_radius_km),
    updatedAt: row.updated_at,
  };
}

function normalizeOptionalText(value: string | null | undefined, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new ApiError(400, "VALIDATION_ERROR", `Value exceeds maximum length of ${max}.`);
  }
  return trimmed;
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

export function createBranchProfileService(envStatus: EnvironmentStatus): BranchProfileService {
  const supabase = () => createServiceClient(envStatus);

  async function load(client: SupabaseClient, branchId: string): Promise<BranchRow> {
    const { data, error } = await client.from("branches").select(SELECT).eq("id", branchId).maybeSingle();
    if (error) {
      throw new ApiError(500, "BRANCH_PROFILE_READ_FAILED", error.message);
    }
    if (!data) {
      throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
    }
    return data as BranchRow;
  }

  return {
    async get(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const row = await load(supabase(), branchId);
      return mapRow(row);
    },

    async update(actor, branchId, input) {
      assertBranchMembership(asScope(actor), branchId);
      const client = supabase();
      const current = await load(client, branchId);

      const patch: Record<string, unknown> = {};

      const phone = normalizeOptionalText(input.phone, 30);
      if (phone !== undefined) patch.phone = phone;

      const email = normalizeOptionalText(input.email, 150);
      if (email !== undefined) {
        if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Email format is invalid.");
        }
        patch.email = email;
      }

      if (input.address !== undefined) {
        const address = input.address.trim();
        if (!address) {
          throw new ApiError(400, "VALIDATION_ERROR", "Address is required.");
        }
        if (address.length > 2000) {
          throw new ApiError(400, "VALIDATION_ERROR", "Address exceeds maximum length of 2000.");
        }
        patch.address = address;
      }

      if (input.deliveryRadiusKm !== undefined) {
        if (input.deliveryRadiusKm === null) {
          patch.delivery_radius_km = null;
        } else if (!Number.isFinite(input.deliveryRadiusKm) || input.deliveryRadiusKm < 0) {
          throw new ApiError(400, "VALIDATION_ERROR", "deliveryRadiusKm must be a non-negative number.");
        } else {
          patch.delivery_radius_km = Math.round(input.deliveryRadiusKm * 100) / 100;
        }
      }

      const opensAt = normalizeTime(input.opensAt, "opensAt");
      const closesAt = normalizeTime(input.closesAt, "closesAt");
      if (opensAt !== undefined || closesAt !== undefined) {
        const nextOpens = opensAt === undefined ? parseHours(current.opening_hours).opensAt : opensAt;
        const nextCloses = closesAt === undefined ? parseHours(current.opening_hours).closesAt : closesAt;
        const base =
          current.opening_hours && typeof current.opening_hours === "object" ? { ...current.opening_hours } : {};
        if (nextOpens === null) delete base.opensAt;
        else if (nextOpens !== null) base.opensAt = nextOpens;
        if (nextCloses === null) delete base.closesAt;
        else if (nextCloses !== null) base.closesAt = nextCloses;
        if (nextOpens && nextCloses) {
          base.daily = `${nextOpens} - ${nextCloses}`;
        }
        patch.opening_hours = base;
      }

      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No branch profile fields to update.");
      }

      const { data, error } = await client
        .from("branches")
        .update(patch)
        .eq("id", branchId)
        .select(SELECT)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "BRANCH_PROFILE_UPDATE_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      return mapRow(data as BranchRow);
    },
  };
}

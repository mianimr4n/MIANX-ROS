import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";

export interface OrganizationSettingsRecord {
  companyName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface OrganizationSettingsUpdateInput {
  companyName?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface OrganizationSettingsService {
  get(): Promise<OrganizationSettingsRecord>;
  update(actor: AuthPrincipal, input: OrganizationSettingsUpdateInput): Promise<OrganizationSettingsRecord>;
}

type OrganizationRow = {
  id: number;
  company_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  updated_at: string;
  updated_by: string | null;
};

const SELECT = "id, company_name, phone, email, address, updated_at, updated_by";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRow(row: OrganizationRow): OrganizationSettingsRecord {
  return {
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
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

export function createOrganizationSettingsService(envStatus: EnvironmentStatus): OrganizationSettingsService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async get() {
      const client = supabase();
      const { data, error } = await client.from("organization_settings").select(SELECT).eq("id", 1).maybeSingle();
      if (error) {
        throw new ApiError(500, "ORGANIZATION_SETTINGS_READ_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(
          404,
          "ORGANIZATION_SETTINGS_NOT_FOUND",
          "Organization settings row is missing. Apply Phase 2 migrations.",
        );
      }
      return mapRow(data as OrganizationRow);
    },

    async update(actor, input) {
      const patch: Record<string, unknown> = {
        updated_by: actor.userId,
      };

      if (input.companyName !== undefined) {
        const name = input.companyName.trim();
        if (!name) {
          throw new ApiError(400, "VALIDATION_ERROR", "Company name is required.");
        }
        if (name.length > 200) {
          throw new ApiError(400, "VALIDATION_ERROR", "Company name exceeds maximum length of 200.");
        }
        patch.company_name = name;
      }

      const phone = normalizeOptionalText(input.phone, 30);
      if (phone !== undefined) patch.phone = phone;

      const email = normalizeOptionalText(input.email, 150);
      if (email !== undefined) {
        if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Email format is invalid.");
        }
        patch.email = email;
      }

      const address = normalizeOptionalText(input.address, 2000);
      if (address !== undefined) patch.address = address;

      if (Object.keys(patch).length <= 1) {
        throw new ApiError(400, "VALIDATION_ERROR", "No organization fields to update.");
      }

      const client = supabase();
      const { data, error } = await client
        .from("organization_settings")
        .update(patch)
        .eq("id", 1)
        .select(SELECT)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "ORGANIZATION_SETTINGS_UPDATE_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(
          404,
          "ORGANIZATION_SETTINGS_NOT_FOUND",
          "Organization settings row is missing. Apply Phase 2 migrations.",
        );
      }
      return mapRow(data as OrganizationRow);
    },
  };
}

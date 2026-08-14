/**
 * Customer identity service (ADR-005).
 *
 * Canonical lookup + creation of customer identities. Wraps the
 * `customer_identities` table and the `resolve_customer_by_identity`
 * RPC. Used by:
 *   - WhatsApp inbound worker (to resolve customer from phone)
 *   - Customer support search (to find customer by phone/email)
 *   - Checkout flow (to find or create customer from guest info)
 *
 * Authority: ADR-005 §1 (canonical customers.id), §7 (identity lookup RPC)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdentityType = "phone_e164" | "email" | "auth_user_id" | "whatsapp_phone";

export const IDENTITY_TYPES: IdentityType[] = [
  "phone_e164",
  "email",
  "auth_user_id",
  "whatsapp_phone",
];

export interface CustomerIdentityRow {
  id: string;
  customerId: string;
  identityType: IdentityType;
  value: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  mergedIntoId: string | null;
  identities: CustomerIdentityRow[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerIdentityService {
  /**
   * Resolve a customer by identity. Returns the customer UUID or null
   * if no customer has this identity. Calls the SQL RPC
   * `resolve_customer_by_identity`.
   */
  resolveCustomer(input: {
    identityType: IdentityType;
    value: string;
  }): Promise<string | null>;

  /**
   * Normalize a phone string to E.164. Calls the SQL function
   * `normalize_phone_e164`. Returns null if input cannot be normalized.
   */
  normalizePhone(phone: string): Promise<string | null>;

  /**
   * Get a customer summary by id, including all linked identities.
   */
  getCustomer(input: {
    customerId: string;
  }): Promise<CustomerSummary | null>;

  /**
   * List identities for a customer.
   */
  listIdentities(input: { customerId: string }): Promise<CustomerIdentityRow[]>;

  /**
   * Add a new identity to an existing customer. Validates uniqueness.
   */
  addIdentity(input: {
    customerId: string;
    identityType: IdentityType;
    value: string;
    verifiedAt?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<CustomerIdentityRow>;

  /**
   * Search customers by phone or email (partial match). Returns up to
   * `limit` results. Used by the customer support search UI.
   */
  searchCustomers(input: {
    query: string;
    limit?: number;
  }): Promise<CustomerSummary[]>;
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

function mapIdentityRow(row: Record<string, unknown>): CustomerIdentityRow {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    identityType: row.identity_type as IdentityType,
    value: String(row.value),
    verifiedAt: (row.verified_at as string | null) ?? null,
    verifiedBy: (row.verified_by as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCustomerRow(row: Record<string, unknown>, identities: CustomerIdentityRow[]): CustomerSummary {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    fullName: String(row.full_name ?? ""),
    phone: String(row.phone ?? ""),
    email: (row.email as string | null) ?? null,
    status: String(row.status ?? "active"),
    mergedIntoId: (row.merged_into_id as string | null) ?? null,
    identities,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createCustomerIdentityService(envStatus: EnvironmentStatus): CustomerIdentityService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async resolveCustomer({ identityType, value }) {
      if (!identityType || !value) return null;
      const client = supabase();
      const { data, error } = await client.rpc("resolve_customer_by_identity", {
        p_identity_type: identityType,
        p_value: value,
      });
      if (error) {
        throwMappedDbError("CUSTOMER_IDENTITY_RESOLVE_FAILED", error);
      }
      return (data as string | null) ?? null;
    },

    async normalizePhone(phone) {
      if (!phone) return null;
      const client = supabase();
      const { data, error } = await client.rpc("normalize_phone_e164", {
        p_input: phone,
      });
      if (error) {
        throwMappedDbError("PHONE_NORMALIZE_FAILED", error);
      }
      return (data as string | null) ?? null;
    },

    async getCustomer({ customerId }) {
      const client = supabase();
      const { data, error } = await client
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .maybeSingle();
      if (error) throwMappedDbError("CUSTOMER_READ_FAILED", error);
      if (!data) return null;

      const { data: identitiesData, error: identitiesError } = await client
        .from("customer_identities")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      if (identitiesError) throwMappedDbError("CUSTOMER_IDENTITIES_READ_FAILED", identitiesError);

      const identities = ((identitiesData ?? []) as Array<Record<string, unknown>>).map(mapIdentityRow);
      return mapCustomerRow(data as Record<string, unknown>, identities);
    },

    async listIdentities({ customerId }) {
      const client = supabase();
      const { data, error } = await client
        .from("customer_identities")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      if (error) throwMappedDbError("CUSTOMER_IDENTITIES_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapIdentityRow);
    },

    async addIdentity({ customerId, identityType, value, verifiedAt, metadata }) {
      if (!customerId) throw new ApiError(400, "INVALID_IDENTITY", "customerId is required.");
      if (!identityType || !IDENTITY_TYPES.includes(identityType)) {
        throw new ApiError(400, "INVALID_IDENTITY", `identityType must be one of: ${IDENTITY_TYPES.join(", ")}.`);
      }
      if (!value || typeof value !== "string") {
        throw new ApiError(400, "INVALID_IDENTITY", "value is required.");
      }
      // Normalize email to lowercase
      const normalizedValue = identityType === "email" ? value.toLowerCase().trim() : value.trim();

      const client = supabase();
      const { data, error } = await client
        .from("customer_identities")
        .insert({
          customer_id: customerId,
          identity_type: identityType,
          value: normalizedValue,
          verified_at: verifiedAt ?? null,
          metadata: metadata ?? {},
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "IDENTITY_ALREADY_LINKED",
            `Identity ${identityType}=${normalizedValue} is already linked to another customer.`,
          );
        }
        throwMappedDbError("IDENTITY_INSERT_FAILED", error);
      }
      return mapIdentityRow(data as Record<string, unknown>);
    },

    async searchCustomers({ query, limit }) {
      const cap = Math.min(Math.max(limit ?? 20, 1), 100);
      const q = query.trim();
      if (!q) return [];

      const client = supabase();
      // Try identity table first (exact match on phone or email)
      const normalizedPhone = await this.normalizePhone(q);
      const identityMatch: string[] = [];

      if (normalizedPhone) {
        const { data: byPhone } = await client
          .from("customer_identities")
          .select("customer_id")
          .eq("identity_type", "phone_e164")
          .eq("value", normalizedPhone)
          .limit(5);
        for (const row of (byPhone ?? []) as Array<{ customer_id: string }>) {
          identityMatch.push(row.customer_id);
        }
      }

      // Email match
      const { data: byEmail } = await client
        .from("customer_identities")
        .select("customer_id")
        .eq("identity_type", "email")
        .eq("value", q.toLowerCase())
        .limit(5);
      for (const row of (byEmail ?? []) as Array<{ customer_id: string }>) {
        identityMatch.push(row.customer_id);
      }

      // Also do ILIKE on customers table (name + phone)
      const { data: byName, error: nameError } = await client
        .from("customers")
        .select("*")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(cap);
      if (nameError) throwMappedDbError("CUSTOMER_SEARCH_FAILED", nameError);

      const customerRows = (byName ?? []) as Array<Record<string, unknown>>;
      const seen = new Set<string>();
      const results: CustomerSummary[] = [];

      // Identity matches first (higher confidence)
      if (identityMatch.length > 0) {
        const { data: idCustomers } = await client
          .from("customers")
          .select("*")
          .in("id", identityMatch)
          .limit(cap);
        for (const row of (idCustomers ?? []) as Array<Record<string, unknown>>) {
          const id = String(row.id);
          if (!seen.has(id)) {
            seen.add(id);
            results.push(mapCustomerRow(row, [])); // identities omitted for search
          }
        }
      }

      // Then ILIKE matches
      for (const row of customerRows) {
        const id = String(row.id);
        if (!seen.has(id) && results.length < cap) {
          seen.add(id);
          results.push(mapCustomerRow(row, []));
        }
      }

      return results;
    },
  };
}

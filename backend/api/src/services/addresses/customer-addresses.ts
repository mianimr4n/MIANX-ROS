import { createClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import { ApiError } from "../../common/http.js";
import { normalizePakistaniMobileE164 } from "../auth/phone.js";

export type AddressLabel = "Home" | "Office" | "Other";
export type AddressStatus = "active" | "archived";

export type CustomerAddressRecord = {
  id: string;
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  area: string;
  city: string;
  deliveryZone: string;
  preferredBranchId: string | null;
  isDefault: boolean;
  status: AddressStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddressInput = {
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  area?: string;
  city?: string;
  deliveryZone?: string;
  preferredBranchId?: string | null;
  isDefault?: boolean;
};

export type CustomerAddressImportItem = CustomerAddressInput & {
  /** Client draft id — used only for idempotent import keying, not stored as PK. */
  draftKey?: string;
};

export const MAX_ACTIVE_CUSTOMER_ADDRESSES = 20;

export interface CustomerAddressesDataSource {
  listAddresses(authUserId: string): Promise<CustomerAddressRecord[]>;
  createAddress(authUserId: string, input: CustomerAddressInput): Promise<CustomerAddressRecord>;
  updateAddress(
    authUserId: string,
    addressId: string,
    input: CustomerAddressInput,
  ): Promise<CustomerAddressRecord>;
  archiveAddress(authUserId: string, addressId: string): Promise<CustomerAddressRecord>;
  importAddresses(
    authUserId: string,
    drafts: CustomerAddressImportItem[],
  ): Promise<{ imported: CustomerAddressRecord[]; skipped: number }>;
}

type AddressRow = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  area: string;
  city: string;
  delivery_zone: string;
  preferred_branch_id: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: AddressRow): CustomerAddressRecord {
  return {
    id: row.id,
    label: row.label as AddressLabel,
    recipientName: row.recipient_name ?? "",
    phone: row.phone ?? "",
    line1: row.line1,
    line2: row.line2 ?? "",
    landmark: row.landmark ?? "",
    area: row.area ?? "",
    city: row.city ?? "Multan",
    deliveryZone: row.delivery_zone ?? "",
    preferredBranchId: row.preferred_branch_id,
    isDefault: Boolean(row.is_default),
    status: row.status as AddressStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeAddressInput(input: CustomerAddressInput): {
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  area: string;
  city: string;
  deliveryZone: string;
  preferredBranchId: string | null;
  isDefault: boolean;
} {
  const line1 = input.line1.trim();
  if (!line1) {
    throw new ApiError(400, "VALIDATION_ERROR", "Enter a street address (line 1).");
  }
  if (line1.length > 200) {
    throw new ApiError(400, "VALIDATION_ERROR", "Address line 1 is too long.");
  }

  const recipientName = input.recipientName.trim();
  if (!recipientName) {
    throw new ApiError(400, "VALIDATION_ERROR", "Enter a recipient name.");
  }
  if (recipientName.length > 150) {
    throw new ApiError(400, "VALIDATION_ERROR", "Recipient name is too long.");
  }

  const phone = normalizePakistaniMobileE164(input.phone);
  const label = input.label;
  if (label !== "Home" && label !== "Office" && label !== "Other") {
    throw new ApiError(400, "VALIDATION_ERROR", "Label must be Home, Office, or Other.");
  }

  let preferredBranchId =
    input.preferredBranchId === undefined || input.preferredBranchId === null || input.preferredBranchId === ""
      ? null
      : input.preferredBranchId;

  if (
    preferredBranchId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      preferredBranchId,
    )
  ) {
    // Bundled fallback branch codes are not UUIDs — ignore until live branch ids are used.
    preferredBranchId = null;
  }

  return {
    label,
    recipientName,
    phone,
    line1,
    line2: (input.line2 ?? "").trim().slice(0, 200),
    landmark: (input.landmark ?? "").trim().slice(0, 200),
    area: (input.area ?? "").trim().slice(0, 120),
    city: (input.city ?? "").trim().slice(0, 80) || "Multan",
    deliveryZone: (input.deliveryZone ?? "").trim().slice(0, 120),
    preferredBranchId,
    isDefault: Boolean(input.isDefault),
  };
}

export function createUnavailableCustomerAddressesDataSource(): CustomerAddressesDataSource {
  const fail = (): never => {
    throw new ApiError(
      503,
      "ADDRESSES_UNAVAILABLE",
      "Address book is not configured. Configure Supabase service role.",
    );
  };
  return {
    listAddresses: fail,
    createAddress: fail,
    updateAddress: fail,
    archiveAddress: fail,
    importAddresses: fail,
  };
}

type SupabaseLike = {
  from: (table: string) => any;
};

export function createCustomerAddressesDataSourceFromEnv(
  envStatus: EnvironmentStatus,
): CustomerAddressesDataSource {
  if (!envStatus.isReady) {
    return createUnavailableCustomerAddressesDataSource();
  }
  const client = createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createCustomerAddressesDataSource(client);
}

export function createCustomerAddressesDataSource(client: SupabaseLike | null): CustomerAddressesDataSource {
  if (!client) {
    return createUnavailableCustomerAddressesDataSource();
  }
  const db = client;

  async function countActive(authUserId: string): Promise<number> {
    const { count, error } = await db
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUserId)
      .eq("status", "active");
    if (error) throw new ApiError(500, "ADDRESS_LOOKUP_FAILED", error.message);
    return count ?? 0;
  }

  async function clearDefaults(authUserId: string): Promise<void> {
    const { error } = await db
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("user_id", authUserId)
      .eq("status", "active")
      .eq("is_default", true);
    if (error) throw new ApiError(500, "ADDRESS_UPDATE_FAILED", error.message);
  }

  async function loadOwned(authUserId: string, addressId: string): Promise<AddressRow> {
    const { data, error } = await db
      .from("customer_addresses")
      .select("*")
      .eq("id", addressId)
      .eq("user_id", authUserId)
      .maybeSingle();
    if (error) throw new ApiError(500, "ADDRESS_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Address not found.");
    return data as AddressRow;
  }

  async function promoteDefaultIfNeeded(authUserId: string): Promise<void> {
    const { data, error } = await db
      .from("customer_addresses")
      .select("id")
      .eq("user_id", authUserId)
      .eq("status", "active")
      .eq("is_default", true)
      .limit(1);
    if (error) throw new ApiError(500, "ADDRESS_LOOKUP_FAILED", error.message);
    if (data && data.length > 0) return;

    const { data: latest, error: latestError } = await db
      .from("customer_addresses")
      .select("id")
      .eq("user_id", authUserId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw new ApiError(500, "ADDRESS_LOOKUP_FAILED", latestError.message);
    if (!latest) return;

    const { error: promoteError } = await db
      .from("customer_addresses")
      .update({ is_default: true })
      .eq("id", (latest as { id: string }).id)
      .eq("user_id", authUserId);
    if (promoteError) throw new ApiError(500, "ADDRESS_UPDATE_FAILED", promoteError.message);
  }

  return {
    async listAddresses(authUserId) {
      const { data, error } = await db
        .from("customer_addresses")
        .select("*")
        .eq("user_id", authUserId)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw new ApiError(500, "ADDRESS_LIST_FAILED", error.message);
      return ((data ?? []) as AddressRow[]).map(mapRow);
    },

    async createAddress(authUserId, input) {
      const normalized = normalizeAddressInput(input);
      const activeCount = await countActive(authUserId);
      if (activeCount >= MAX_ACTIVE_CUSTOMER_ADDRESSES) {
        throw new ApiError(
          400,
          "ADDRESS_LIMIT",
          `You can save up to ${MAX_ACTIVE_CUSTOMER_ADDRESSES} active addresses.`,
        );
      }

      const shouldDefault = normalized.isDefault || activeCount === 0;
      if (shouldDefault) await clearDefaults(authUserId);

      const { data, error } = await db
        .from("customer_addresses")
        .insert({
          user_id: authUserId,
          label: normalized.label,
          recipient_name: normalized.recipientName,
          phone: normalized.phone,
          line1: normalized.line1,
          line2: normalized.line2,
          landmark: normalized.landmark,
          area: normalized.area,
          city: normalized.city,
          delivery_zone: normalized.deliveryZone,
          preferred_branch_id: normalized.preferredBranchId,
          is_default: shouldDefault,
          status: "active",
        })
        .select("*")
        .single();

      if (error) {
        if (String(error.message).toLowerCase().includes("preferred_branch")) {
          throw new ApiError(400, "VALIDATION_ERROR", "Preferred branch is invalid.");
        }
        throw new ApiError(500, "ADDRESS_CREATE_FAILED", error.message);
      }
      return mapRow(data as AddressRow);
    },

    async updateAddress(authUserId, addressId, input) {
      const existing = await loadOwned(authUserId, addressId);
      if (existing.status !== "active") {
        throw new ApiError(409, "ADDRESS_ARCHIVED", "Archived addresses cannot be edited. Add a new one.");
      }
      const normalized = normalizeAddressInput(input);
      const shouldDefault = normalized.isDefault;
      if (shouldDefault) await clearDefaults(authUserId);

      const { data, error } = await db
        .from("customer_addresses")
        .update({
          label: normalized.label,
          recipient_name: normalized.recipientName,
          phone: normalized.phone,
          line1: normalized.line1,
          line2: normalized.line2,
          landmark: normalized.landmark,
          area: normalized.area,
          city: normalized.city,
          delivery_zone: normalized.deliveryZone,
          preferred_branch_id: normalized.preferredBranchId,
          is_default: shouldDefault,
        })
        .eq("id", addressId)
        .eq("user_id", authUserId)
        .eq("status", "active")
        .select("*")
        .maybeSingle();

      if (error) throw new ApiError(500, "ADDRESS_UPDATE_FAILED", error.message);
      if (!data) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Address not found.");
      if (!shouldDefault) await promoteDefaultIfNeeded(authUserId);
      return mapRow(data as AddressRow);
    },

    async archiveAddress(authUserId, addressId) {
      await loadOwned(authUserId, addressId);
      const { data, error } = await client
        .from("customer_addresses")
        .update({ is_default: false, status: "archived" })
        .eq("id", addressId)
        .eq("user_id", authUserId)
        .select("*")
        .maybeSingle();
      if (error) throw new ApiError(500, "ADDRESS_ARCHIVE_FAILED", error.message);
      if (!data) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Address not found.");
      await promoteDefaultIfNeeded(authUserId);
      return mapRow(data as AddressRow);
    },

    async importAddresses(authUserId, drafts) {
      if (!Array.isArray(drafts) || drafts.length === 0) {
        return { imported: [], skipped: 0 };
      }

      const existing = await this.listAddresses(authUserId);
      const fingerprint = (row: {
        label: string;
        line1: string;
        city: string;
        phone?: string;
      }) =>
        `${row.label}|${row.line1.trim().toLowerCase()}|${(row.city || "Multan").trim().toLowerCase()}|${(row.phone ?? "").trim()}`;

      const seen = new Set(existing.map((row) => fingerprint(row)));
      const imported: CustomerAddressRecord[] = [];
      let skipped = 0;

      for (const draft of drafts.slice(0, MAX_ACTIVE_CUSTOMER_ADDRESSES)) {
        let normalized;
        try {
          normalized = normalizeAddressInput(draft);
        } catch {
          skipped += 1;
          continue;
        }
        const key = fingerprint(normalized);
        if (seen.has(key)) {
          skipped += 1;
          continue;
        }
        const activeCount = await countActive(authUserId);
        if (activeCount >= MAX_ACTIVE_CUSTOMER_ADDRESSES) {
          skipped += drafts.length - imported.length - skipped;
          break;
        }
        const created = await this.createAddress(authUserId, {
          ...draft,
          isDefault: imported.length === 0 && existing.length === 0 ? true : Boolean(draft.isDefault),
        });
        seen.add(key);
        imported.push(created);
      }

      return { imported, skipped };
    },
  };
}


import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { generateSecureQrToken, type RestaurantTableStatus } from "./qr.js";

export interface BranchActorScope {
  userId: string;
  isSuperAdmin: boolean;
  roles: string[];
  branchIds: string[];
}

/** API-safe table record — never includes qr_token_hash. */
export interface SafeRestaurantTable {
  id: string;
  branchId: string;
  tableNumber: string;
  displayName: string | null;
  capacity: number | null;
  floorOrZone: string | null;
  status: RestaurantTableStatus;
  qrVersion: number;
  qrIssued: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListRestaurantTablesFilters {
  branchId?: string;
  status?: RestaurantTableStatus;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface CreateRestaurantTableInput {
  branchId: string;
  tableNumber: string;
  displayName?: string | null;
  capacity?: number | null;
  floorOrZone?: string | null;
  status?: RestaurantTableStatus;
  isActive?: boolean;
  /** When true (default), generate QR token and return raw once. */
  generateQr?: boolean;
}

export interface RestaurantTablesDataSource {
  listTables(
    scope: BranchActorScope,
    filters: ListRestaurantTablesFilters,
  ): Promise<{ tables: SafeRestaurantTable[]; pagination: PaginationMeta }>;
  getTable(scope: BranchActorScope, id: string): Promise<SafeRestaurantTable>;
  createTable(
    scope: BranchActorScope,
    input: CreateRestaurantTableInput,
  ): Promise<{ table: SafeRestaurantTable; rawQrToken: string | null }>;
}

interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  returned: number;
}

type TableRow = {
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
  created_at: string;
  updated_at: string;
};

const SAFE_SELECT =
  "id, branch_id, table_number, display_name, capacity, floor_or_zone, status, qr_token_hash, qr_version, is_active, created_at, updated_at";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertBranchInScope(scope: BranchActorScope, branchId: string): void {
  if (scope.isSuperAdmin) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "TABLE_ACCESS_DENIED", "Table belongs to another branch.");
  }
}

function toSafe(row: TableRow): SafeRestaurantTable {
  return {
    id: row.id,
    branchId: row.branch_id,
    tableNumber: row.table_number,
    displayName: row.display_name,
    capacity: row.capacity,
    floorOrZone: row.floor_or_zone,
    status: row.status,
    qrVersion: row.qr_version,
    qrIssued: Boolean(row.qr_token_hash),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createRestaurantTablesDataSource(
  envStatus: EnvironmentStatus,
): RestaurantTablesDataSource {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async listTables(scope, filters) {
      const supabase = getClient();
      let query = supabase.from("restaurant_tables").select(SAFE_SELECT, { count: "exact" });

      if (scope.isSuperAdmin) {
        if (filters.branchId) {
          query = query.eq("branch_id", filters.branchId);
        }
      } else {
        if (scope.branchIds.length === 0) {
          return {
            tables: [],
            pagination: { limit: filters.limit, offset: filters.offset, total: 0, returned: 0 },
          };
        }
        if (filters.branchId) {
          assertBranchInScope(scope, filters.branchId);
          query = query.eq("branch_id", filters.branchId);
        } else {
          query = query.in("branch_id", scope.branchIds);
        }
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (typeof filters.isActive === "boolean") {
        query = query.eq("is_active", filters.isActive);
      }

      query = query
        .order("table_number", { ascending: true })
        .range(filters.offset, filters.offset + filters.limit - 1);

      const { data, error, count } = await query;
      if (error) {
        throw new ApiError(500, "TABLE_LIST_FAILED", error.message);
      }

      const tables = ((data ?? []) as TableRow[]).map(toSafe);
      return {
        tables,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: count ?? tables.length,
          returned: tables.length,
        },
      };
    },

    async getTable(scope, id) {
      const supabase = getClient();
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select(SAFE_SELECT)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "TABLE_LOOKUP_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(404, "TABLE_NOT_FOUND", "Restaurant table not found.");
      }

      const row = data as TableRow;
      assertBranchInScope(scope, row.branch_id);
      return toSafe(row);
    },

    async createTable(scope, input) {
      assertBranchInScope(scope, input.branchId);

      const tableNumber = input.tableNumber.trim();
      if (!tableNumber || tableNumber.length > 40) {
        throw new ApiError(422, "VALIDATION_ERROR", "tableNumber must be 1–40 characters.");
      }

      const generateQr = input.generateQr !== false;
      let rawQrToken: string | null = null;
      let tokenHash: string | null = null;
      if (generateQr) {
        const generated = generateSecureQrToken();
        rawQrToken = generated.rawToken;
        tokenHash = generated.tokenHash;
      }

      const supabase = getClient();
      const { data, error } = await supabase
        .from("restaurant_tables")
        .insert({
          branch_id: input.branchId,
          table_number: tableNumber,
          display_name: input.displayName?.trim() || null,
          capacity: input.capacity ?? null,
          floor_or_zone: input.floorOrZone?.trim() || null,
          status: input.status ?? "available",
          is_active: input.isActive ?? true,
          qr_token_hash: tokenHash,
          qr_version: 1,
        })
        .select(SAFE_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(
            409,
            "TABLE_CONFLICT",
            "A table with this number already exists for the branch.",
          );
        }
        throw new ApiError(500, "TABLE_CREATE_FAILED", error.message);
      }

      return { table: toSafe(data as TableRow), rawQrToken };
    },
  };
}

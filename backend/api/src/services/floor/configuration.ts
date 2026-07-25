import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { BranchActorScope } from "../tables/management.js";

/**
 * D3 — floor plan configuration: floors, service areas, table layout,
 * table state machine (housekeeping transitions), and combinations.
 * Mutations run through the service-role client; every entry point enforces
 * branch scope from the caller's AuthPrincipal.
 */

export const TABLE_OPERATIONAL_STATUSES = [
  "available",
  "reserved",
  "occupied",
  "ordering",
  "served",
  "bill_requested",
  "payment_pending",
  "cleaning",
  "blocked",
  "out_of_service",
] as const;
export type TableOperationalStatus = (typeof TABLE_OPERATIONAL_STATUSES)[number];

export const TABLE_SHAPES = ["square", "rectangle", "round", "custom"] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

/**
 * Direct (housekeeping) transitions. Session-lifecycle states
 * (occupied/ordering/served/bill_requested/payment_pending) are owned by the
 * atomic seating/transfer/close RPCs and cannot be entered directly.
 */
const DIRECT_TRANSITIONS: Record<TableOperationalStatus, TableOperationalStatus[]> = {
  available: ["reserved", "blocked", "out_of_service", "cleaning"],
  reserved: ["available", "blocked", "out_of_service"],
  occupied: [],
  ordering: [],
  served: [],
  bill_requested: [],
  payment_pending: [],
  cleaning: ["available", "blocked", "out_of_service"],
  blocked: ["available", "out_of_service"],
  out_of_service: ["available", "blocked"],
};

function legacyStatusFor(operational: TableOperationalStatus): string {
  if (operational === "available") return "available";
  if (operational === "reserved") return "reserved";
  if (["occupied", "ordering", "served", "bill_requested", "payment_pending", "cleaning"].includes(operational)) {
    return "occupied";
  }
  return "inactive";
}

export interface FloorRecord {
  id: string;
  branchId: string;
  code: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAreaRecord {
  id: string;
  branchId: string;
  floorId: string;
  code: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  colorToken: string | null;
  isActive: boolean;
}

export interface FloorTableRecord {
  id: string;
  branchId: string;
  floorId: string | null;
  serviceAreaId: string | null;
  tableNumber: string;
  displayName: string | null;
  capacityMin: number;
  capacityMax: number | null;
  shape: TableShape;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  isAccessible: boolean;
  highChairSupported: boolean;
  isActive: boolean;
  operationalStatus: TableOperationalStatus;
  updatedAt: string;
}

export interface TableCombinationRecord {
  id: string;
  branchId: string;
  code: string;
  displayName: string;
  minPartySize: number;
  maxPartySize: number | null;
  isActive: boolean;
  tableIds: string[];
  derivedCapacity: number;
}

export interface FloorConfigurationService {
  getConfiguration(
    scope: BranchActorScope,
    branchId: string,
  ): Promise<{ floors: FloorRecord[]; areas: ServiceAreaRecord[]; tables: FloorTableRecord[] }>;
  createFloor(
    scope: BranchActorScope,
    input: { branchId: string; code: string; displayName: string; description?: string | null; sortOrder?: number },
  ): Promise<FloorRecord>;
  updateFloor(
    scope: BranchActorScope,
    floorId: string,
    patch: { displayName?: string; description?: string | null; sortOrder?: number; isActive?: boolean },
  ): Promise<FloorRecord>;
  createArea(
    scope: BranchActorScope,
    input: {
      branchId: string;
      floorId: string;
      code: string;
      displayName: string;
      description?: string | null;
      sortOrder?: number;
      colorToken?: string | null;
    },
  ): Promise<ServiceAreaRecord>;
  updateArea(
    scope: BranchActorScope,
    areaId: string,
    patch: {
      displayName?: string;
      description?: string | null;
      sortOrder?: number;
      colorToken?: string | null;
      isActive?: boolean;
    },
  ): Promise<ServiceAreaRecord>;
  updateTableLayout(
    scope: BranchActorScope,
    tableId: string,
    patch: {
      displayName?: string | null;
      floorId?: string | null;
      serviceAreaId?: string | null;
      capacityMin?: number;
      capacityMax?: number | null;
      shape?: TableShape;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
      rotation?: number;
      isAccessible?: boolean;
      highChairSupported?: boolean;
      isActive?: boolean;
    },
    actorUserId: string,
  ): Promise<FloorTableRecord>;
  transitionTableStatus(
    scope: BranchActorScope,
    tableId: string,
    toStatus: TableOperationalStatus,
    actorUserId: string,
    note?: string,
  ): Promise<FloorTableRecord>;
  listCombinations(scope: BranchActorScope, branchId: string): Promise<TableCombinationRecord[]>;
  createCombination(
    scope: BranchActorScope,
    input: {
      branchId: string;
      code: string;
      displayName: string;
      minPartySize?: number;
      maxPartySize?: number | null;
      tableIds: string[];
    },
  ): Promise<TableCombinationRecord>;
  updateCombination(
    scope: BranchActorScope,
    combinationId: string,
    patch: {
      displayName?: string;
      minPartySize?: number;
      maxPartySize?: number | null;
      isActive?: boolean;
      tableIds?: string[];
    },
  ): Promise<TableCombinationRecord>;
}

const TABLE_SELECT =
  "id, branch_id, floor_id, service_area_id, table_number, display_name, capacity, capacity_min, capacity_max, shape, position_x, position_y, width, height, rotation, is_accessible, high_chair_supported, is_active, operational_status, updated_at";

type TableRow = {
  id: string;
  branch_id: string;
  floor_id: string | null;
  service_area_id: string | null;
  table_number: string;
  display_name: string | null;
  capacity: number | null;
  capacity_min: number;
  capacity_max: number | null;
  shape: TableShape;
  position_x: number | string;
  position_y: number | string;
  width: number | string;
  height: number | string;
  rotation: number | string;
  is_accessible: boolean;
  high_chair_supported: boolean;
  is_active: boolean;
  operational_status: TableOperationalStatus;
  updated_at: string;
};

function n(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? (parsed as number) : 0;
}

function toTable(row: TableRow): FloorTableRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    floorId: row.floor_id,
    serviceAreaId: row.service_area_id,
    tableNumber: row.table_number,
    displayName: row.display_name,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max ?? row.capacity,
    shape: row.shape,
    positionX: n(row.position_x),
    positionY: n(row.position_y),
    width: n(row.width),
    height: n(row.height),
    rotation: n(row.rotation),
    isAccessible: row.is_accessible,
    highChairSupported: row.high_chair_supported,
    isActive: row.is_active,
    operationalStatus: row.operational_status,
    updatedAt: row.updated_at,
  };
}

type FloorRow = {
  id: string;
  branch_id: string;
  code: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toFloor(row: FloorRow): FloorRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    code: row.code,
    displayName: row.display_name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type AreaRow = {
  id: string;
  branch_id: string;
  floor_id: string;
  code: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  color_token: string | null;
  is_active: boolean;
};

function toArea(row: AreaRow): ServiceAreaRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    floorId: row.floor_id,
    code: row.code,
    displayName: row.display_name,
    description: row.description,
    sortOrder: row.sort_order,
    colorToken: row.color_token,
    isActive: row.is_active,
  };
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertBranchInScope(scope: BranchActorScope, branchId: string): void {
  if (scope.isSuperAdmin) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new ApiError(403, "FLOOR_ACCESS_DENIED", "Resource belongs to another branch.");
  }
}

async function writeAudit(
  supabase: SupabaseClient,
  entry: {
    branchId: string;
    actorUserId: string | null;
    resourceType: string;
    resourceId: string | null;
    action: string;
    before?: unknown;
    after?: unknown;
    note?: string | null;
  },
): Promise<void> {
  await supabase.from("table_service_audit").insert({
    branch_id: entry.branchId,
    actor_user_id: entry.actorUserId,
    actor_type: "staff",
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    action: entry.action,
    before_data: entry.before ?? null,
    after_data: entry.after ?? null,
    note: entry.note ?? null,
  });
}

export function createFloorConfigurationService(
  envStatus: EnvironmentStatus,
): FloorConfigurationService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadFloor(floorId: string): Promise<FloorRow> {
    const { data, error } = await getClient()
      .from("restaurant_floors")
      .select("*")
      .eq("id", floorId)
      .maybeSingle();
    if (error) throw new ApiError(500, "FLOOR_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "FLOOR_NOT_FOUND", "Floor not found.");
    return data as FloorRow;
  }

  async function loadArea(areaId: string): Promise<AreaRow> {
    const { data, error } = await getClient()
      .from("service_areas")
      .select("*")
      .eq("id", areaId)
      .maybeSingle();
    if (error) throw new ApiError(500, "AREA_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "AREA_NOT_FOUND", "Service area not found.");
    return data as AreaRow;
  }

  async function loadTable(tableId: string): Promise<TableRow> {
    const { data, error } = await getClient()
      .from("restaurant_tables")
      .select(TABLE_SELECT)
      .eq("id", tableId)
      .maybeSingle();
    if (error) throw new ApiError(500, "TABLE_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "TABLE_NOT_FOUND", "Restaurant table not found.");
    return data as TableRow;
  }

  async function combinationWithMembers(combinationId: string): Promise<TableCombinationRecord> {
    const supabase = getClient();
    const { data: combo, error } = await supabase
      .from("table_combinations")
      .select("*")
      .eq("id", combinationId)
      .maybeSingle();
    if (error) throw new ApiError(500, "COMBINATION_LOOKUP_FAILED", error.message);
    if (!combo) throw new ApiError(404, "COMBINATION_NOT_FOUND", "Table combination not found.");

    const { data: members, error: mErr } = await supabase
      .from("table_combination_members")
      .select("table_id, sort_order")
      .eq("combination_id", combinationId)
      .order("sort_order", { ascending: true });
    if (mErr) throw new ApiError(500, "COMBINATION_LOOKUP_FAILED", mErr.message);

    const tableIds = (members ?? []).map((m) => m.table_id as string);
    let derivedCapacity = 0;
    if (tableIds.length > 0) {
      const { data: tables } = await supabase
        .from("restaurant_tables")
        .select("id, capacity, capacity_max, capacity_min")
        .in("id", tableIds);
      derivedCapacity = (tables ?? []).reduce(
        (sum, t) =>
          sum + ((t.capacity_max as number | null) ?? (t.capacity as number | null) ?? (t.capacity_min as number) ?? 0),
        0,
      );
    }

    return {
      id: combo.id as string,
      branchId: combo.branch_id as string,
      code: combo.code as string,
      displayName: combo.display_name as string,
      minPartySize: combo.min_party_size as number,
      maxPartySize: combo.max_party_size as number | null,
      isActive: combo.is_active as boolean,
      tableIds,
      derivedCapacity,
    };
  }

  return {
    async getConfiguration(scope, branchId) {
      assertBranchInScope(scope, branchId);
      const supabase = getClient();
      const [floorsRes, areasRes, tablesRes] = await Promise.all([
        supabase
          .from("restaurant_floors")
          .select("*")
          .eq("branch_id", branchId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("service_areas")
          .select("*")
          .eq("branch_id", branchId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("restaurant_tables")
          .select(TABLE_SELECT)
          .eq("branch_id", branchId)
          .order("table_number", { ascending: true }),
      ]);
      if (floorsRes.error) throw new ApiError(500, "FLOOR_LIST_FAILED", floorsRes.error.message);
      if (areasRes.error) throw new ApiError(500, "AREA_LIST_FAILED", areasRes.error.message);
      if (tablesRes.error) throw new ApiError(500, "TABLE_LIST_FAILED", tablesRes.error.message);
      return {
        floors: ((floorsRes.data ?? []) as FloorRow[]).map(toFloor),
        areas: ((areasRes.data ?? []) as AreaRow[]).map(toArea),
        tables: ((tablesRes.data ?? []) as TableRow[]).map(toTable),
      };
    },

    async createFloor(scope, input) {
      assertBranchInScope(scope, input.branchId);
      const { data, error } = await getClient()
        .from("restaurant_floors")
        .insert({
          branch_id: input.branchId,
          code: input.code.trim().toLowerCase(),
          display_name: input.displayName.trim(),
          description: input.description?.trim() || null,
          sort_order: input.sortOrder ?? 0,
          created_by: scope.userId,
          updated_by: scope.userId,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "FLOOR_CONFLICT", "A floor with this code already exists for the branch.");
        }
        throw new ApiError(500, "FLOOR_CREATE_FAILED", error.message);
      }
      const floor = toFloor(data as FloorRow);
      await writeAudit(getClient(), {
        branchId: floor.branchId,
        actorUserId: scope.userId,
        resourceType: "floor",
        resourceId: floor.id,
        action: "floor_created",
        after: { code: floor.code, displayName: floor.displayName },
      });
      return floor;
    },

    async updateFloor(scope, floorId, patch) {
      const existing = await loadFloor(floorId);
      assertBranchInScope(scope, existing.branch_id);
      const update: Record<string, unknown> = { updated_by: scope.userId };
      if (patch.displayName !== undefined) update.display_name = patch.displayName.trim();
      if (patch.description !== undefined) update.description = patch.description?.trim() || null;
      if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
      if (patch.isActive !== undefined) update.is_active = patch.isActive;
      const { data, error } = await getClient()
        .from("restaurant_floors")
        .update(update)
        .eq("id", floorId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "FLOOR_UPDATE_FAILED", error.message);
      await writeAudit(getClient(), {
        branchId: existing.branch_id,
        actorUserId: scope.userId,
        resourceType: "floor",
        resourceId: floorId,
        action: "floor_updated",
        before: { displayName: existing.display_name, isActive: existing.is_active, sortOrder: existing.sort_order },
        after: patch,
      });
      return toFloor(data as FloorRow);
    },

    async createArea(scope, input) {
      assertBranchInScope(scope, input.branchId);
      const floor = await loadFloor(input.floorId);
      if (floor.branch_id !== input.branchId) {
        throw new ApiError(409, "AREA_BRANCH_MISMATCH", "Floor belongs to another branch.");
      }
      const { data, error } = await getClient()
        .from("service_areas")
        .insert({
          branch_id: input.branchId,
          floor_id: input.floorId,
          code: input.code.trim().toLowerCase(),
          display_name: input.displayName.trim(),
          description: input.description?.trim() || null,
          sort_order: input.sortOrder ?? 0,
          color_token: input.colorToken ?? null,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "AREA_CONFLICT", "An area with this code already exists for the branch.");
        }
        throw new ApiError(500, "AREA_CREATE_FAILED", error.message);
      }
      const area = toArea(data as AreaRow);
      await writeAudit(getClient(), {
        branchId: area.branchId,
        actorUserId: scope.userId,
        resourceType: "service_area",
        resourceId: area.id,
        action: "area_created",
        after: { code: area.code, displayName: area.displayName },
      });
      return area;
    },

    async updateArea(scope, areaId, patch) {
      const existing = await loadArea(areaId);
      assertBranchInScope(scope, existing.branch_id);
      const update: Record<string, unknown> = {};
      if (patch.displayName !== undefined) update.display_name = patch.displayName.trim();
      if (patch.description !== undefined) update.description = patch.description?.trim() || null;
      if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
      if (patch.colorToken !== undefined) update.color_token = patch.colorToken;
      if (patch.isActive !== undefined) update.is_active = patch.isActive;
      const { data, error } = await getClient()
        .from("service_areas")
        .update(update)
        .eq("id", areaId)
        .select("*")
        .single();
      if (error) throw new ApiError(500, "AREA_UPDATE_FAILED", error.message);
      await writeAudit(getClient(), {
        branchId: existing.branch_id,
        actorUserId: scope.userId,
        resourceType: "service_area",
        resourceId: areaId,
        action: "area_updated",
        after: patch,
      });
      return toArea(data as AreaRow);
    },

    async updateTableLayout(scope, tableId, patch, actorUserId) {
      const existing = await loadTable(tableId);
      assertBranchInScope(scope, existing.branch_id);

      if (patch.floorId) {
        const floor = await loadFloor(patch.floorId);
        if (floor.branch_id !== existing.branch_id) {
          throw new ApiError(409, "TABLE_BRANCH_MISMATCH", "Floor belongs to another branch.");
        }
      }
      if (patch.serviceAreaId) {
        const area = await loadArea(patch.serviceAreaId);
        if (area.branch_id !== existing.branch_id) {
          throw new ApiError(409, "TABLE_BRANCH_MISMATCH", "Service area belongs to another branch.");
        }
      }

      const capacityMin = patch.capacityMin ?? existing.capacity_min;
      const capacityMax =
        patch.capacityMax === undefined ? (existing.capacity_max ?? existing.capacity) : patch.capacityMax;
      if (capacityMin <= 0 || (capacityMax !== null && capacityMax < capacityMin)) {
        throw new ApiError(422, "VALIDATION_ERROR", "capacityMax must be >= capacityMin (> 0).");
      }

      const update: Record<string, unknown> = {};
      if (patch.displayName !== undefined) update.display_name = patch.displayName?.trim() || null;
      if (patch.floorId !== undefined) update.floor_id = patch.floorId;
      if (patch.serviceAreaId !== undefined) update.service_area_id = patch.serviceAreaId;
      if (patch.capacityMin !== undefined) update.capacity_min = patch.capacityMin;
      if (patch.capacityMax !== undefined) update.capacity_max = patch.capacityMax;
      if (patch.shape !== undefined) update.shape = patch.shape;
      if (patch.positionX !== undefined) update.position_x = patch.positionX;
      if (patch.positionY !== undefined) update.position_y = patch.positionY;
      if (patch.width !== undefined) update.width = patch.width;
      if (patch.height !== undefined) update.height = patch.height;
      if (patch.rotation !== undefined) update.rotation = patch.rotation;
      if (patch.isAccessible !== undefined) update.is_accessible = patch.isAccessible;
      if (patch.highChairSupported !== undefined) update.high_chair_supported = patch.highChairSupported;
      if (patch.isActive !== undefined) update.is_active = patch.isActive;

      const { data, error } = await getClient()
        .from("restaurant_tables")
        .update(update)
        .eq("id", tableId)
        .select(TABLE_SELECT)
        .single();
      if (error) throw new ApiError(500, "TABLE_UPDATE_FAILED", error.message);
      await writeAudit(getClient(), {
        branchId: existing.branch_id,
        actorUserId,
        resourceType: "table",
        resourceId: tableId,
        action: "table_layout_updated",
        after: patch,
      });
      return toTable(data as TableRow);
    },

    async transitionTableStatus(scope, tableId, toStatus, actorUserId, note) {
      const existing = await loadTable(tableId);
      assertBranchInScope(scope, existing.branch_id);

      const from = existing.operational_status;
      const allowed = DIRECT_TRANSITIONS[from] ?? [];
      if (!allowed.includes(toStatus)) {
        throw new ApiError(
          409,
          "TABLE_TRANSITION_INVALID",
          `Table cannot move from ${from} to ${toStatus} directly.`,
        );
      }

      // Blocking / decommissioning a table with a live dining session is not allowed.
      if (["blocked", "out_of_service"].includes(toStatus)) {
        const { data: active } = await getClient()
          .from("dining_session_tables")
          .select("id")
          .eq("table_id", tableId)
          .is("released_at", null)
          .limit(1);
        if ((active ?? []).length > 0) {
          throw new ApiError(409, "TABLE_HAS_ACTIVE_SESSION", "Table has an active dining session.");
        }
      }

      const { data, error } = await getClient()
        .from("restaurant_tables")
        .update({
          operational_status: toStatus,
          status: legacyStatusFor(toStatus),
        })
        .eq("id", tableId)
        .eq("operational_status", from)
        .select(TABLE_SELECT)
        .maybeSingle();
      if (error) throw new ApiError(500, "TABLE_TRANSITION_FAILED", error.message);
      if (!data) {
        throw new ApiError(409, "TABLE_TRANSITION_CONFLICT", "Table status changed concurrently. Retry.");
      }
      await writeAudit(getClient(), {
        branchId: existing.branch_id,
        actorUserId,
        resourceType: "table",
        resourceId: tableId,
        action: "table_status_transition",
        before: { operationalStatus: from },
        after: { operationalStatus: toStatus },
        note: note ?? null,
      });
      return toTable(data as TableRow);
    },

    async listCombinations(scope, branchId) {
      assertBranchInScope(scope, branchId);
      const { data, error } = await getClient()
        .from("table_combinations")
        .select("id")
        .eq("branch_id", branchId)
        .order("code", { ascending: true });
      if (error) throw new ApiError(500, "COMBINATION_LIST_FAILED", error.message);
      return Promise.all(((data ?? []) as { id: string }[]).map((row) => combinationWithMembers(row.id)));
    },

    async createCombination(scope, input) {
      assertBranchInScope(scope, input.branchId);
      const uniqueIds = [...new Set(input.tableIds)];
      if (uniqueIds.length < 2) {
        throw new ApiError(422, "VALIDATION_ERROR", "A combination requires at least two distinct tables.");
      }
      if (uniqueIds.length !== input.tableIds.length) {
        throw new ApiError(422, "VALIDATION_ERROR", "A table cannot appear twice in one combination.");
      }
      const supabase = getClient();
      const { data: tables, error: tErr } = await supabase
        .from("restaurant_tables")
        .select("id, branch_id")
        .in("id", uniqueIds);
      if (tErr) throw new ApiError(500, "COMBINATION_CREATE_FAILED", tErr.message);
      if ((tables ?? []).length !== uniqueIds.length) {
        throw new ApiError(404, "TABLE_NOT_FOUND", "One or more tables were not found.");
      }
      if ((tables ?? []).some((t) => t.branch_id !== input.branchId)) {
        throw new ApiError(409, "TABLE_BRANCH_MISMATCH", "All combination tables must belong to the branch.");
      }

      const { data: combo, error } = await supabase
        .from("table_combinations")
        .insert({
          branch_id: input.branchId,
          code: input.code.trim().toLowerCase(),
          display_name: input.displayName.trim(),
          min_party_size: input.minPartySize ?? 1,
          max_party_size: input.maxPartySize ?? null,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "COMBINATION_CONFLICT", "A combination with this code already exists.");
        }
        throw new ApiError(500, "COMBINATION_CREATE_FAILED", error.message);
      }

      const members = uniqueIds.map((tableId, index) => ({
        combination_id: combo.id as string,
        table_id: tableId,
        sort_order: index,
      }));
      const { error: mErr } = await supabase.from("table_combination_members").insert(members);
      if (mErr) {
        // Keep configuration consistent — remove the header row if members fail.
        await supabase.from("table_combinations").delete().eq("id", combo.id as string);
        throw new ApiError(500, "COMBINATION_CREATE_FAILED", mErr.message);
      }
      await writeAudit(supabase, {
        branchId: input.branchId,
        actorUserId: scope.userId,
        resourceType: "table_combination",
        resourceId: combo.id as string,
        action: "combination_created",
        after: { code: input.code, tableIds: uniqueIds },
      });
      return combinationWithMembers(combo.id as string);
    },

    async updateCombination(scope, combinationId, patch) {
      const existing = await combinationWithMembers(combinationId);
      assertBranchInScope(scope, existing.branchId);
      const supabase = getClient();

      const update: Record<string, unknown> = {};
      if (patch.displayName !== undefined) update.display_name = patch.displayName.trim();
      if (patch.minPartySize !== undefined) update.min_party_size = patch.minPartySize;
      if (patch.maxPartySize !== undefined) update.max_party_size = patch.maxPartySize;
      if (patch.isActive !== undefined) update.is_active = patch.isActive;
      if (Object.keys(update).length > 0) {
        const { error } = await supabase.from("table_combinations").update(update).eq("id", combinationId);
        if (error) throw new ApiError(500, "COMBINATION_UPDATE_FAILED", error.message);
      }

      if (patch.tableIds) {
        const uniqueIds = [...new Set(patch.tableIds)];
        if (uniqueIds.length < 2 || uniqueIds.length !== patch.tableIds.length) {
          throw new ApiError(422, "VALIDATION_ERROR", "Combination requires >= 2 distinct tables.");
        }
        const { data: tables, error: tErr } = await supabase
          .from("restaurant_tables")
          .select("id, branch_id")
          .in("id", uniqueIds);
        if (tErr) throw new ApiError(500, "COMBINATION_UPDATE_FAILED", tErr.message);
        if ((tables ?? []).length !== uniqueIds.length) {
          throw new ApiError(404, "TABLE_NOT_FOUND", "One or more tables were not found.");
        }
        if ((tables ?? []).some((t) => t.branch_id !== existing.branchId)) {
          throw new ApiError(409, "TABLE_BRANCH_MISMATCH", "All combination tables must belong to the branch.");
        }
        await supabase.from("table_combination_members").delete().eq("combination_id", combinationId);
        const { error: mErr } = await supabase.from("table_combination_members").insert(
          uniqueIds.map((tableId, index) => ({
            combination_id: combinationId,
            table_id: tableId,
            sort_order: index,
          })),
        );
        if (mErr) throw new ApiError(500, "COMBINATION_UPDATE_FAILED", mErr.message);
      }

      await writeAudit(supabase, {
        branchId: existing.branchId,
        actorUserId: scope.userId,
        resourceType: "table_combination",
        resourceId: combinationId,
        action: "combination_updated",
        before: { tableIds: existing.tableIds, isActive: existing.isActive },
        after: patch,
      });
      return combinationWithMembers(combinationId);
    },
  };
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const INVENTORY_ITEM_STATUSES = ["active", "inactive", "discontinued"] as const;
export type InventoryItemStatus = (typeof INVENTORY_ITEM_STATUSES)[number];

export const STOCK_MOVEMENT_TYPES = [
  "receipt",
  "adjustment",
  "transfer_in",
  "transfer_out",
  "waste",
  "sale_consumption",
  "purchase",
  "sale",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export interface InventoryItemRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  costPrice: number | null;
  status: InventoryItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementRecord {
  id: string;
  inventoryItemId: string;
  branchId: string;
  movementType: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  itemName: string | null;
  itemSku: string | null;
}

export interface CreateInventoryItemInput {
  branchId: string;
  sku: string;
  name: string;
  category?: string | null;
  unit?: string;
  currentStock?: number;
  minimumStock?: number;
  reorderLevel?: number;
  costPrice?: number | null;
  status?: InventoryItemStatus;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string | null;
  unit?: string;
  minimumStock?: number;
  reorderLevel?: number;
  costPrice?: number | null;
  status?: InventoryItemStatus;
}

export interface CreateStockAdjustmentInput {
  inventoryItemId: string;
  quantityDelta: number;
  reason?: string | null;
  movementType?: Extract<StockMovementType, "adjustment" | "receipt" | "waste" | "purchase">;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface InventoryService {
  listItems(scope: BranchActorScope, branchId?: string): Promise<InventoryItemRecord[]>;
  createItem(scope: BranchActorScope, input: CreateInventoryItemInput): Promise<InventoryItemRecord>;
  updateItem(scope: BranchActorScope, id: string, input: UpdateInventoryItemInput): Promise<InventoryItemRecord>;
  createAdjustment(
    scope: BranchActorScope,
    actorUserId: string | null,
    input: CreateStockAdjustmentInput,
  ): Promise<{ item: InventoryItemRecord; movement: StockMovementRecord }>;
  listMovements(
    scope: BranchActorScope,
    opts?: { branchId?: string; inventoryItemId?: string; limit?: number },
  ): Promise<StockMovementRecord[]>;
}

type ItemRow = {
  id: string;
  branch_id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number | string;
  minimum_stock: number | string;
  reorder_level: number | string;
  cost_price: number | string | null;
  status: string;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
};

type MovementRow = {
  id: string;
  inventory_item_id: string;
  branch_id: string;
  movement_type: string;
  quantity: number | string;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  item: { id: string; name: string; sku: string } | null;
};

const ITEM_SELECT =
  "id, branch_id, sku, name, category, unit, current_stock, minimum_stock, reorder_level, cost_price, status, created_at, updated_at, branch:branches(id, branch_code, name)";

const MOVEMENT_SELECT =
  "id, inventory_item_id, branch_id, movement_type, quantity, reference_type, reference_id, reason, created_by, created_at, item:inventory_items(id, name, sku)";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapItem(row: ItemRow): InventoryItemRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    sku: row.sku,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentStock: asNumber(row.current_stock) ?? 0,
    minimumStock: asNumber(row.minimum_stock) ?? 0,
    reorderLevel: asNumber(row.reorder_level) ?? 0,
    costPrice: asNumber(row.cost_price),
    status: row.status as InventoryItemStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMovement(row: MovementRow): StockMovementRecord {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    branchId: row.branch_id,
    movementType: row.movement_type as StockMovementType,
    quantity: asNumber(row.quantity) ?? 0,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    itemName: row.item?.name ?? null,
    itemSku: row.item?.sku ?? null,
  };
}

function resolveListBranchIds(scope: BranchActorScope, branchId?: string): string[] | "all" | "none" {
  if (branchId) {
    assertBranchMembership(scope, branchId);
    return [branchId];
  }
  if (scope.isSuperAdmin) return "all";
  if (scope.branchIds.length === 0) return "none";
  return scope.branchIds;
}

export function createInventoryService(envStatus: EnvironmentStatus): InventoryService {
  const supabase = () => createServiceClient(envStatus);

  async function fetchItem(client: SupabaseClient, id: string): Promise<InventoryItemRecord> {
    const { data, error } = await client.from("inventory_items").select(ITEM_SELECT).eq("id", id).maybeSingle();
    if (error) throwMappedDbError("INVENTORY_ITEM_READ_FAILED", error);
    if (!data) throw new ApiError(404, "INVENTORY_ITEM_NOT_FOUND", "Inventory item not found.");
    return mapItem(data as unknown as ItemRow);
  }

  return {
    async listItems(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      let query = client.from("inventory_items").select(ITEM_SELECT).order("name", { ascending: true });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);

      const { data, error } = await query;
      if (error) throwMappedDbError("INVENTORY_ITEMS_READ_FAILED", error);
      return ((data ?? []) as unknown as ItemRow[]).map(mapItem);
    },

    async createItem(scope, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const sku = input.sku.trim().toUpperCase();
      const name = input.name.trim();
      if (!sku) throw new ApiError(400, "VALIDATION_ERROR", "SKU is required.");
      if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Name is required.");

      const currentStock = input.currentStock ?? 0;
      if (currentStock < 0) throw new ApiError(400, "VALIDATION_ERROR", "currentStock cannot be negative.");

      const { data, error } = await client
        .from("inventory_items")
        .insert({
          branch_id: input.branchId,
          sku,
          name,
          category: input.category?.trim() || null,
          unit: (input.unit ?? "unit").trim() || "unit",
          current_stock: currentStock,
          minimum_stock: input.minimumStock ?? 0,
          reorder_level: input.reorderLevel ?? 0,
          cost_price: input.costPrice ?? null,
          status: input.status ?? "active",
        })
        .select(ITEM_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "INVENTORY_SKU_EXISTS", "An item with this SKU already exists for the branch.");
        }
        throwMappedDbError("INVENTORY_ITEM_CREATE_FAILED", error);
      }

      const item = mapItem(data as unknown as ItemRow);

      if (currentStock > 0) {
        await client.from("stock_movements").insert({
          inventory_item_id: item.id,
          branch_id: item.branchId,
          movement_type: "receipt",
          quantity: currentStock,
          reason: "Opening stock on item create",
          created_by: scope.userId,
        });
      }

      return item;
    },

    async updateItem(scope, id, input) {
      const client = supabase();
      const existing = await fetchItem(client, id);
      assertBranchMembership(scope, existing.branchId);

      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Name is required.");
        patch.name = name;
      }
      if (input.category !== undefined) patch.category = input.category?.trim() || null;
      if (input.unit !== undefined) patch.unit = input.unit.trim() || "unit";
      if (input.minimumStock !== undefined) {
        if (input.minimumStock < 0) throw new ApiError(400, "VALIDATION_ERROR", "minimumStock cannot be negative.");
        patch.minimum_stock = input.minimumStock;
      }
      if (input.reorderLevel !== undefined) {
        if (input.reorderLevel < 0) throw new ApiError(400, "VALIDATION_ERROR", "reorderLevel cannot be negative.");
        patch.reorder_level = input.reorderLevel;
      }
      if (input.costPrice !== undefined) patch.cost_price = input.costPrice;
      if (input.status !== undefined) patch.status = input.status;

      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "At least one field is required.");
      }

      const { data, error } = await client
        .from("inventory_items")
        .update(patch)
        .eq("id", id)
        .select(ITEM_SELECT)
        .single();
      if (error) throwMappedDbError("INVENTORY_ITEM_UPDATE_FAILED", error);
      return mapItem(data as unknown as ItemRow);
    },

    async createAdjustment(scope, actorUserId, input) {
      if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "quantityDelta must be a non-zero number.");
      }

      const client = supabase();
      // Branch gate before atomic write — membership must not rely on the RPC.
      const existing = await fetchItem(client, input.inventoryItemId);
      assertBranchMembership(scope, existing.branchId);

      const movementType = input.movementType ?? "adjustment";
      const { data, error } = await client.rpc("adjust_inventory_stock_atomic", {
        p_inventory_item_id: input.inventoryItemId,
        p_quantity_delta: input.quantityDelta,
        p_movement_type: movementType,
        p_reason: input.reason?.trim() || null,
        p_actor_user_id: actorUserId,
        p_reference_type: input.referenceType?.trim() || null,
        p_reference_id: input.referenceId || null,
      });

      if (error) {
        const message = error.message ?? "Atomic stock adjustment failed.";
        if (/QUANTITY_DELTA_INVALID/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "quantityDelta must be a non-zero number.");
        }
        if (/INVENTORY_ITEM_NOT_FOUND/i.test(message)) {
          throw new ApiError(404, "INVENTORY_ITEM_NOT_FOUND", "Inventory item not found.");
        }
        if (/INSUFFICIENT_STOCK/i.test(message)) {
          throw new ApiError(409, "INSUFFICIENT_STOCK", "Adjustment would drive stock below zero.");
        }
        if (/MOVEMENT_TYPE_INVALID/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid movement type.");
        }
        // Any RPC failure rolls back both movement insert and stock update.
        throw new ApiError(500, "STOCK_ADJUSTMENT_FAILED", message);
      }

      const payload = data as {
        item?: {
          id: string;
          branchId: string;
          sku: string;
          name: string;
          category: string | null;
          unit: string;
          currentStock: number;
          minimumStock: number;
          reorderLevel: number;
          costPrice: number | null;
          status: string;
          createdAt: string;
          updatedAt: string;
        };
        movement?: {
          id: string;
          inventoryItemId: string;
          branchId: string;
          movementType: string;
          quantity: number;
          referenceType: string | null;
          referenceId: string | null;
          reason: string | null;
          createdBy: string | null;
          itemName: string | null;
          itemSku: string | null;
          createdAt?: string;
        };
      } | null;

      if (!payload?.item || !payload.movement) {
        throw new ApiError(500, "STOCK_ADJUSTMENT_FAILED", "Atomic adjustment returned no payload.");
      }

      return {
        item: {
          id: payload.item.id,
          branchId: payload.item.branchId,
          branchCode: existing.branchCode,
          branchName: existing.branchName,
          sku: payload.item.sku,
          name: payload.item.name,
          category: payload.item.category,
          unit: payload.item.unit,
          currentStock: Number(payload.item.currentStock),
          minimumStock: Number(payload.item.minimumStock),
          reorderLevel: Number(payload.item.reorderLevel),
          costPrice: payload.item.costPrice == null ? null : Number(payload.item.costPrice),
          status: payload.item.status as InventoryItemStatus,
          createdAt: payload.item.createdAt,
          updatedAt: payload.item.updatedAt,
        },
        movement: {
          id: payload.movement.id,
          inventoryItemId: payload.movement.inventoryItemId,
          branchId: payload.movement.branchId,
          movementType: payload.movement.movementType as StockMovementType,
          quantity: Number(payload.movement.quantity),
          referenceType: payload.movement.referenceType,
          referenceId: payload.movement.referenceId,
          reason: payload.movement.reason,
          createdBy: payload.movement.createdBy,
          createdAt: payload.movement.createdAt ?? new Date().toISOString(),
          itemName: payload.movement.itemName,
          itemSku: payload.movement.itemSku,
        },
      };
    },

    async listMovements(scope, opts = {}) {
      const branchScope = resolveListBranchIds(scope, opts.branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
      let query = client
        .from("stock_movements")
        .select(MOVEMENT_SELECT)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (branchScope !== "all") query = query.in("branch_id", branchScope);
      if (opts.inventoryItemId) query = query.eq("inventory_item_id", opts.inventoryItemId);

      const { data, error } = await query;
      if (error) throwMappedDbError("STOCK_MOVEMENTS_READ_FAILED", error);
      return ((data ?? []) as unknown as MovementRow[]).map(mapMovement);
    },
  };
}

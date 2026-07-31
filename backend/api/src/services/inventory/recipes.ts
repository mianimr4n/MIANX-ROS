/**
 * RC4-9 inventory recipes — CRUD, activate/sync BOM, costing honesty.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";
import { effectiveIngredientQuantity, resolveUnit } from "./units.js";

export const RECIPE_STATUSES = ["draft", "active", "inactive"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export type CostAvailability = "LIVE" | "DERIVED" | "UNAVAILABLE" | "DEFERRED";

export interface RecipeLineInput {
  inventoryItemId: string;
  quantity: number;
  unit: string;
  wasteFactor?: number;
  sortOrder?: number;
}

export interface RecipeLineRecord extends RecipeLineInput {
  id: string;
  itemSku: string | null;
  itemName: string | null;
  itemUnit: string | null;
  itemCostPrice: number | null;
  itemStatus: string | null;
  convertedQuantity: number | null;
  lineCost: number | null;
  lineCostState: CostAvailability;
}

export interface RecipeRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  menuItemId: string;
  menuItemName: string | null;
  name: string;
  version: number;
  status: RecipeStatus;
  yieldFactor: number;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: RecipeLineRecord[];
  estimatedCost: number | null;
  estimatedCostState: CostAvailability;
  estimatedCostSource: string;
  estimatedCostAsOf: string | null;
  estimatedCostFormula: string;
}

export interface CreateRecipeInput {
  branchId: string;
  menuItemId: string;
  name: string;
  yieldFactor?: number;
  notes?: string | null;
  lines: RecipeLineInput[];
}

export interface UpdateRecipeInput {
  name?: string;
  yieldFactor?: number;
  notes?: string | null;
  lines?: RecipeLineInput[];
}

export interface InventoryRecipeService {
  listRecipes(
    scope: BranchActorScope,
    opts?: { branchId?: string; menuItemId?: string; status?: RecipeStatus },
  ): Promise<RecipeRecord[]>;
  getRecipe(scope: BranchActorScope, id: string): Promise<RecipeRecord>;
  createRecipe(
    scope: BranchActorScope,
    actorUserId: string,
    input: CreateRecipeInput,
    requestId?: string | null,
  ): Promise<RecipeRecord>;
  updateRecipe(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    input: UpdateRecipeInput,
    requestId?: string | null,
  ): Promise<RecipeRecord>;
  activateRecipe(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    requestId?: string | null,
  ): Promise<RecipeRecord>;
  deactivateRecipe(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    requestId?: string | null,
  ): Promise<RecipeRecord>;
  duplicateRecipe(
    scope: BranchActorScope,
    actorUserId: string,
    id: string,
    requestId?: string | null,
  ): Promise<RecipeRecord>;
  listMissingRecipeMenuItems(
    scope: BranchActorScope,
    branchId: string,
    menuItemIds: string[],
  ): Promise<string[]>;
}

type RecipeRow = {
  id: string;
  branch_id: string;
  menu_item_id: string;
  name: string;
  version: number;
  status: string;
  yield_factor: number | string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  activated_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
  branch?: { branch_code: string; name: string } | null;
  menu_item?: { name: string } | null;
};

type LineRow = {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number | string;
  unit: string;
  waste_factor: number | string;
  sort_order: number;
  inventory_item?: {
    sku: string;
    name: string;
    unit: string;
    cost_price: number | string | null;
    status: string;
  } | null;
};

const RECIPE_SELECT =
  "id, branch_id, menu_item_id, name, version, status, yield_factor, notes, created_by, updated_by, activated_at, deactivated_at, created_at, updated_at, branch:branches(branch_code, name), menu_item:menu_items(name)";

const LINE_SELECT =
  "id, recipe_id, inventory_item_id, quantity, unit, waste_factor, sort_order, inventory_item:inventory_items(sku, name, unit, cost_price, status)";

function clientFrom(envStatus: EnvironmentStatus): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = envStatus.config;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function num(v: number | string | null | undefined): number {
  return Number(v ?? 0);
}

function mapLines(rows: LineRow[], yieldFactor: number): RecipeLineRecord[] {
  return rows.map((row) => {
    const qty = num(row.quantity);
    const waste = num(row.waste_factor);
    const item = row.inventory_item;
    let converted: number | null = null;
    let lineCost: number | null = null;
    let lineCostState: CostAvailability = "UNAVAILABLE";
    try {
      if (item?.unit) {
        converted = effectiveIngredientQuantity({
          quantity: qty,
          recipeUnit: row.unit,
          inventoryUnit: item.unit,
          wasteFactor: waste,
          yieldFactor,
        });
        if (item.cost_price != null) {
          lineCost = converted * num(item.cost_price);
          lineCostState = "DERIVED";
        }
      }
    } catch {
      converted = null;
      lineCostState = "UNAVAILABLE";
    }
    return {
      id: row.id,
      inventoryItemId: row.inventory_item_id,
      quantity: qty,
      unit: row.unit,
      wasteFactor: waste,
      sortOrder: row.sort_order,
      itemSku: item?.sku ?? null,
      itemName: item?.name ?? null,
      itemUnit: item?.unit ?? null,
      itemCostPrice: item?.cost_price == null ? null : num(item.cost_price),
      itemStatus: item?.status ?? null,
      convertedQuantity: converted,
      lineCost,
      lineCostState,
    };
  });
}

function mapRecipe(row: RecipeRow, lines: RecipeLineRecord[]): RecipeRecord {
  const yieldFactor = num(row.yield_factor);
  let estimatedCost: number | null = 0;
  let unavailable = false;
  let any = false;
  for (const line of lines) {
    any = true;
    if (line.lineCostState !== "DERIVED" || line.lineCost == null) {
      unavailable = true;
      break;
    }
    estimatedCost += line.lineCost;
  }
  if (!any || unavailable) {
    estimatedCost = null;
  }
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item?.name ?? null,
    name: row.name,
    version: row.version,
    status: row.status as RecipeStatus,
    yieldFactor,
    notes: row.notes,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    activatedAt: row.activated_at,
    deactivatedAt: row.deactivated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lines,
    estimatedCost,
    estimatedCostState: estimatedCost == null ? "UNAVAILABLE" : "DERIVED",
    estimatedCostSource: "inventory_items.cost_price (last purchase / standard cost field)",
    estimatedCostAsOf: estimatedCost == null ? null : new Date().toISOString(),
    estimatedCostFormula:
      "sum(convert(quantity * waste_factor / yield_factor → inventory.unit) × cost_price)",
  };
}

async function loadLines(client: SupabaseClient, recipeId: string): Promise<LineRow[]> {
  const { data, error } = await client
    .from("inventory_recipe_lines")
    .select(LINE_SELECT)
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });
  if (error) throwMappedDbError("RECIPE_LINES_READ_FAILED", error);
  return (data ?? []) as unknown as LineRow[];
}

async function loadRecipeRecord(client: SupabaseClient, id: string): Promise<RecipeRecord> {
  const { data, error } = await client.from("inventory_recipes").select(RECIPE_SELECT).eq("id", id).maybeSingle();
  if (error) throwMappedDbError("RECIPE_READ_FAILED", error);
  if (!data) throw new ApiError(404, "RECIPE_NOT_FOUND", "Recipe not found.");
  const row = data as unknown as RecipeRow;
  const lines = mapLines(await loadLines(client, id), num(row.yield_factor));
  return mapRecipe(row, lines);
}

async function writeAudit(
  client: SupabaseClient,
  input: {
    recipeId: string | null;
    branchId: string | null;
    action: string;
    actorUserId: string | null;
    requestId?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await client.from("inventory_recipe_audit_events").insert({
    recipe_id: input.recipeId,
    branch_id: input.branchId,
    action: input.action,
    actor_user_id: input.actorUserId,
    request_id: input.requestId ?? null,
    before_state: input.before ?? null,
    after_state: input.after ?? null,
  });
}

function validateLines(lines: RecipeLineInput[]): void {
  if (!lines.length) {
    throw new ApiError(400, "VALIDATION_ERROR", "Recipe requires at least one ingredient line.");
  }
  const seen = new Set<string>();
  for (const line of lines) {
    if (!(line.quantity > 0)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Ingredient quantity must be > 0.");
    }
    try {
      resolveUnit(line.unit);
    } catch (err) {
      throw new ApiError(400, "UNSUPPORTED_UNIT", err instanceof Error ? err.message : "Unsupported unit.");
    }
    if (seen.has(line.inventoryItemId)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Duplicate inventory item in recipe lines.");
    }
    seen.add(line.inventoryItemId);
  }
}

async function replaceLines(
  client: SupabaseClient,
  recipeId: string,
  branchId: string,
  yieldFactor: number,
  lines: RecipeLineInput[],
): Promise<void> {
  validateLines(lines);

  const itemIds = lines.map((l) => l.inventoryItemId);
  const { data: items, error } = await client
    .from("inventory_items")
    .select("id, branch_id, unit, status")
    .in("id", itemIds);
  if (error) throwMappedDbError("INVENTORY_ITEMS_READ_FAILED", error);
  const byId = new Map((items ?? []).map((i) => [String(i.id), i as { id: string; branch_id: string; unit: string; status: string }]));

  for (const line of lines) {
    const item = byId.get(line.inventoryItemId);
    if (!item) throw new ApiError(404, "INVENTORY_ITEM_NOT_FOUND", "Ingredient not found.");
    if (item.branch_id !== branchId) {
      throw new ApiError(400, "BRANCH_MISMATCH", "Ingredient must belong to the recipe branch.");
    }
    try {
      effectiveIngredientQuantity({
        quantity: line.quantity,
        recipeUnit: line.unit,
        inventoryUnit: item.unit,
        wasteFactor: line.wasteFactor ?? 1,
        yieldFactor,
      });
    } catch (err) {
      throw new ApiError(
        400,
        "INCOMPATIBLE_UNITS",
        err instanceof Error ? err.message : "Unit conversion failed.",
      );
    }
  }

  const { error: delError } = await client.from("inventory_recipe_lines").delete().eq("recipe_id", recipeId);
  if (delError) throwMappedDbError("RECIPE_LINES_DELETE_FAILED", delError);

  const { error: insError } = await client.from("inventory_recipe_lines").insert(
    lines.map((line, idx) => ({
      recipe_id: recipeId,
      inventory_item_id: line.inventoryItemId,
      quantity: line.quantity,
      unit: line.unit.trim().toLowerCase(),
      waste_factor: line.wasteFactor ?? 1,
      sort_order: line.sortOrder ?? idx,
    })),
  );
  if (insError) throwMappedDbError("RECIPE_LINES_CREATE_FAILED", insError);
}

/** Sync active recipe into legacy BOM table used by kitchen_ticket_set_preparing_atomic. */
async function syncActiveBom(
  client: SupabaseClient,
  recipe: RecipeRecord,
): Promise<void> {
  // Only clear BOM rows whose inventory items belong to this branch.
  const { data: existing, error: existError } = await client
    .from("menu_item_inventory_components")
    .select("id, inventory_item_id, inventory_items!inner(branch_id)")
    .eq("menu_item_id", recipe.menuItemId)
    .eq("inventory_items.branch_id", recipe.branchId);
  if (existError) throwMappedDbError("BOM_SYNC_READ_FAILED", existError);
  const existingIds = (existing ?? []).map((r) => String(r.id));
  if (existingIds.length > 0) {
    const { error: delError } = await client
      .from("menu_item_inventory_components")
      .delete()
      .in("id", existingIds);
    if (delError) throwMappedDbError("BOM_SYNC_DELETE_FAILED", delError);
  }

  if (recipe.status !== "active" || recipe.lines.length === 0) return;

  const rows = [];
  for (const line of recipe.lines) {
    if (!line.itemUnit || line.convertedQuantity == null) {
      throw new ApiError(400, "INCOMPLETE_RECIPE", "Cannot activate recipe with unconvertible units.");
    }
    if (line.itemStatus && line.itemStatus !== "active") {
      throw new ApiError(400, "DISABLED_INGREDIENT", `Ingredient ${line.itemName ?? line.inventoryItemId} is not active.`);
    }
    rows.push({
      menu_item_id: recipe.menuItemId,
      inventory_item_id: line.inventoryItemId,
      quantity_per_unit: Number(line.convertedQuantity.toFixed(3)),
    });
  }

  const { error: insError } = await client.from("menu_item_inventory_components").insert(rows);
  if (insError) throwMappedDbError("BOM_SYNC_CREATE_FAILED", insError);
}

async function clearBranchBom(
  client: SupabaseClient,
  menuItemId: string,
  branchId: string,
): Promise<void> {
  const { data: existing, error } = await client
    .from("menu_item_inventory_components")
    .select("id, inventory_items!inner(branch_id)")
    .eq("menu_item_id", menuItemId)
    .eq("inventory_items.branch_id", branchId);
  if (error) throwMappedDbError("BOM_SYNC_READ_FAILED", error);
  const ids = (existing ?? []).map((r) => String(r.id));
  if (ids.length === 0) return;
  const { error: delError } = await client.from("menu_item_inventory_components").delete().in("id", ids);
  if (delError) throwMappedDbError("BOM_SYNC_DELETE_FAILED", delError);
}

export function createInventoryRecipeService(envStatus: EnvironmentStatus): InventoryRecipeService {
  const supabase = () => clientFrom(envStatus);

  return {
    async listRecipes(scope, opts) {
      const client = supabase();
      let query = client.from("inventory_recipes").select(RECIPE_SELECT).order("updated_at", { ascending: false });
      if (opts?.branchId) {
        assertBranchMembership(scope, opts.branchId);
        query = query.eq("branch_id", opts.branchId);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.in("branch_id", scope.branchIds);
      }
      if (opts?.menuItemId) query = query.eq("menu_item_id", opts.menuItemId);
      if (opts?.status) query = query.eq("status", opts.status);
      const { data, error } = await query;
      if (error) throwMappedDbError("RECIPE_LIST_FAILED", error);
      const out: RecipeRecord[] = [];
      for (const row of (data ?? []) as unknown as RecipeRow[]) {
        const lines = mapLines(await loadLines(client, row.id), num(row.yield_factor));
        out.push(mapRecipe(row, lines));
      }
      return out;
    },

    async getRecipe(scope, id) {
      const client = supabase();
      const recipe = await loadRecipeRecord(client, id);
      assertBranchMembership(scope, recipe.branchId);
      return recipe;
    },

    async createRecipe(scope, actorUserId, input, requestId) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);
      validateLines(input.lines);

      const { data: maxRow } = await client
        .from("inventory_recipes")
        .select("version")
        .eq("branch_id", input.branchId)
        .eq("menu_item_id", input.menuItemId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const version = (maxRow?.version ? Number(maxRow.version) : 0) + 1;
      const yieldFactor = input.yieldFactor ?? 1;

      const { data, error } = await client
        .from("inventory_recipes")
        .insert({
          branch_id: input.branchId,
          menu_item_id: input.menuItemId,
          name: input.name.trim(),
          version,
          status: "draft",
          yield_factor: yieldFactor,
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
        })
        .select("id")
        .single();
      if (error) throwMappedDbError("RECIPE_CREATE_FAILED", error);

      await replaceLines(client, data.id, input.branchId, yieldFactor, input.lines);
      const recipe = await loadRecipeRecord(client, data.id);
      await writeAudit(client, {
        recipeId: recipe.id,
        branchId: recipe.branchId,
        action: "recipe_created",
        actorUserId,
        requestId,
        after: { id: recipe.id, version: recipe.version, status: recipe.status },
      });
      return recipe;
    },

    async updateRecipe(scope, actorUserId, id, input, requestId) {
      const client = supabase();
      const existing = await loadRecipeRecord(client, id);
      assertBranchMembership(scope, existing.branchId);
      if (existing.status === "active") {
        throw new ApiError(409, "RECIPE_LOCKED", "Deactivate recipe before editing, or duplicate to a new version.");
      }

      const patch: Record<string, unknown> = {
        updated_by: actorUserId,
        updated_at: new Date().toISOString(),
      };
      if (input.name != null) patch.name = input.name.trim();
      if (input.yieldFactor != null) patch.yield_factor = input.yieldFactor;
      if (input.notes !== undefined) patch.notes = input.notes;

      const { error } = await client.from("inventory_recipes").update(patch).eq("id", id);
      if (error) throwMappedDbError("RECIPE_UPDATE_FAILED", error);

      const yieldFactor = input.yieldFactor ?? existing.yieldFactor;
      if (input.lines) {
        await replaceLines(client, id, existing.branchId, yieldFactor, input.lines);
      }

      const recipe = await loadRecipeRecord(client, id);
      await writeAudit(client, {
        recipeId: id,
        branchId: existing.branchId,
        action: "recipe_changed",
        actorUserId,
        requestId,
        before: { status: existing.status, version: existing.version },
        after: { status: recipe.status, version: recipe.version, lineCount: recipe.lines.length },
      });
      return recipe;
    },

    async activateRecipe(scope, actorUserId, id, requestId) {
      const client = supabase();
      const recipe = await loadRecipeRecord(client, id);
      assertBranchMembership(scope, recipe.branchId);
      if (recipe.lines.length === 0) {
        throw new ApiError(400, "INCOMPLETE_RECIPE", "Cannot activate a recipe with no ingredients.");
      }

      await client
        .from("inventory_recipes")
        .update({
          status: "inactive",
          deactivated_at: new Date().toISOString(),
          updated_by: actorUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("branch_id", recipe.branchId)
        .eq("menu_item_id", recipe.menuItemId)
        .eq("status", "active")
        .neq("id", id);

      const { error } = await client
        .from("inventory_recipes")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          deactivated_at: null,
          updated_by: actorUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throwMappedDbError("RECIPE_ACTIVATE_FAILED", error);

      const activated = await loadRecipeRecord(client, id);
      await syncActiveBom(client, activated);
      await writeAudit(client, {
        recipeId: id,
        branchId: recipe.branchId,
        action: "recipe_activated",
        actorUserId,
        requestId,
        after: { status: "active", version: activated.version },
      });
      return activated;
    },

    async deactivateRecipe(scope, actorUserId, id, requestId) {
      const client = supabase();
      const recipe = await loadRecipeRecord(client, id);
      assertBranchMembership(scope, recipe.branchId);

      const { error } = await client
        .from("inventory_recipes")
        .update({
          status: "inactive",
          deactivated_at: new Date().toISOString(),
          updated_by: actorUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throwMappedDbError("RECIPE_DEACTIVATE_FAILED", error);

      if (recipe.status === "active") {
        await clearBranchBom(client, recipe.menuItemId, recipe.branchId);
      }

      const updated = await loadRecipeRecord(client, id);
      await writeAudit(client, {
        recipeId: id,
        branchId: recipe.branchId,
        action: "recipe_deactivated",
        actorUserId,
        requestId,
        after: { status: "inactive" },
      });
      return updated;
    },

    async duplicateRecipe(scope, actorUserId, id, requestId) {
      const client = supabase();
      const source = await loadRecipeRecord(client, id);
      assertBranchMembership(scope, source.branchId);
      return this.createRecipe(
        scope,
        actorUserId,
        {
          branchId: source.branchId,
          menuItemId: source.menuItemId,
          name: `${source.name} (copy)`,
          yieldFactor: source.yieldFactor,
          notes: source.notes,
          lines: source.lines.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            unit: l.unit,
            wasteFactor: l.wasteFactor,
            sortOrder: l.sortOrder,
          })),
        },
        requestId,
      );
    },

    async listMissingRecipeMenuItems(scope, branchId, menuItemIds) {
      assertBranchMembership(scope, branchId);
      if (menuItemIds.length === 0) return [];
      const client = supabase();
      const { data, error } = await client
        .from("inventory_recipes")
        .select("menu_item_id")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .in("menu_item_id", menuItemIds);
      if (error) throwMappedDbError("RECIPE_LIST_FAILED", error);
      const have = new Set((data ?? []).map((r) => String(r.menu_item_id)));
      return menuItemIds.filter((id) => !have.has(id));
    },
  };
}

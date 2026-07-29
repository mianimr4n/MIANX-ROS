import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";

/**
 * Canonical single-price menu management.
 *
 * Owner/admin writes for categories and sellable SKUs. Every SKU carries exactly one
 * price; `menu_item_variants` is deprecated and is never read or written here.
 * Price and availability changes append to `menu_audit_events`.
 */

export interface MenuActor {
  userId: string | null;
  isSuperAdmin: boolean;
}

export interface MenuCategoryRecord {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  skuCount: number;
}

export interface MenuSkuRecord {
  id: string;
  categoryId: string;
  categorySlug: string;
  slug: string;
  name: string;
  productGroupSlug: string;
  sizeLabel: string | null;
  sizeCode: string | null;
  description: string | null;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  badge: string | null;
  productType: string;
  sortOrder: number;
}

export interface MenuProductGroupRecord {
  productGroupSlug: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  options: MenuSkuRecord[];
}

export interface CreateMenuCategoryInput {
  name: string;
  slug: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateMenuCategoryInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuSkuInput {
  categoryId: string;
  slug: string;
  name: string;
  price: number;
  productGroupSlug?: string;
  sizeLabel?: string | null;
  sizeCode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  productType: string;
  sortOrder?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface UpdateMenuSkuInput {
  categoryId?: string;
  name?: string;
  price?: number;
  productGroupSlug?: string;
  sizeLabel?: string | null;
  sizeCode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  sortOrder?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  /** Optional correlation / idempotency key for atomic price changes. */
  correlationId?: string | null;
  /** Optional optimistic concurrency check against the current DB price. */
  expectedOldPrice?: number | null;
}

export interface MenuAuditEventRecord {
  id: string;
  actorUserId: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
  scope: string;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
}

export interface UploadSkuImageInput {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  /** Raw base64 payload (no data: URL prefix). Max ~1.5 MiB decoded. */
  dataBase64: string;
}

export interface MenuManagementService {
  listCategories(): Promise<MenuCategoryRecord[]>;
  createCategory(actor: MenuActor, input: CreateMenuCategoryInput): Promise<MenuCategoryRecord>;
  updateCategory(
    actor: MenuActor,
    categoryId: string,
    input: UpdateMenuCategoryInput,
  ): Promise<MenuCategoryRecord>;
  listProductGroups(filters?: { categoryId?: string }): Promise<MenuProductGroupRecord[]>;
  createSku(actor: MenuActor, input: CreateMenuSkuInput): Promise<MenuSkuRecord>;
  updateSku(actor: MenuActor, skuId: string, input: UpdateMenuSkuInput): Promise<MenuSkuRecord>;
  uploadSkuImage(
    actor: MenuActor,
    skuId: string,
    input: UploadSkuImageInput,
  ): Promise<MenuSkuRecord>;
  listAuditEvents(filters?: { resourceId?: string; limit?: number }): Promise<MenuAuditEventRecord[]>;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

interface SkuRow {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  product_group_slug: string | null;
  size_label: string | null;
  size_code: string | null;
  description: string | null;
  price: number | string;
  is_available: boolean;
  is_featured: boolean;
  image_url: string | null;
  badge: string | null;
  product_type: string;
  sort_order: number | null;
}

const SKU_COLUMNS =
  "id, category_id, slug, name, product_group_slug, size_label, size_code, description, price, is_available, is_featured, image_url, badge, product_type, sort_order";

function parseNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Derive the family display name by stripping the SKU's size suffix. */
export function deriveFamilyName(name: string, sizeLabel: string | null): string {
  if (!sizeLabel) return name;
  const suffix = ` — ${sizeLabel}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

function toCategoryRecord(row: CategoryRow, skuCount: number): MenuCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    skuCount,
  };
}

function toSkuRecord(row: SkuRow, categorySlug: string): MenuSkuRecord {
  return {
    id: row.id,
    categoryId: row.category_id,
    categorySlug,
    slug: row.slug,
    name: row.name,
    productGroupSlug: row.product_group_slug ?? row.slug,
    sizeLabel: row.size_label,
    sizeCode: row.size_code,
    description: row.description,
    price: parseNumber(row.price),
    isAvailable: row.is_available,
    isFeatured: row.is_featured,
    imageUrl: row.image_url,
    badge: row.badge,
    productType: row.product_type,
    sortOrder: row.sort_order ?? 0,
  };
}

function assertPrice(price: number): void {
  if (!Number.isFinite(price) || price < 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Price must be a non-negative number.");
  }
}

export function createMenuManagementService(envStatus: EnvironmentStatus): MenuManagementService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadCategorySlugs(): Promise<Map<string, string>> {
    const { data, error } = await getClient().from("menu_categories").select("id, slug");
    if (error) throw new ApiError(500, "MENU_LOOKUP_FAILED", error.message);
    return new Map(((data ?? []) as Array<{ id: string; slug: string }>).map((row) => [row.id, row.slug]));
  }

  async function loadCategory(categoryId: string): Promise<CategoryRow> {
    const { data, error } = await getClient()
      .from("menu_categories")
      .select("id, name, slug, sort_order, is_active")
      .eq("id", categoryId)
      .maybeSingle();
    if (error) throw new ApiError(500, "MENU_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "MENU_CATEGORY_NOT_FOUND", "Menu category not found.");
    return data as CategoryRow;
  }

  async function loadSku(skuId: string): Promise<SkuRow> {
    const { data, error } = await getClient()
      .from("menu_items")
      .select(SKU_COLUMNS)
      .eq("id", skuId)
      .maybeSingle();
    if (error) throw new ApiError(500, "MENU_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");
    return data as SkuRow;
  }

  async function writeAudit(entry: {
    actor: MenuActor;
    resourceType: "menu_category" | "menu_item";
    resourceId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    note?: string | null;
    correlationId?: string | null;
  }): Promise<void> {
    // Non-price catalog writes still require an audit row. Failure fails the request
    // (caller must not claim success without audit). Price changes use the atomic RPC.
    const { error } = await getClient().from("menu_audit_events").insert({
      actor_user_id: entry.actor.userId,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      action: entry.action,
      scope: "global",
      branch_id: null,
      before_data: entry.before ?? null,
      after_data: entry.after ?? null,
      note: entry.note ?? null,
      correlation_id: entry.correlationId ?? null,
    });
    if (error) {
      throw new ApiError(500, "MENU_AUDIT_WRITE_FAILED", error.message);
    }
  }

  /**
   * Price changes go through update_menu_item_price_atomic so the menu_items update and
   * the menu_audit_events insert commit or roll back together.
   */
  async function updatePriceAtomic(
    actor: MenuActor,
    skuId: string,
    price: number,
    options?: { correlationId?: string | null; expectedOldPrice?: number | null },
  ): Promise<{ changed: boolean; price: number }> {
    assertPrice(price);
    const { data, error } = await getClient().rpc("update_menu_item_price_atomic", {
      p_menu_item_id: skuId,
      p_new_price: price,
      p_actor_user_id: actor.userId,
      p_correlation_id: options?.correlationId ?? null,
      p_expected_old_price: options?.expectedOldPrice ?? null,
    });

    if (error) {
      const message = error.message ?? "Atomic price update failed.";
      if (/PRICE_INVALID/i.test(message)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Price must be a non-negative number.");
      }
      if (/MENU_ITEM_NOT_FOUND/i.test(message)) {
        throw new ApiError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");
      }
      if (/PRICE_CONFLICT/i.test(message)) {
        throw new ApiError(409, "PRICE_CONFLICT", "The SKU price changed; refresh and retry.");
      }
      throw new ApiError(500, "MENU_ITEM_PRICE_UPDATE_FAILED", message);
    }

    const result = data as {
      changed?: boolean;
      price?: number;
      idempotentReplay?: boolean;
    } | null;

    return {
      changed: Boolean(result?.changed),
      price: typeof result?.price === "number" ? result.price : price,
    };
  }

  return {
    async listCategories() {
      const [categoriesResult, countsResult] = await Promise.all([
        getClient()
          .from("menu_categories")
          .select("id, name, slug, sort_order, is_active")
          .order("sort_order", { ascending: true }),
        getClient().from("menu_items").select("category_id"),
      ]);

      if (categoriesResult.error) {
        throw new ApiError(500, "MENU_LOOKUP_FAILED", categoriesResult.error.message);
      }
      if (countsResult.error) {
        throw new ApiError(500, "MENU_LOOKUP_FAILED", countsResult.error.message);
      }

      const counts = new Map<string, number>();
      for (const row of (countsResult.data ?? []) as Array<{ category_id: string }>) {
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
      }

      return ((categoriesResult.data ?? []) as CategoryRow[]).map((row) =>
        toCategoryRecord(row, counts.get(row.id) ?? 0),
      );
    },

    async createCategory(actor, input) {
      const { data, error } = await getClient()
        .from("menu_categories")
        .insert({
          name: input.name.trim(),
          slug: input.slug.trim().toLowerCase(),
          sort_order: input.sortOrder ?? 0,
          is_active: input.isActive ?? true,
        })
        .select("id, name, slug, sort_order, is_active")
        .maybeSingle();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "MENU_CATEGORY_SLUG_TAKEN", "That category slug already exists.");
        }
        throw new ApiError(500, "MENU_CATEGORY_CREATE_FAILED", error.message);
      }
      if (!data) throw new ApiError(500, "MENU_CATEGORY_CREATE_FAILED", "Category was not created.");

      const row = data as CategoryRow;
      await writeAudit({
        actor,
        resourceType: "menu_category",
        resourceId: row.id,
        action: "category.create",
        after: row,
      });

      return toCategoryRecord(row, 0);
    },

    async updateCategory(actor, categoryId, input) {
      const before = await loadCategory(categoryId);

      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "No category fields to update.");
      }

      const { data, error } = await getClient()
        .from("menu_categories")
        .update(patch)
        .eq("id", categoryId)
        .select("id, name, slug, sort_order, is_active")
        .maybeSingle();

      if (error) throw new ApiError(500, "MENU_CATEGORY_UPDATE_FAILED", error.message);
      if (!data) throw new ApiError(404, "MENU_CATEGORY_NOT_FOUND", "Menu category not found.");

      const row = data as CategoryRow;
      await writeAudit({
        actor,
        resourceType: "menu_category",
        resourceId: categoryId,
        action: "category.update",
        before,
        after: row,
      });

      return toCategoryRecord(row, 0);
    },

    async listProductGroups(filters) {
      const categorySlugs = await loadCategorySlugs();

      let query = getClient().from("menu_items").select(SKU_COLUMNS);
      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      const { data, error } = await query
        .order("category_id", { ascending: true })
        .order("product_group_slug", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) throw new ApiError(500, "MENU_LOOKUP_FAILED", error.message);

      const groups = new Map<string, MenuProductGroupRecord>();
      for (const row of (data ?? []) as SkuRow[]) {
        const sku = toSkuRecord(row, categorySlugs.get(row.category_id) ?? "uncategorized");
        const existing = groups.get(sku.productGroupSlug);
        if (existing) {
          existing.options.push(sku);
          continue;
        }
        groups.set(sku.productGroupSlug, {
          productGroupSlug: sku.productGroupSlug,
          name: deriveFamilyName(sku.name, sku.sizeLabel),
          categoryId: sku.categoryId,
          categorySlug: sku.categorySlug,
          options: [sku],
        });
      }

      return [...groups.values()];
    },

    async createSku(actor, input) {
      assertPrice(input.price);
      const category = await loadCategory(input.categoryId);
      const slug = input.slug.trim().toLowerCase();

      const { data, error } = await getClient()
        .from("menu_items")
        .insert({
          category_id: category.id,
          slug,
          name: input.name.trim(),
          product_group_slug: (input.productGroupSlug ?? slug).trim().toLowerCase(),
          size_label: input.sizeLabel ?? null,
          size_code: input.sizeCode ?? null,
          description: input.description ?? null,
          image_url: input.imageUrl ?? null,
          badge: input.badge ?? null,
          product_type: input.productType,
          price: input.price,
          sort_order: input.sortOrder ?? 0,
          is_available: input.isAvailable ?? true,
          is_featured: input.isFeatured ?? false,
        })
        .select(SKU_COLUMNS)
        .maybeSingle();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "MENU_ITEM_SLUG_TAKEN", "That menu item slug already exists.");
        }
        throw new ApiError(500, "MENU_ITEM_CREATE_FAILED", error.message);
      }
      if (!data) throw new ApiError(500, "MENU_ITEM_CREATE_FAILED", "Menu item was not created.");

      const row = data as SkuRow;
      await writeAudit({
        actor,
        resourceType: "menu_item",
        resourceId: row.id,
        action: "item.create",
        after: { slug: row.slug, name: row.name, price: parseNumber(row.price) },
      });

      return toSkuRecord(row, category.slug);
    },

    async updateSku(actor, skuId, input) {
      const before = await loadSku(skuId);

      // Price changes are transactional with their audit row.
      if (input.price !== undefined) {
        await updatePriceAtomic(actor, skuId, input.price, {
          correlationId: input.correlationId,
          expectedOldPrice: input.expectedOldPrice,
        });
      }

      const patch: Record<string, unknown> = {};
      if (input.categoryId !== undefined) {
        await loadCategory(input.categoryId);
        patch.category_id = input.categoryId;
      }
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.productGroupSlug !== undefined) {
        patch.product_group_slug = input.productGroupSlug.trim().toLowerCase();
      }
      if (input.sizeLabel !== undefined) patch.size_label = input.sizeLabel;
      if (input.sizeCode !== undefined) patch.size_code = input.sizeCode;
      if (input.description !== undefined) patch.description = input.description;
      if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
      if (input.badge !== undefined) patch.badge = input.badge;
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
      if (input.isAvailable !== undefined) patch.is_available = input.isAvailable;
      if (input.isFeatured !== undefined) patch.is_featured = input.isFeatured;

      if (Object.keys(patch).length === 0) {
        if (input.price === undefined) {
          throw new ApiError(400, "VALIDATION_ERROR", "No menu item fields to update.");
        }
        // Price-only update already committed atomically (with audit).
        const afterPriceOnly = await loadSku(skuId);
        const categorySlugs = await loadCategorySlugs();
        return toSkuRecord(afterPriceOnly, categorySlugs.get(afterPriceOnly.category_id) ?? "uncategorized");
      }

      const { data, error } = await getClient()
        .from("menu_items")
        .update(patch)
        .eq("id", skuId)
        .select(SKU_COLUMNS)
        .maybeSingle();

      if (error) throw new ApiError(500, "MENU_ITEM_UPDATE_FAILED", error.message);
      if (!data) throw new ApiError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");

      const row = data as SkuRow;

      // Non-price field changes get their own audit row. Price already audited atomically.
      await writeAudit({
        actor,
        resourceType: "menu_item",
        resourceId: skuId,
        action: "item.update",
        before: {
          slug: before.slug,
          name: before.name,
          price: parseNumber(before.price),
          isAvailable: before.is_available,
        },
        after: {
          slug: row.slug,
          name: row.name,
          price: parseNumber(row.price),
          isAvailable: row.is_available,
        },
        correlationId: input.correlationId ?? null,
      });

      const categorySlugs = await loadCategorySlugs();
      return toSkuRecord(row, categorySlugs.get(row.category_id) ?? "uncategorized");
    },

    async uploadSkuImage(actor, skuId, input) {
      const before = await loadSku(skuId);
      const decoded = Buffer.from(input.dataBase64, "base64");
      if (decoded.byteLength === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "Image payload is empty.");
      }
      if (decoded.byteLength > 2 * 1024 * 1024) {
        throw new ApiError(400, "VALIDATION_ERROR", "Image must be 2 MB or smaller.");
      }

      const ext =
        input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
      const objectPath = `${skuId}/${Date.now()}.${ext}`;
      const bucket = "menu-product-images";
      const supabase = getClient();

      const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, decoded, {
        contentType: input.contentType,
        upsert: true,
      });
      if (uploadError) {
        throw new ApiError(
          503,
          "MENU_IMAGE_UPLOAD_FAILED",
          uploadError.message.includes("Bucket not found")
            ? "Image storage bucket is not configured. Apply the menu-product-images migration."
            : uploadError.message,
        );
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      const imageUrl = publicData.publicUrl;
      if (!imageUrl || imageUrl.length > 500) {
        throw new ApiError(500, "MENU_IMAGE_UPLOAD_FAILED", "Public image URL is missing or too long.");
      }

      const { data, error } = await supabase
        .from("menu_items")
        .update({ image_url: imageUrl })
        .eq("id", skuId)
        .select(SKU_COLUMNS)
        .maybeSingle();
      if (error) throw new ApiError(500, "MENU_ITEM_UPDATE_FAILED", error.message);
      if (!data) throw new ApiError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");

      const row = data as SkuRow;
      await writeAudit({
        actor,
        resourceType: "menu_item",
        resourceId: skuId,
        action: "item.image_upload",
        before: { imageUrl: before.image_url },
        after: { imageUrl: row.image_url },
      });

      const categorySlugs = await loadCategorySlugs();
      return toSkuRecord(row, categorySlugs.get(row.category_id) ?? "uncategorized");
    },

    async listAuditEvents(filters) {
      let query = getClient()
        .from("menu_audit_events")
        .select("id, actor_user_id, resource_type, resource_id, action, scope, before_data, after_data, created_at");

      if (filters?.resourceId) {
        query = query.eq("resource_id", filters.resourceId);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(Math.min(filters?.limit ?? 50, 200));

      if (error) throw new ApiError(500, "MENU_AUDIT_LOOKUP_FAILED", error.message);

      return ((data ?? []) as Array<Record<string, unknown>>).map<MenuAuditEventRecord>((row) => ({
        id: row.id as string,
        actorUserId: (row.actor_user_id as string | null) ?? null,
        resourceType: row.resource_type as string,
        resourceId: row.resource_id as string,
        action: row.action as string,
        scope: row.scope as string,
        beforeData: row.before_data ?? null,
        afterData: row.after_data ?? null,
        createdAt: row.created_at as string,
      }));
    },
  };
}

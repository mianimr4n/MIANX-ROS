/**
 * Admin Menu workspace client for the canonical single-price catalog.
 *
 * Reads need `menu.read`; every write needs `menu.write` and is recorded server-side in
 * `menu_audit_events`. There is no variant endpoint — a size is its own sellable SKU.
 */

import { ADMIN_READ_TIMEOUT_MS, ADMIN_WRITE_TIMEOUT_MS, type AdminReadOptions } from "@/lib/admin-api";
import { bearerHeaders, fetchApiData } from "@/lib/api";

export type AdminMenuCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  skuCount: number;
};

export type AdminMenuSku = {
  id: string;
  categoryId: string;
  categorySlug: string;
  slug: string;
  name: string;
  productGroupSlug: string;
  sizeLabel: string | null;
  sizeCode: string | null;
  description: string | null;
  /** The single selling price of this SKU (PKR). */
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  badge: string | null;
  productType: string;
  sortOrder: number;
};

export type AdminMenuProductGroup = {
  productGroupSlug: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  options: AdminMenuSku[];
};

export type AdminMenuAuditEvent = {
  id: string;
  actorUserId: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
  scope: string;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
};

export type CreateMenuCategoryBody = {
  name: string;
  slug: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateMenuCategoryBody = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateMenuSkuBody = {
  categoryId: string;
  slug: string;
  name: string;
  price: number;
  productGroupSlug?: string;
  sizeLabel?: string | null;
  sizeCode?: "small" | "medium" | "large" | null;
  description?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  productType: string;
  sortOrder?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
};

export type UpdateMenuSkuBody = Partial<Omit<CreateMenuSkuBody, "slug" | "productType">> & {
  productType?: never;
};

function readInit(accessToken: string, opts?: AdminReadOptions) {
  return {
    headers: bearerHeaders(accessToken),
    signal: opts?.signal,
    correlationId: opts?.correlationId,
    timeoutMs: opts?.timeoutMs ?? ADMIN_READ_TIMEOUT_MS,
  };
}

function writeInit(accessToken: string, method: "POST" | "PATCH" | "PUT", body: unknown) {
  return {
    method,
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(body),
    timeoutMs: ADMIN_WRITE_TIMEOUT_MS,
  };
}

export function listMenuCategories(accessToken: string, opts?: AdminReadOptions) {
  return fetchApiData<AdminMenuCategory[]>("/admin/menu/categories", readInit(accessToken, opts));
}

export function createMenuCategory(accessToken: string, body: CreateMenuCategoryBody) {
  return fetchApiData<AdminMenuCategory>("/admin/menu/categories", writeInit(accessToken, "POST", body));
}

export function updateMenuCategory(
  accessToken: string,
  categoryId: string,
  body: UpdateMenuCategoryBody,
) {
  return fetchApiData<AdminMenuCategory>(
    `/admin/menu/categories/${categoryId}`,
    writeInit(accessToken, "PATCH", body),
  );
}

export function listMenuProductGroups(
  accessToken: string,
  query?: { categoryId?: string },
  opts?: AdminReadOptions,
) {
  const params = new URLSearchParams();
  if (query?.categoryId) params.set("categoryId", query.categoryId);
  const qs = params.toString();
  return fetchApiData<AdminMenuProductGroup[]>(
    `/admin/menu/products${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

export function createMenuSku(accessToken: string, body: CreateMenuSkuBody) {
  return fetchApiData<AdminMenuSku>("/admin/menu/products", writeInit(accessToken, "POST", body));
}

export function updateMenuSku(accessToken: string, skuId: string, body: UpdateMenuSkuBody) {
  return fetchApiData<AdminMenuSku>(
    `/admin/menu/skus/${skuId}`,
    writeInit(accessToken, "PUT", body),
  );
}

export function listMenuAuditEvents(
  accessToken: string,
  query?: { resourceId?: string; limit?: number },
  opts?: AdminReadOptions,
) {
  const params = new URLSearchParams();
  if (query?.resourceId) params.set("resourceId", query.resourceId);
  if (query?.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return fetchApiData<AdminMenuAuditEvent[]>(
    `/admin/menu/audit${qs ? `?${qs}` : ""}`,
    readInit(accessToken, opts),
  );
}

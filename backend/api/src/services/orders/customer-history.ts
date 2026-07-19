import { createClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import { ApiError } from "../../common/http.js";

function parseNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export type CustomerOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  branchId: string;
  branchCode: string;
  contactName: string;
  contactPhone: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomerOrderDetail = CustomerOrderListItem & {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  deliveryAddress: string | null;
  notes: string | null;
  branchName: string;
  items: Array<{
    menuItemSlug?: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions: string | null;
    extras: Array<{ slug: string; label: string; price: number }>;
  }>;
};

export interface CustomerOrdersDataSource {
  listOrders(
    authUserId: string,
    filters: { limit: number; offset: number; status?: string },
  ): Promise<{ orders: CustomerOrderListItem[]; total: number }>;
  getOrder(authUserId: string, orderNumber: string): Promise<CustomerOrderDetail>;
}

type SupabaseLike = { from: (table: string) => any };

export function createUnavailableCustomerOrdersDataSource(): CustomerOrdersDataSource {
  const fail = (): never => {
    throw new ApiError(503, "ORDERS_UNAVAILABLE", "Order history is not configured.");
  };
  return { listOrders: fail, getOrder: fail };
}

export function createCustomerOrdersDataSourceFromEnv(envStatus: EnvironmentStatus): CustomerOrdersDataSource {
  if (!envStatus.isReady) return createUnavailableCustomerOrdersDataSource();
  const client = createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createCustomerOrdersDataSource(client);
}

export function createCustomerOrdersDataSource(client: SupabaseLike | null): CustomerOrdersDataSource {
  if (!client) return createUnavailableCustomerOrdersDataSource();
  const db = client;

  function mapList(row: Record<string, unknown>): CustomerOrderListItem {
    const branch = Array.isArray(row.branch) ? row.branch[0] : row.branch;
    const branchRec = (branch ?? {}) as Record<string, unknown>;
    const items = row.items;
    const itemCount = Array.isArray(items)
      ? items.length
      : typeof items === "object" && items && "count" in (items as object)
        ? Number((items as { count: number }).count)
        : 0;
    return {
      id: row.id as string,
      orderNumber: row.order_number as string,
      status: row.status as string,
      orderType: row.order_type as string,
      branchId: row.branch_id as string,
      branchCode: (branchRec.branch_code as string) ?? "",
      contactName: (row.contact_name as string) ?? "",
      contactPhone: (row.contact_phone as string) ?? "",
      totalAmount: parseNumber(row.total_amount as number | string),
      itemCount,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  return {
    async listOrders(authUserId, filters) {
      let query = db
        .from("orders")
        .select(
          `id, order_number, status, order_type, branch_id, contact_name, contact_phone, total_amount, created_at, updated_at,
           branch:branches(branch_code),
           items:order_items(count)`,
          { count: "exact" },
        )
        .eq("auth_user_id", authUserId)
        .order("created_at", { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1);

      if (filters.status) query = query.eq("status", filters.status);

      const { data, error, count } = await query;
      if (error) throw new ApiError(500, "ORDER_LIST_FAILED", error.message);
      const orders = ((data ?? []) as Array<Record<string, unknown>>).map(mapList);
      return { orders, total: count ?? orders.length };
    },

    async getOrder(authUserId, orderNumber) {
      const { data: order, error } = await db
        .from("orders")
        .select(
          `id, order_number, status, order_type, branch_id, contact_name, contact_phone,
           subtotal, discount_amount, tax_amount, delivery_fee, total_amount,
           delivery_address, notes, created_at, updated_at,
           branch:branches(branch_code, name),
           items:order_items(
             product_name, variant_name, quantity, unit_price, total_price, instructions, extras_snapshot,
             menu_item:menu_items(slug)
           )`,
        )
        .eq("auth_user_id", authUserId)
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error) throw new ApiError(500, "ORDER_LOOKUP_FAILED", error.message);
      if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");

      const branch = Array.isArray(order.branch) ? order.branch[0] : order.branch;
      const branchRec = (branch ?? {}) as Record<string, unknown>;
      const list = mapList(order as Record<string, unknown>);

      return {
        ...list,
        subtotal: parseNumber(order.subtotal as number | string),
        discountAmount: parseNumber(order.discount_amount as number | string),
        taxAmount: parseNumber(order.tax_amount as number | string),
        deliveryFee: parseNumber(order.delivery_fee as number | string),
        deliveryAddress: (order.delivery_address as string | null) ?? null,
        notes: (order.notes as string | null) ?? null,
        branchName: (branchRec.name as string) ?? list.branchCode,
        items: ((order.items ?? []) as Array<Record<string, unknown>>).map((item) => {
          const menuItem = Array.isArray(item.menu_item) ? item.menu_item[0] : item.menu_item;
          const slug = menuItem && typeof menuItem === "object" ? (menuItem as { slug?: string }).slug : undefined;
          return {
            menuItemSlug: slug,
            productName: item.product_name as string,
            variantName: (item.variant_name as string | null) ?? null,
            quantity: item.quantity as number,
            unitPrice: parseNumber(item.unit_price as number | string),
            totalPrice: parseNumber(item.total_price as number | string),
            instructions: (item.instructions as string | null) ?? null,
            extras:
              (item.extras_snapshot as Array<{ slug: string; label: string; price: number }>) ?? [],
          };
        }),
      };
    },
  };
}

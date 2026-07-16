import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import { ApiError } from "../../common/http.js";
import {
  buildOrderNotes,
  formatExtrasInstructions,
  normalizeContactPhone,
  requireDeliveryAddress,
} from "./create-helpers.js";
import type {
  CreateOrderInput,
  CreatedOrderSummary,
  OrderTrackingSummary,
  OrdersDataSource,
} from "./types.js";

interface BranchRow {
  id: string;
  branch_code: string;
  status: string;
}

interface MenuItemRow {
  id: string;
  slug: string;
  name: string;
  base_price: number | string | null;
  variants: Array<{
    id: string;
    label: string;
    price: number | string;
    is_available: boolean;
  }> | null;
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function generateOrderNumber() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `TP-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export class OrdersServiceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrdersServiceConfigurationError";
  }
}

function createSupabaseAdminClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new OrdersServiceConfigurationError("Supabase service role configuration is missing.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseOrdersDataSource(envStatus: EnvironmentStatus): OrdersDataSource {
  let client: SupabaseClient | null = null;

  const getClient = () => {
    if (!client) {
      client = createSupabaseAdminClient(envStatus);
    }
    return client;
  };

  return {
    async createOrder(input: CreateOrderInput): Promise<CreatedOrderSummary> {
      const supabase = getClient();

      const deliveryAddress = requireDeliveryAddress(input.orderType, input.deliveryAddress);
      if (input.orderType === "delivery" && !deliveryAddress) {
        throw new ApiError(
          400,
          "DELIVERY_ADDRESS_REQUIRED",
          "Delivery address is required for delivery orders.",
        );
      }

      const contactPhone = input.contactPhone.trim();
      if (normalizeContactPhone(contactPhone).length < 7) {
        throw new ApiError(400, "INVALID_CONTACT_PHONE", "Contact phone is invalid.");
      }

      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .select("id, branch_code, status")
        .eq("branch_code", input.branchCode)
        .maybeSingle<BranchRow>();

      if (branchError) {
        throw new ApiError(500, "BRANCH_LOOKUP_FAILED", branchError.message);
      }

      if (!branch) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", `Branch '${input.branchCode}' was not found.`);
      }

      if (branch.status !== "operating") {
        throw new ApiError(400, "BRANCH_UNAVAILABLE", "Selected branch is not accepting orders.");
      }

      const slugs = [...new Set(input.items.map((item) => item.menuItemSlug))];
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select(
          "id, slug, name, base_price, variants:menu_item_variants(id, label, price, is_available)",
        )
        .in("slug", slugs);

      if (menuError) {
        throw new ApiError(500, "MENU_LOOKUP_FAILED", menuError.message);
      }

      const menuBySlug = new Map((menuItems ?? []).map((item) => [item.slug, item as MenuItemRow]));

      let subtotal = 0;
      const orderItemsPayload = input.items.map((item) => {
        const menuItem = menuBySlug.get(item.menuItemSlug);
        let menuItemId = menuItem?.id ?? null;
        let variantId: string | null = null;
        let productName = item.productName;
        let variantName = item.variantName ?? null;
        let unitPrice = item.unitPrice;

        if (menuItem) {
          productName = menuItem.name;
          const variant = item.variantLabel
            ? menuItem.variants?.find((entry) => entry.label === item.variantLabel)
            : menuItem.variants?.[0];

          if (variant) {
            if (!variant.is_available) {
              throw new ApiError(
                400,
                "VARIANT_UNAVAILABLE",
                `Variant '${variant.label}' for '${item.menuItemSlug}' is not available.`,
              );
            }
            variantId = variant.id;
            variantName = variant.label;
            unitPrice = parseNumber(variant.price);
          } else if (item.variantLabel) {
            throw new ApiError(
              400,
              "VARIANT_NOT_FOUND",
              `Variant '${item.variantLabel}' for '${item.menuItemSlug}' was not found.`,
            );
          } else if (menuItem.base_price !== null) {
            unitPrice = parseNumber(menuItem.base_price);
          }
        }

        const extrasTotal = (item.extras ?? []).reduce((sum, extra) => sum + extra.price, 0);
        const lineUnitTotal = unitPrice + extrasTotal;
        const totalPrice = lineUnitTotal * item.quantity;
        subtotal += totalPrice;

        if (!menuItemId) {
          throw new ApiError(
            400,
            "MENU_ITEM_NOT_FOUND",
            `Menu item '${item.menuItemSlug}' is not available for online ordering yet.`,
          );
        }

        return {
          menu_item_id: menuItemId,
          variant_id: variantId,
          product_name: productName,
          variant_name: variantName,
          quantity: item.quantity,
          unit_price: lineUnitTotal,
          total_price: totalPrice,
          instructions: formatExtrasInstructions(item.instructions, item.extras),
        };
      });

      const orderNumber = generateOrderNumber();
      const notes = buildOrderNotes(input.notes, input.couponCode);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: input.customerId ?? null,
          branch_id: branch.id,
          order_type: input.orderType,
          order_source: input.orderSource,
          status: "pending",
          subtotal,
          discount_amount: 0,
          tax_amount: 0,
          delivery_fee: 0,
          total_amount: subtotal,
          payment_status: "pending",
          contact_name: input.contactName.trim(),
          contact_phone: contactPhone,
          delivery_address: deliveryAddress ?? null,
          notes,
        })
        .select("id, order_number, status, subtotal, total_amount, created_at")
        .single();

      if (orderError || !order) {
        throw new ApiError(500, "ORDER_CREATE_FAILED", orderError?.message ?? "Order insert failed.");
      }

      const { error: itemsError } = await supabase.from("order_items").insert(
        orderItemsPayload.map((item) => ({
          order_id: order.id,
          ...item,
        })),
      );

      if (itemsError) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw new ApiError(500, "ORDER_ITEMS_CREATE_FAILED", itemsError.message);
      }

      if (input.orderType === "delivery" && deliveryAddress) {
        const { error: deliveryError } = await supabase.from("deliveries").insert({
          order_id: order.id,
          branch_id: branch.id,
          delivery_address: deliveryAddress,
          status: "pending",
        });

        if (deliveryError) {
          await supabase.from("orders").delete().eq("id", order.id);
          throw new ApiError(500, "DELIVERY_CREATE_FAILED", deliveryError.message);
        }
      }

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: parseNumber(order.subtotal),
        totalAmount: parseNumber(order.total_amount),
        createdAt: order.created_at,
      };
    },

    async getOrderTracking(orderNumber: string, contactPhone: string): Promise<OrderTrackingSummary | null> {
      const supabase = getClient();
      const normalizedInputPhone = normalizeContactPhone(contactPhone);

      const { data: order, error } = await supabase
        .from("orders")
        .select(
          `
          order_number,
          status,
          order_type,
          contact_name,
          contact_phone,
          subtotal,
          total_amount,
          delivery_address,
          notes,
          created_at,
          updated_at,
          items:order_items(
            product_name,
            variant_name,
            quantity,
            unit_price,
            total_price,
            instructions
          )
        `,
        )
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "ORDER_TRACKING_FAILED", error.message);
      }

      if (!order) {
        return null;
      }

      if (normalizeContactPhone(order.contact_phone) !== normalizedInputPhone) {
        throw new ApiError(403, "ORDER_ACCESS_DENIED", "Phone number does not match this order.");
      }

      return {
        orderNumber: order.order_number,
        status: order.status,
        orderType: order.order_type,
        contactName: order.contact_name,
        contactPhone: order.contact_phone,
        subtotal: parseNumber(order.subtotal),
        totalAmount: parseNumber(order.total_amount),
        deliveryAddress: order.delivery_address,
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: (order.items ?? []).map(
          (item: {
            product_name: string;
            variant_name: string | null;
            quantity: number;
            unit_price: number | string;
            total_price: number | string;
            instructions: string | null;
          }) => ({
            productName: item.product_name,
            variantName: item.variant_name,
            quantity: item.quantity,
            unitPrice: parseNumber(item.unit_price),
            totalPrice: parseNumber(item.total_price),
            instructions: item.instructions,
          }),
        ),
      };
    },
  };
}

export function createUnavailableOrdersDataSource(): OrdersDataSource {
  return {
    async createOrder() {
      throw new ApiError(
        503,
        "ORDERS_UNAVAILABLE",
        "Online ordering API is not configured. Use WhatsApp checkout or configure Supabase.",
      );
    },
    async getOrderTracking() {
      throw new ApiError(
        503,
        "ORDERS_UNAVAILABLE",
        "Order tracking API is not configured.",
      );
    },
  };
}

export function createOrdersDataSource(envStatus: EnvironmentStatus): OrdersDataSource {
  if (!envStatus.isReady) {
    return createUnavailableOrdersDataSource();
  }

  try {
    return createSupabaseOrdersDataSource(envStatus);
  } catch {
    return createUnavailableOrdersDataSource();
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import { ApiError } from "../../common/http.js";
import { assertBranchOperational } from "../branches/operational-status.js";
import { attachConfirmedDineInOrderToBill } from "../bills/restaurant-bills.js";
import {
  buildCatalogLookup,
  collectCatalogSkuIds,
  collectCatalogSlugs,
  hashIdempotencyPayload,
  normalizePhoneE164,
  parseNumber,
  priceOrderLines,
  type CatalogLookup,
  type CatalogMenuItem,
} from "./pricing.js";
import {
  modifierSelectionKey,
  type ModifierOptionRow,
} from "./modifiers.js";
import {
  assertQuoteMatchesCreate,
  assertQuoteNotExpired,
  assertQuotePricesStillValid,
  buildQuoteCartCanon,
  hashPricedTotals,
  hashQuoteCart,
  issueQuoteToken,
  parseAndVerifyQuoteToken,
} from "./quote-token.js";
import { collectClientMoneyWarnings } from "./warnings.js";
import { contactPhoneMatchesOrder } from "./phone-access.js";
import {
  assertCustomerCancelAllowed,
  CustomerCancelNotAllowedError,
} from "./cancel-rules.js";
import type {
  CancelOrderInput,
  CancelOrderResult,
  CreateOrderInput,
  CreatedOrderSummary,
  OrderTrackingSummary,
  OrdersDataSource,
  QuoteOrderInput,
  QuoteOrderResult,
} from "./types.js";

interface BranchRow {
  id: string;
  branch_code: string;
  status: string;
}

function mapAtomicCreateError(error: { message?: string; code?: string; details?: string }): never {
  const raw = `${error.message ?? ""} ${error.details ?? ""}`;
  const known = [
    "IDEMPOTENCY_CONFLICT",
    "BRANCH_NOT_FOUND",
    "BRANCH_INACTIVE",
    "BRANCH_NOT_OPERATIONAL",
    "IDEMPOTENCY_KEY_REQUIRED",
    "IDEMPOTENCY_HASH_REQUIRED",
    "ORDER_ITEMS_REQUIRED",
    "DINE_IN_SESSION_NOT_FOUND",
    "DINE_IN_SESSION_BRANCH_MISMATCH",
    "DINE_IN_SESSION_NOT_ACTIVE",
    "DINE_IN_SESSION_ORDER_TYPE_MISMATCH",
  ] as const;
  for (const code of known) {
    if (raw.includes(code)) {
      const status =
        code === "IDEMPOTENCY_CONFLICT"
          ? 409
          : code.startsWith("BRANCH_")
            ? code === "BRANCH_NOT_FOUND"
              ? 404
              : 409
            : code === "DINE_IN_SESSION_NOT_FOUND"
              ? 404
              : code.startsWith("DINE_IN_SESSION_")
                ? 409
                : 400;
      throw new ApiError(
        status,
        code,
        code === "IDEMPOTENCY_CONFLICT"
          ? "Idempotency-Key was reused with a different order payload."
          : code === "BRANCH_NOT_OPERATIONAL"
            ? "This branch is not operationally active."
            : code === "BRANCH_INACTIVE"
              ? "This branch is inactive."
              : code === "BRANCH_NOT_FOUND"
                ? "Branch was not found."
                : code === "DINE_IN_SESSION_NOT_FOUND"
                  ? "Dining session was not found."
                  : code === "DINE_IN_SESSION_BRANCH_MISMATCH"
                    ? "Dining session belongs to another branch."
                    : code === "DINE_IN_SESSION_NOT_ACTIVE"
                      ? "Dining session is not active."
                      : code === "DINE_IN_SESSION_ORDER_TYPE_MISMATCH"
                        ? "A dining session requires orderType dine-in."
                        : "Order create validation failed.",
      );
    }
  }
  throw new ApiError(500, "ORDER_CREATE_FAILED", "Atomic order create failed.");
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

async function loadOperatingBranch(
  supabase: SupabaseClient,
  branchCode: string,
  options: { quoteContext?: boolean } = {},
): Promise<BranchRow> {
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, branch_code, status")
    .eq("branch_code", branchCode)
    .maybeSingle<BranchRow>();

  if (branchError) {
    throw new ApiError(500, "BRANCH_LOOKUP_FAILED", branchError.message);
  }
  if (!branch) {
    throw new ApiError(404, "BRANCH_NOT_FOUND", `Branch '${branchCode}' was not found.`);
  }
  if (branch.status !== "operating") {
    if (options.quoteContext) {
      throw new ApiError(400, "QUOTE_BRANCH_UNAVAILABLE", "Selected branch is not accepting orders.");
    }
    assertBranchOperational(branch.status);
  }
  return branch;
}

/** Minimal shape of the chained PostgREST filter builder used by the catalog loader. */
interface PostgrestFilterLike {
  in(column: string, values: readonly string[]): PostgrestFilterLike;
  then: Promise<{ data: unknown[] | null; error: { message: string } | null }>["then"];
}

const CANONICAL_SKU_COLUMNS =
  "id, slug, name, price, product_group_slug, size_label, size_code, sort_order, product_type, is_available";

/**
 * Load the canonical SKU rows needed to price one order.
 *
 * Slugs are matched both as SKU slugs and as product-family slugs so pre-SKU clients
 * (which send a family slug plus a size label) keep working, and so size-scaled toppings
 * can resolve their sibling SKUs.
 */
async function loadCatalogMap(
  supabase: SupabaseClient,
  lines: QuoteOrderInput["items"] | CreateOrderInput["items"],
): Promise<CatalogLookup> {
  const knownSlugs = collectCatalogSlugs(lines);
  const knownSkuIds = collectCatalogSkuIds(lines);
  // Bare extra labels (drinks/fries addons) still resolve by menu item name.
  const needsNameLookup = lines.some((line) =>
    (line.extras ?? []).some((extra) => !extra.slug && extra.label && !extra.label.toLowerCase().includes("extra chicken") && !extra.label.toLowerCase().includes("extra cheese")),
  );

  const menuItems: CatalogMenuItem[] = [];

  const collect = async (apply: (query: PostgrestFilterLike) => PostgrestFilterLike) => {
    const { data, error } = await apply(
      supabase.from("menu_items").select(CANONICAL_SKU_COLUMNS) as unknown as PostgrestFilterLike,
    );
    if (error) {
      throw new ApiError(500, "MENU_LOOKUP_FAILED", error.message);
    }
    menuItems.push(...((data ?? []) as CatalogMenuItem[]));
  };

  if (knownSkuIds.length > 0) {
    await collect((query) => query.in("id", knownSkuIds));
  }

  if (knownSlugs.length > 0) {
    await collect((query) => query.in("slug", knownSlugs));
    await collect((query) => query.in("product_group_slug", knownSlugs));
  }

  if (needsNameLookup) {
    const labels = lines
      .flatMap((line) => (line.extras ?? []).map((extra) => extra.label?.trim()).filter(Boolean) as string[]);
    if (labels.length) {
      await collect((query) => query.in("name", labels));
    }
  }

  // Size-scaled toppings live in the same family as the referenced SKU.
  const familySlugs = [
    ...new Set(
      menuItems
        .filter((item) => item.product_type === "topping")
        .map((item) => item.product_group_slug ?? item.slug),
    ),
  ].filter((slug) => !knownSlugs.includes(slug));
  if (familySlugs.length > 0) {
    await collect((query) => query.in("product_group_slug", familySlugs));
  }

  const deduped = new Map<string, CatalogMenuItem>();
  for (const item of menuItems) {
    deduped.set(item.id, item);
  }

  return buildCatalogLookup(deduped.values());
}

async function loadModifiersMap(
  supabase: SupabaseClient,
  lines: QuoteOrderInput["items"] | CreateOrderInput["items"],
): Promise<Map<string, ModifierOptionRow>> {
  const selections = lines.flatMap((line) => line.modifiers ?? []);
  if (selections.length === 0) {
    return new Map();
  }

  const groupCodes = [...new Set(selections.map((entry) => entry.groupCode))];
  const optionCodes = [...new Set(selections.map((entry) => entry.optionCode))];

  const { data, error } = await supabase
    .from("modifier_options")
    .select(
      "id, code, name, price_delta, price_delta_by_size, size_code, linked_menu_item_id, is_active, sort_order, group:modifier_groups!inner(id, code, name, is_active)",
    )
    .in("code", optionCodes)
    .eq("is_active", true);

  if (error) {
    // Table may not exist until migration is applied — fail clearly for modifier requests.
    throw new ApiError(500, "MODIFIER_LOOKUP_FAILED", error.message);
  }

  const map = new Map<string, ModifierOptionRow>();
  for (const raw of data ?? []) {
    const row = raw as unknown as ModifierOptionRow & {
      group:
        | ModifierOptionRow["group"]
        | NonNullable<ModifierOptionRow["group"]>[]
        | null;
    };
    const group = Array.isArray(row.group) ? row.group[0] ?? null : row.group;
    if (!group || !groupCodes.includes(group.code)) continue;
    map.set(modifierSelectionKey(group.code, row.code), { ...row, group });
  }
  return map;
}

function requireDeliveryAddress(
  orderType: CreateOrderInput["orderType"] | QuoteOrderInput["orderType"],
  deliveryAddress: string | undefined,
): string | undefined {
  if (orderType !== "delivery") {
    return deliveryAddress?.trim() || undefined;
  }
  const trimmed = deliveryAddress?.trim();
  return trimmed || undefined;
}

export function createSupabaseOrdersDataSource(envStatus: EnvironmentStatus): OrdersDataSource {
  let client: SupabaseClient | null = null;

  const getClient = () => {
    if (!client) {
      client = createSupabaseAdminClient(envStatus);
    }
    return client;
  };

  async function fetchGuestOrder(
    orderNumber: string,
    contactPhone: string,
  ): Promise<OrderTrackingSummary | null> {
    const supabase = getClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
          order_number,
          status,
          order_type,
          contact_name,
          contact_phone,
          contact_phone_e164,
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
            instructions,
            extras_snapshot
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

    if (
      !contactPhoneMatchesOrder(
        order.contact_phone,
        order.contact_phone_e164 as string | null,
        contactPhone,
      )
    ) {
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
          extras_snapshot?: Array<{ slug: string; label: string; price: number }> | null;
        }) => ({
          productName: item.product_name,
          variantName: item.variant_name,
          quantity: item.quantity,
          unitPrice: parseNumber(item.unit_price),
          totalPrice: parseNumber(item.total_price),
          instructions: item.instructions,
          extras: item.extras_snapshot ?? [],
        }),
      ),
    };
  }

  return {
    async quoteOrder(input: QuoteOrderInput): Promise<QuoteOrderResult> {
      const supabase = getClient();
      const signingSecret = envStatus.config.jwtSecret;
      const branch = await loadOperatingBranch(supabase, input.branchCode);
      const catalog = await loadCatalogMap(supabase, input.items);
      const modifiersByKey = await loadModifiersMap(supabase, input.items);
      const priced = priceOrderLines({ lines: input.items, catalog, modifiersByKey });

      const cartCanon = buildQuoteCartCanon(input.items);
      const cartHash = hashQuoteCart(cartCanon);
      const pricedHash = hashPricedTotals({
        subtotal: priced.subtotal,
        discountAmount: priced.discountAmount,
        taxAmount: priced.taxAmount,
        deliveryFee: priced.deliveryFee,
        totalAmount: priced.totalAmount,
        lines: priced.lines.map((line) => ({
          menuItemSlug: line.menuItemSlug,
          foodUnitPrice: line.foodUnitPrice,
          lineUnitPrice: line.lineUnitPrice,
          lineTotal: line.lineTotal,
          quantity: line.quantity,
          extras: line.extras.map((extra) => ({ slug: extra.slug, price: extra.price })),
        })),
      });

      let contactPhoneE164: string | null = null;
      if (input.contactPhone?.trim()) {
        contactPhoneE164 = normalizePhoneE164(input.contactPhone);
      }

      const token = issueQuoteToken({
        signingSecret,
        branchCode: branch.branch_code,
        orderType: input.orderType,
        cartHash,
        pricedHash,
        subtotal: priced.subtotal,
        totalAmount: priced.totalAmount,
        contactPhoneE164,
      });

      const warnings = collectClientMoneyWarnings({
        items: input.items,
        couponCode: input.couponCode,
      });

      return {
        quoteId: token.quoteId,
        expiresAt: token.expiresAt,
        branch: {
          code: branch.branch_code,
          orderType: input.orderType,
        },
        items: priced.lines.map((line) => ({
          menuItemId: line.menuItemId,
          menuItemSlug: line.menuItemSlug,
          productName: line.productName,
          variantName: line.variantName,
          quantity: line.quantity,
          foodUnitPrice: line.foodUnitPrice,
          extras: line.extras,
          lineUnitPrice: line.lineUnitPrice,
          lineTotal: line.lineTotal,
        })),
        totals: {
          currency: "PKR",
          subtotal: priced.subtotal,
          discountAmount: priced.discountAmount,
          taxAmount: priced.taxAmount,
          deliveryFee: priced.deliveryFee,
          totalAmount: priced.totalAmount,
        },
        warnings,
        pricedAt: priced.pricingSnapshot.pricedAt,
      };
    },

    async createOrder(input: CreateOrderInput): Promise<CreatedOrderSummary> {
      const supabase = getClient();

      if (!input.idempotencyKey?.trim()) {
        throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.");
      }

      const deliveryAddress = requireDeliveryAddress(input.orderType, input.deliveryAddress);
      if (input.orderType === "delivery" && !deliveryAddress) {
        throw new ApiError(
          400,
          "DELIVERY_ADDRESS_REQUIRED",
          "Delivery address is required for delivery orders.",
        );
      }

      const contactPhoneE164 = normalizePhoneE164(input.contactPhone);
      const cartCanon = buildQuoteCartCanon(input.items);
      const cartHash = hashQuoteCart(cartCanon);

      // Optional quoteId — never bypasses Idempotency-Key. Verified against server clock + cart bind.
      let verifiedQuote: ReturnType<typeof parseAndVerifyQuoteToken> | null = null;
      if (input.quoteId?.trim()) {
        verifiedQuote = parseAndVerifyQuoteToken(input.quoteId.trim(), envStatus.config.jwtSecret);
        assertQuoteNotExpired(verifiedQuote);
        assertQuoteMatchesCreate({
          payload: verifiedQuote,
          branchCode: input.branchCode,
          orderType: input.orderType,
          cartHash,
          contactPhoneE164,
        });
      }

      const requestHash = hashIdempotencyPayload({
        branchCode: input.branchCode,
        orderType: input.orderType,
        orderSource: input.orderSource,
        contactName: input.contactName.trim(),
        contactPhoneE164,
        deliveryAddress: deliveryAddress ?? null,
        notes: input.notes?.trim() ?? null,
        couponCode: input.couponCode?.trim() ?? null,
        quoteId: input.quoteId?.trim() || null,
        items: input.items.map((item) => ({
          menuItemId: item.menuItemId ?? null,
          menuItemSlug: item.menuItemSlug ?? null,
          variantLabel: item.variantLabel ?? null,
          quantity: item.quantity,
          toppings: item.toppings ?? [],
          extras: (item.extras ?? []).map((extra) => ({
            slug: extra.slug ?? null,
            label: extra.label ?? null,
          })),
          modifiers: (item.modifiers ?? []).map((modifier) => ({
            groupCode: modifier.groupCode,
            optionCode: modifier.optionCode,
          })),
          instructions: item.instructions ?? null,
        })),
      });

      const { data: existing, error: existingError } = await supabase
        .from("orders")
        .select("id, order_number, status, subtotal, discount_amount, tax_amount, delivery_fee, total_amount, created_at, idempotency_request_hash")
        .eq("idempotency_key", input.idempotencyKey.trim())
        .maybeSingle();

      if (existingError) {
        throw new ApiError(500, "ORDER_LOOKUP_FAILED", existingError.message);
      }

      if (existing) {
        if (existing.idempotency_request_hash && existing.idempotency_request_hash !== requestHash) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Idempotency-Key was reused with a different order payload.",
          );
        }
        return {
          id: existing.id,
          orderNumber: existing.order_number,
          status: existing.status,
          subtotal: parseNumber(existing.subtotal),
          discountAmount: parseNumber(existing.discount_amount),
          taxAmount: parseNumber(existing.tax_amount),
          deliveryFee: parseNumber(existing.delivery_fee),
          totalAmount: parseNumber(existing.total_amount),
          createdAt: existing.created_at,
          idempotentReplay: true,
        };
      }

      const branch = await loadOperatingBranch(supabase, input.branchCode);
      const catalog = await loadCatalogMap(supabase, input.items);
      const modifiersByKey = await loadModifiersMap(supabase, input.items);
      const priced = priceOrderLines({ lines: input.items, catalog, modifiersByKey });

      const notes = [input.notes?.trim(), input.couponCode?.trim() ? `Promo code: ${input.couponCode.trim()}` : null]
        .filter(Boolean)
        .join("\n");

      const isPos = input.orderSource === "pos" || input.orderSource === "admin";
      const itemsPayload = priced.lines.map((line) => ({
        menu_item_id: line.menuItemId,
        variant_id: line.variantId,
        product_name: line.productName,
        variant_name: line.variantName,
        quantity: line.quantity,
        unit_price: line.lineUnitPrice,
        total_price: line.lineTotal,
        food_unit_price: line.foodUnitPrice,
        extras_snapshot: line.extrasSnapshot,
        instructions: line.instructions,
        modifiers_snapshot: line.modifiers.map((m) => ({
          group: m.groupName,
          option: m.optionName,
          quantity: 1,
        })),
        modifiers: line.modifiers.map((modifier) => ({
          modifier_option_id: modifier.modifierOptionId,
          group_code: modifier.groupCode,
          group_name: modifier.groupName,
          option_code: modifier.optionCode,
          option_name: modifier.optionName,
          price_delta: modifier.priceDelta,
          unit_price: modifier.priceDelta,
          total_price: modifier.priceDelta,
          quantity: 1,
          sort_order: modifier.sortOrder,
        })),
      }));

      const { data: atomic, error: atomicError } = await supabase.rpc("create_order_atomic", {
        p_idempotency_key: input.idempotencyKey.trim(),
        p_idempotency_request_hash: requestHash,
        p_branch_id: branch.id,
        p_order: {
          order_type: input.orderType,
          order_source: input.orderSource,
          status: isPos ? "confirmed" : "pending",
          subtotal: priced.subtotal,
          discount_amount: priced.discountAmount,
          tax_amount: priced.taxAmount,
          delivery_fee: priced.deliveryFee,
          total_amount: priced.totalAmount,
          payment_status: "pending",
          contact_name: input.contactName.trim(),
          contact_phone: input.contactPhone.trim(),
          contact_phone_e164: contactPhoneE164,
          delivery_address: deliveryAddress ?? null,
          notes: notes || null,
          pricing_snapshot: priced.pricingSnapshot,
          auth_user_id: input.authUserId?.trim() || null,
          customer_id: input.customerId ?? null,
          payment_method: "cash",
        },
        p_items: itemsPayload,
        p_create_delivery: input.orderType === "delivery" && Boolean(deliveryAddress),
        p_delivery: { delivery_address: deliveryAddress ?? null },
        p_create_kitchen_ticket: isPos,
        p_create_payment_pending: isPos,
        p_actor_type: isPos ? "staff" : "guest",
        p_actor_user_id: null,
        p_dine_in: input.diningSessionId
          ? { dine_in_session_id: input.diningSessionId }
          : {},
      });

      if (atomicError) {
        mapAtomicCreateError(atomicError);
      }

      const row = atomic as {
        id: string;
        orderNumber: string;
        status: string;
        subtotal: number | string;
        discountAmount: number | string;
        taxAmount: number | string;
        deliveryFee: number | string;
        totalAmount: number | string;
        createdAt: string;
        idempotentReplay?: boolean;
      };

      if (!row?.id) {
        throw new ApiError(500, "ORDER_CREATE_FAILED", "Atomic order create returned no row.");
      }

      // Dine-in POS creates confirmed orders atomically; attach to session bill (idempotent).
      if (isPos && input.diningSessionId && input.orderType === "dine-in" && !row.idempotentReplay) {
        await attachConfirmedDineInOrderToBill(getClient(), row.id);
      }

      return {
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        subtotal: parseNumber(row.subtotal),
        discountAmount: parseNumber(row.discountAmount),
        taxAmount: parseNumber(row.taxAmount),
        deliveryFee: parseNumber(row.deliveryFee),
        totalAmount: parseNumber(row.totalAmount),
        createdAt: row.createdAt,
        idempotentReplay: Boolean(row.idempotentReplay),
      };
    },

    async getOrder(orderNumber: string, contactPhone: string): Promise<OrderTrackingSummary | null> {
      return fetchGuestOrder(orderNumber, contactPhone);
    },

    async getOrderTracking(orderNumber: string, contactPhone: string): Promise<OrderTrackingSummary | null> {
      return fetchGuestOrder(orderNumber, contactPhone);
    },

    async cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
      const supabase = getClient();
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, order_number, status, contact_phone, contact_phone_e164, created_at")
        .eq("order_number", input.orderNumber)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "ORDER_LOOKUP_FAILED", error.message);
      }
      if (!order) {
        throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      }

      if (
        !contactPhoneMatchesOrder(
          order.contact_phone,
          order.contact_phone_e164 as string | null,
          input.contactPhone,
        )
      ) {
        throw new ApiError(403, "ORDER_ACCESS_DENIED", "Phone number does not match this order.");
      }

      try {
        assertCustomerCancelAllowed({
          status: order.status,
          createdAt: order.created_at,
        });
      } catch (cancelError) {
        if (cancelError instanceof CustomerCancelNotAllowedError) {
          throw new ApiError(409, cancelError.code, cancelError.message);
        }
        throw cancelError;
      }

      const cancelReasonCode = input.reasonCode?.trim() || "customer_cancelled";
      const cancelNote = input.note?.trim() || null;
      const cancelledAt = new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancel_reason_code: cancelReasonCode,
          cancel_note: cancelNote,
          updated_at: cancelledAt,
        })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("order_number, status")
        .maybeSingle();

      if (updateError) {
        throw new ApiError(500, "ORDER_CANCEL_FAILED", updateError.message);
      }
      if (!updated) {
        throw new ApiError(
          409,
          "ORDER_INVALID_TRANSITION",
          "Order status changed and can no longer be cancelled.",
        );
      }

      await supabase.from("order_status_logs").insert({
        order_id: order.id,
        from_status: "pending",
        to_status: "cancelled",
        actor_type: "guest",
        reason_code: cancelReasonCode,
        note: cancelNote,
      });

      await supabase
        .from("deliveries")
        .update({ status: "cancelled", updated_at: cancelledAt })
        .eq("order_id", order.id)
        .neq("status", "delivered");

      return {
        orderNumber: updated.order_number,
        status: "cancelled",
        cancelledAt,
        cancelReasonCode,
      };
    },
  };
}

export function createUnavailableOrdersDataSource(): OrdersDataSource {
  return {
    async quoteOrder() {
      throw new ApiError(
        503,
        "ORDERS_UNAVAILABLE",
        "Online ordering API is not configured. Use WhatsApp checkout or configure Supabase.",
      );
    },
    async createOrder() {
      throw new ApiError(
        503,
        "ORDERS_UNAVAILABLE",
        "Online ordering API is not configured. Use WhatsApp checkout or configure Supabase.",
      );
    },
    async getOrderTracking() {
      throw new ApiError(503, "ORDERS_UNAVAILABLE", "Order tracking API is not configured.");
    },
    async getOrder() {
      throw new ApiError(503, "ORDERS_UNAVAILABLE", "Order read API is not configured.");
    },
    async cancelOrder() {
      throw new ApiError(503, "ORDERS_UNAVAILABLE", "Order cancellation API is not configured.");
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

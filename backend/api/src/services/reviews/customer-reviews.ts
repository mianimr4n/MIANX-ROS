import { createClient } from "@supabase/supabase-js";

import type { EnvironmentStatus } from "../../config/env.js";
import { ApiError } from "../../common/http.js";

export type ReviewRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export interface CustomerReviewsDataSource {
  listReviews(authUserId: string): Promise<ReviewRecord[]>;
  createReview(
    authUserId: string,
    orderNumber: string,
    input: { rating: number; comment?: string },
  ): Promise<ReviewRecord>;
  updateReview(
    authUserId: string,
    orderNumber: string,
    input: { rating: number; comment?: string },
  ): Promise<ReviewRecord>;
}

type SupabaseLike = { from: (table: string) => any };

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function createUnavailableReviews(): CustomerReviewsDataSource {
  const fail = (): never => {
    throw new ApiError(503, "REVIEWS_UNAVAILABLE", "Reviews are not configured.");
  };
  return { listReviews: fail, createReview: fail, updateReview: fail };
}

export function createCustomerReviewsFromEnv(envStatus: EnvironmentStatus): CustomerReviewsDataSource {
  if (!envStatus.isReady) return createUnavailableReviews();
  const client = createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createCustomerReviewsDataSource(client);
}

function mapReview(row: Record<string, unknown>, orderNumber: string): ReviewRecord {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    orderNumber,
    rating: row.rating as number,
    comment: (row.comment as string | null) ?? null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createCustomerReviewsDataSource(client: SupabaseLike | null): CustomerReviewsDataSource {
  if (!client) return createUnavailableReviews();
  const db = client;

  async function loadOwnedCompletedOrder(authUserId: string, orderNumber: string) {
    const { data, error } = await db
      .from("orders")
      .select("id, order_number, status, auth_user_id")
      .eq("order_number", orderNumber)
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw new ApiError(500, "ORDER_LOOKUP_FAILED", error.message);
    if (!data) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
    if ((data as { status: string }).status !== "completed") {
      throw new ApiError(409, "REVIEW_NOT_ALLOWED", "Only completed orders can be reviewed.");
    }
    return data as { id: string; order_number: string; status: string };
  }

  return {
    async listReviews(authUserId) {
      const { data, error } = await db
        .from("order_reviews")
        .select("id, order_id, rating, comment, status, created_at, updated_at, order:orders(order_number)")
        .eq("auth_user_id", authUserId)
        .order("created_at", { ascending: false });
      if (error) throw new ApiError(500, "REVIEW_LIST_FAILED", error.message);
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const order = Array.isArray(row.order) ? row.order[0] : row.order;
        const orderNumber =
          order && typeof order === "object"
            ? ((order as { order_number?: string }).order_number ?? "")
            : "";
        return mapReview(row, orderNumber);
      });
    },

    async createReview(authUserId, orderNumber, input) {
      if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
        throw new ApiError(400, "VALIDATION_ERROR", "Rating must be an integer from 1 to 5.");
      }
      const order = await loadOwnedCompletedOrder(authUserId, orderNumber);
      const comment = (input.comment ?? "").trim().slice(0, 1000) || null;

      const { data: existing } = await db
        .from("order_reviews")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();
      if (existing) {
        throw new ApiError(409, "REVIEW_EXISTS", "This order already has a review.");
      }

      const { data, error } = await db
        .from("order_reviews")
        .insert({
          order_id: order.id,
          auth_user_id: authUserId,
          rating: input.rating,
          comment,
          status: "visible",
        })
        .select("id, order_id, rating, comment, status, created_at, updated_at")
        .single();
      if (error) throw new ApiError(500, "REVIEW_CREATE_FAILED", error.message);
      return mapReview(data as Record<string, unknown>, order.order_number);
    },

    async updateReview(authUserId, orderNumber, input) {
      if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
        throw new ApiError(400, "VALIDATION_ERROR", "Rating must be an integer from 1 to 5.");
      }
      const order = await loadOwnedCompletedOrder(authUserId, orderNumber);
      const { data: existing, error: lookupError } = await db
        .from("order_reviews")
        .select("id, order_id, rating, comment, status, created_at, updated_at")
        .eq("order_id", order.id)
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (lookupError) throw new ApiError(500, "REVIEW_LOOKUP_FAILED", lookupError.message);
      if (!existing) throw new ApiError(404, "REVIEW_NOT_FOUND", "Review not found.");

      const createdAt = new Date((existing as { created_at: string }).created_at).getTime();
      if (Date.now() - createdAt > EDIT_WINDOW_MS) {
        throw new ApiError(409, "REVIEW_LOCKED", "Reviews can only be edited within 24 hours.");
      }

      const comment = (input.comment ?? "").trim().slice(0, 1000) || null;
      const { data, error } = await db
        .from("order_reviews")
        .update({ rating: input.rating, comment })
        .eq("id", (existing as { id: string }).id)
        .eq("auth_user_id", authUserId)
        .select("id, order_id, rating, comment, status, created_at, updated_at")
        .maybeSingle();
      if (error) throw new ApiError(500, "REVIEW_UPDATE_FAILED", error.message);
      if (!data) throw new ApiError(404, "REVIEW_NOT_FOUND", "Review not found.");
      return mapReview(data as Record<string, unknown>, order.order_number);
    },
  };
}

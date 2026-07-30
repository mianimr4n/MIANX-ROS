import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const COUPON_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

export const COUPON_STATUSES = ["active", "inactive", "expired"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export interface CouponRecord {
  id: string;
  branchId: string | null;
  branchCode: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrder: number;
  expiryDate: string | null;
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  branchId?: string | null;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrder?: number;
  expiryDate?: string | null;
  status?: CouponStatus;
}

export interface MarketingService {
  listCoupons(scope: BranchActorScope, branchId?: string): Promise<CouponRecord[]>;
  createCoupon(scope: BranchActorScope, input: CreateCouponInput): Promise<CouponRecord>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapCoupon(row: Record<string, unknown>): CouponRecord {
  const branch = row.branch as { branch_code?: string } | null;
  return {
    id: String(row.id),
    branchId: (row.branch_id as string | null) ?? null,
    branchCode: branch?.branch_code ?? null,
    code: String(row.code),
    discountType: row.discount_type as CouponDiscountType,
    discountValue: Number(row.discount_value),
    minOrder: Number(row.min_order) || 0,
    expiryDate: (row.expiry_date as string | null) ?? null,
    status: row.status as CouponStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const COUPON_SELECT =
  "id, branch_id, code, discount_type, discount_value, min_order, expiry_date, status, created_at, updated_at, branch:branches(id, branch_code)";

export function createMarketingService(envStatus: EnvironmentStatus): MarketingService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listCoupons(scope, branchId) {
      if (branchId) assertBranchMembership(scope, branchId);
      const client = supabase();
      let query = client.from("coupons").select(COUPON_SELECT).order("created_at", { ascending: false });

      if (branchId) {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) return [];
        query = query.or(`branch_id.in.(${scope.branchIds.join(",")}),branch_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throwMappedDbError("COUPONS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapCoupon);
    },

    async createCoupon(scope, input) {
      if (input.branchId) {
        assertBranchMembership(scope, input.branchId);
        await loadBranchRow(supabase(), input.branchId);
      }

      const code = input.code.trim().toUpperCase();
      if (!code) throw new ApiError(400, "VALIDATION_ERROR", "Coupon code is required.");
      if (input.discountType === "percent" && input.discountValue > 100) {
        throw new ApiError(400, "VALIDATION_ERROR", "Percent discount cannot exceed 100.");
      }

      const { data, error } = await supabase()
        .from("coupons")
        .insert({
          branch_id: input.branchId || null,
          code,
          discount_type: input.discountType,
          discount_value: input.discountValue,
          min_order: input.minOrder ?? 0,
          expiry_date: input.expiryDate || null,
          status: input.status ?? "active",
        })
        .select(COUPON_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "COUPON_CODE_EXISTS", "A coupon with this code already exists.");
        }
        throwMappedDbError("COUPON_CREATE_FAILED", error);
      }
      return mapCoupon(data as unknown as Record<string, unknown>);
    },
  };
}

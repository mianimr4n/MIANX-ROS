import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";
import type { BranchActorScope } from "../tables/management.js";

export const SUPPLIER_STATUSES = ["active", "inactive"] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export interface SupplierRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  supplierId: string;
  supplierName: string | null;
  poNumber: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  expectedDeliveryDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  branchId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status?: SupplierStatus;
}

export interface CreatePurchaseOrderInput {
  branchId: string;
  supplierId: string;
  poNumber?: string | null;
  status?: PurchaseOrderStatus;
  totalAmount?: number;
  expectedDeliveryDate?: string | null;
}

export interface PurchasingService {
  listSuppliers(scope: BranchActorScope, branchId?: string): Promise<SupplierRecord[]>;
  createSupplier(scope: BranchActorScope, input: CreateSupplierInput): Promise<SupplierRecord>;
  listOrders(scope: BranchActorScope, branchId?: string): Promise<PurchaseOrderRecord[]>;
  createOrder(
    scope: BranchActorScope,
    actorUserId: string | null,
    input: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrderRecord>;
}

type SupplierRow = {
  id: string;
  branch_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
};

type PurchaseOrderRow = {
  id: string;
  branch_id: string;
  supplier_id: string;
  po_number: string;
  status: string;
  total_amount: number | string;
  expected_delivery_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
  supplier: { id: string; name: string } | null;
};

const SUPPLIER_SELECT =
  "id, branch_id, name, contact_person, phone, email, address, status, created_at, updated_at, branch:branches(id, branch_code, name)";

const ORDER_SELECT =
  "id, branch_id, supplier_id, po_number, status, total_amount, expected_delivery_date, created_by, created_at, updated_at, branch:branches(id, branch_code, name), supplier:suppliers(id, name)";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapSupplier(row: SupplierRow): SupplierRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status as SupplierStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrder(row: PurchaseOrderRow): PurchaseOrderRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    supplierId: row.supplier_id,
    supplierName: row.supplier?.name ?? null,
    poNumber: row.po_number,
    status: row.status as PurchaseOrderStatus,
    totalAmount: asNumber(row.total_amount),
    expectedDeliveryDate: row.expected_delivery_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

function generatePoNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `PO-${stamp}-${suffix}`;
}

export function createPurchasingService(envStatus: EnvironmentStatus): PurchasingService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listSuppliers(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      let query = client.from("suppliers").select(SUPPLIER_SELECT).order("name", { ascending: true });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);

      const { data, error } = await query;
      if (error) throw new ApiError(500, "SUPPLIERS_READ_FAILED", error.message);
      return ((data ?? []) as unknown as SupplierRow[]).map(mapSupplier);
    },

    async createSupplier(scope, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const name = input.name.trim();
      if (!name) throw new ApiError(400, "VALIDATION_ERROR", "Supplier name is required.");

      const { data, error } = await client
        .from("suppliers")
        .insert({
          branch_id: input.branchId,
          name,
          contact_person: input.contactPerson?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim().toLowerCase() || null,
          address: input.address?.trim() || null,
          status: input.status ?? "active",
        })
        .select(SUPPLIER_SELECT)
        .single();

      if (error) throw new ApiError(500, "SUPPLIER_CREATE_FAILED", error.message);
      return mapSupplier(data as unknown as SupplierRow);
    },

    async listOrders(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      let query = client
        .from("purchase_orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);

      const { data, error } = await query;
      if (error) throw new ApiError(500, "PURCHASE_ORDERS_READ_FAILED", error.message);
      return ((data ?? []) as unknown as PurchaseOrderRow[]).map(mapOrder);
    },

    async createOrder(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const { data: supplier, error: supplierError } = await client
        .from("suppliers")
        .select("id, branch_id, status")
        .eq("id", input.supplierId)
        .maybeSingle();
      if (supplierError) throw new ApiError(500, "SUPPLIER_READ_FAILED", supplierError.message);
      if (!supplier) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier not found.");
      if (supplier.branch_id !== input.branchId) {
        throw new ApiError(400, "VALIDATION_ERROR", "Supplier must belong to the same branch as the purchase order.");
      }

      const poNumber = (input.poNumber?.trim() || generatePoNumber()).toUpperCase();
      const totalAmount = input.totalAmount ?? 0;
      if (totalAmount < 0) throw new ApiError(400, "VALIDATION_ERROR", "totalAmount cannot be negative.");

      const { data, error } = await client
        .from("purchase_orders")
        .insert({
          branch_id: input.branchId,
          supplier_id: input.supplierId,
          po_number: poNumber,
          status: input.status ?? "draft",
          total_amount: totalAmount,
          expected_delivery_date: input.expectedDeliveryDate || null,
          created_by: actorUserId,
        })
        .select(ORDER_SELECT)
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ApiError(409, "PO_NUMBER_EXISTS", "A purchase order with this number already exists for the branch.");
        }
        throw new ApiError(500, "PURCHASE_ORDER_CREATE_FAILED", error.message);
      }
      return mapOrder(data as unknown as PurchaseOrderRow);
    },
  };
}

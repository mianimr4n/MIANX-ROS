import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
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
  "rejected",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_APPROVAL_DECISIONS = ["approved", "rejected"] as const;
export type PurchaseOrderApprovalDecision = (typeof PURCHASE_ORDER_APPROVAL_DECISIONS)[number];

export interface DecidePurchaseOrderApprovalInput {
  decision: PurchaseOrderApprovalDecision;
  notes?: string | null;
}

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

export const REQUISITION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "converted",
  "cancelled",
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const GOODS_RECEIVING_STATUSES = ["draft", "posted", "cancelled"] as const;
export type GoodsReceivingStatus = (typeof GOODS_RECEIVING_STATUSES)[number];

export interface PurchaseRequisitionRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  title: string;
  status: RequisitionStatus;
  notes: string | null;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceivingRecord {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  purchaseOrderId: string | null;
  poNumber: string | null;
  grnNumber: string;
  status: GoodsReceivingStatus;
  receivedAt: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  postedLines?: Array<{
    lineId: string;
    inventoryItemId: string;
    quantity: number;
    movementId: string;
    currentStock: number;
  }>;
  skippedLines?: Array<{
    inventoryItemId: string | null;
    quantity?: number;
    reason: string;
  }>;
}

export interface CreateRequisitionInput {
  branchId: string;
  title: string;
  notes?: string | null;
  status?: RequisitionStatus;
}

export interface CreateGoodsReceivingLineInput {
  inventoryItemId?: string | null;
  quantity: number;
}

export interface CreateGoodsReceivingInput {
  branchId: string;
  purchaseOrderId?: string | null;
  grnNumber?: string | null;
  status?: GoodsReceivingStatus;
  notes?: string | null;
  receivedAt?: string | null;
  /** Optional mapped lines — posts stock atomically when inventory item exists. */
  lines?: CreateGoodsReceivingLineInput[];
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
  decideOrderApproval(
    scope: BranchActorScope,
    actorUserId: string | null,
    orderId: string,
    input: DecidePurchaseOrderApprovalInput,
  ): Promise<PurchaseOrderRecord>;
  listRequisitions(scope: BranchActorScope, branchId?: string): Promise<PurchaseRequisitionRecord[]>;
  createRequisition(
    scope: BranchActorScope,
    actorUserId: string | null,
    input: CreateRequisitionInput,
  ): Promise<PurchaseRequisitionRecord>;
  listReceiving(scope: BranchActorScope, branchId?: string): Promise<GoodsReceivingRecord[]>;
  createReceiving(
    scope: BranchActorScope,
    actorUserId: string | null,
    input: CreateGoodsReceivingInput,
  ): Promise<GoodsReceivingRecord>;
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

type RequisitionRow = {
  id: string;
  branch_id: string;
  title: string;
  status: string;
  notes: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
};

type GoodsReceivingRow = {
  id: string;
  branch_id: string;
  purchase_order_id: string | null;
  grn_number: string;
  status: string;
  received_at: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branch: { id: string; branch_code: string; name: string } | null;
  purchase_order: { id: string; po_number: string } | null;
};

const SUPPLIER_SELECT =
  "id, branch_id, name, contact_person, phone, email, address, status, created_at, updated_at, branch:branches(id, branch_code, name)";

const ORDER_SELECT =
  "id, branch_id, supplier_id, po_number, status, total_amount, expected_delivery_date, created_by, created_at, updated_at, branch:branches(id, branch_code, name), supplier:suppliers(id, name)";

const REQUISITION_SELECT =
  "id, branch_id, title, status, notes, requested_by, created_at, updated_at, branch:branches(id, branch_code, name)";

const RECEIVING_SELECT =
  "id, branch_id, purchase_order_id, grn_number, status, received_at, notes, created_by, created_at, updated_at, branch:branches(id, branch_code, name), purchase_order:purchase_orders(id, po_number)";

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

function mapRequisition(row: RequisitionRow): PurchaseRequisitionRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    title: row.title,
    status: row.status as RequisitionStatus,
    notes: row.notes,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReceiving(row: GoodsReceivingRow): GoodsReceivingRecord {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchCode: row.branch?.branch_code ?? null,
    branchName: row.branch?.name ?? null,
    purchaseOrderId: row.purchase_order_id,
    poNumber: row.purchase_order?.po_number ?? null,
    grnNumber: row.grn_number,
    status: row.status as GoodsReceivingStatus,
    receivedAt: row.received_at,
    notes: row.notes,
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

function generateGrnNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `GRN-${stamp}-${suffix}`;
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
      if (error) throwMappedDbError("SUPPLIERS_READ_FAILED", error);
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

      if (error) throwMappedDbError("SUPPLIER_CREATE_FAILED", error);
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
      if (error) throwMappedDbError("PURCHASE_ORDERS_READ_FAILED", error);
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
      if (supplierError) throwMappedDbError("SUPPLIER_READ_FAILED", supplierError);
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
        throwMappedDbError("PURCHASE_ORDER_CREATE_FAILED", error);
      }
      return mapOrder(data as unknown as PurchaseOrderRow);
    },

    async decideOrderApproval(scope, actorUserId, orderId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("purchase_orders")
        .select("id, branch_id, status")
        .eq("id", orderId)
        .maybeSingle();
      if (readError) throwMappedDbError("PURCHASE_ORDER_READ_FAILED", readError);
      if (!existing) throw new ApiError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order not found.");

      assertBranchMembership(scope, existing.branch_id);

      const current = existing.status as PurchaseOrderStatus;
      if (current !== "draft" && current !== "submitted") {
        throw new ApiError(
          409,
          "PO_NOT_PENDING_APPROVAL",
          `Purchase order status '${current}' cannot be approved or rejected.`,
        );
      }

      const nextStatus: PurchaseOrderStatus = input.decision === "approved" ? "approved" : "rejected";
      const { data, error } = await client
        .from("purchase_orders")
        .update({
          status: nextStatus,
          approved_by: actorUserId,
          approved_at: new Date().toISOString(),
          approval_notes: input.notes?.trim() || null,
        })
        .eq("id", orderId)
        .select(ORDER_SELECT)
        .single();

      if (error) throwMappedDbError("PURCHASE_ORDER_APPROVAL_FAILED", error);
      return mapOrder(data as unknown as PurchaseOrderRow);
    },

    async listRequisitions(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      let query = client
        .from("purchase_requisitions")
        .select(REQUISITION_SELECT)
        .order("created_at", { ascending: false });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);

      const { data, error } = await query;
      if (error) throwMappedDbError("REQUISITIONS_READ_FAILED", error);
      return ((data ?? []) as unknown as RequisitionRow[]).map(mapRequisition);
    },

    async createRequisition(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);

      const title = input.title.trim();
      if (!title) throw new ApiError(400, "VALIDATION_ERROR", "Requisition title is required.");

      const { data, error } = await client
        .from("purchase_requisitions")
        .insert({
          branch_id: input.branchId,
          title,
          notes: input.notes?.trim() || null,
          status: input.status ?? "draft",
          requested_by: actorUserId,
        })
        .select(REQUISITION_SELECT)
        .single();

      if (error) throwMappedDbError("REQUISITION_CREATE_FAILED", error);
      return mapRequisition(data as unknown as RequisitionRow);
    },

    async listReceiving(scope, branchId) {
      const branchScope = resolveListBranchIds(scope, branchId);
      if (branchScope === "none") return [];

      const client = supabase();
      let query = client
        .from("goods_receiving")
        .select(RECEIVING_SELECT)
        .order("created_at", { ascending: false });
      if (branchScope !== "all") query = query.in("branch_id", branchScope);

      const { data, error } = await query;
      if (error) throwMappedDbError("GOODS_RECEIVING_READ_FAILED", error);
      return ((data ?? []) as unknown as GoodsReceivingRow[]).map(mapReceiving);
    },

    async createReceiving(scope, actorUserId, input) {
      assertBranchMembership(scope, input.branchId);
      const client = supabase();
      await loadBranchRow(client, input.branchId);

      if (input.purchaseOrderId) {
        const { data: po, error: poError } = await client
          .from("purchase_orders")
          .select("id, branch_id, po_number")
          .eq("id", input.purchaseOrderId)
          .maybeSingle();
        if (poError) throwMappedDbError("PURCHASE_ORDER_READ_FAILED", poError);
        if (!po) throw new ApiError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order not found.");
        if (po.branch_id !== input.branchId) {
          throw new ApiError(400, "VALIDATION_ERROR", "Purchase order must belong to the same branch as the GRN.");
        }
      }

      const grnNumber = (input.grnNumber?.trim() || generateGrnNumber()).toUpperCase();
      const status = input.status ?? "posted";
      const lines = (input.lines ?? []).map((line) => ({
        inventoryItemId: line.inventoryItemId ?? null,
        quantity: line.quantity,
      }));

      const { data, error } = await client.rpc("create_goods_receiving_with_stock_atomic", {
        p_branch_id: input.branchId,
        p_purchase_order_id: input.purchaseOrderId || null,
        p_grn_number: grnNumber,
        p_status: status,
        p_notes: input.notes?.trim() || null,
        p_received_at: input.receivedAt || null,
        p_actor_user_id: actorUserId,
        p_lines: lines,
      });

      if (error) {
        const message = error.message ?? "Atomic GRN create failed.";
        if (/GRN_NUMBER_EXISTS|duplicate key|unique/i.test(message)) {
          throw new ApiError(409, "GRN_NUMBER_EXISTS", "A GRN with this number already exists for the branch.");
        }
        if (/PURCHASE_ORDER_NOT_FOUND/i.test(message)) {
          throw new ApiError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order not found.");
        }
        if (/PO_BRANCH_MISMATCH|LINE_BRANCH_MISMATCH/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Purchase order / line must belong to the same branch as the GRN.");
        }
        if (/GRN_STATUS_INVALID/i.test(message)) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid GRN status.");
        }
        throw new ApiError(500, "GOODS_RECEIVING_CREATE_FAILED", message);
      }

      const payload = data as {
        id: string;
        branchId: string;
        purchaseOrderId: string | null;
        grnNumber: string;
        status: string;
        receivedAt: string;
        notes: string | null;
        createdBy: string | null;
        createdAt: string;
        updatedAt: string;
        postedLines?: Array<{
          lineId: string;
          inventoryItemId: string;
          quantity: number;
          movementId: string;
          currentStock: number;
        }>;
        skippedLines?: Array<{
          inventoryItemId: string | null;
          quantity?: number;
          reason: string;
        }>;
      } | null;

      if (!payload?.id) {
        throw new ApiError(500, "GOODS_RECEIVING_CREATE_FAILED", "Atomic GRN create returned no payload.");
      }

      // Re-read with branch/PO embeds for response honesty.
      const { data: row, error: readError } = await client
        .from("goods_receiving")
        .select(RECEIVING_SELECT)
        .eq("id", payload.id)
        .maybeSingle();
      if (readError) throwMappedDbError("GOODS_RECEIVING_READ_FAILED", readError);
      if (!row) {
        throw new ApiError(500, "GOODS_RECEIVING_CREATE_FAILED", "GRN was created but could not be reloaded.");
      }

      const record = mapReceiving(row as unknown as GoodsReceivingRow);
      return {
        ...record,
        postedLines: payload.postedLines ?? [],
        skippedLines: payload.skippedLines ?? [],
      };
    },
  };
}

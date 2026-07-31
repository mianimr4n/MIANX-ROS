import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";

export const SUPPLIER_RESPONSE_TYPES = [
  "acknowledge",
  "accept",
  "request_amendment",
  "reject",
] as const;
export type SupplierResponseType = (typeof SUPPLIER_RESPONSE_TYPES)[number];

export const SUPPLIER_DOCUMENT_TYPES = [
  "invoice",
  "delivery_note",
  "tax_document",
  "contract",
  "quality_certificate",
  "other",
] as const;
export type SupplierDocumentType = (typeof SUPPLIER_DOCUMENT_TYPES)[number];

export const DELIVERY_REF_STATUSES = [
  "awaiting_receipt",
  "dispatched",
  "partial",
  "delivered_pending_grn",
  "discrepancy_noted",
] as const;
export type DeliveryRefStatus = (typeof DELIVERY_REF_STATUSES)[number];

/** PO statuses visible to suppliers (never draft / cancelled / rejected staff decisions alone). */
const PORTAL_VISIBLE_PO_STATUSES = [
  "submitted",
  "approved",
  "ordered",
  "partially_received",
  "received",
] as const;

const RESPONSE_STATUS_MAP: Record<
  SupplierResponseType,
  "acknowledged" | "accepted" | "amendment_requested" | "rejected"
> = {
  acknowledge: "acknowledged",
  accept: "accepted",
  request_amendment: "amendment_requested",
  reject: "rejected",
};

export interface SupplierPortalContext {
  userId: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  approvalStatus: string;
}

export interface PortalPurchaseOrder {
  id: string;
  branchId: string;
  branchCode: string | null;
  branchName: string | null;
  supplierId: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  expectedDeliveryDate: string | null;
  supplierResponseStatus: string | null;
  supplierConfirmedDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: PortalPurchaseOrderLine[];
  latestResponse: PortalPurchaseOrderResponse | null;
}

export interface PortalPurchaseOrderLine {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  skuRef: string | null;
}

export interface PortalPurchaseOrderResponse {
  id: string;
  purchaseOrderId: string;
  responseType: SupplierResponseType;
  reason: string | null;
  confirmedDeliveryDate: string | null;
  createdAt: string;
}

export interface PortalDocument {
  id: string;
  supplierId: string;
  branchId: string;
  purchaseOrderId: string | null;
  documentType: SupplierDocumentType;
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface PortalDeliveryRef {
  id: string;
  purchaseOrderId: string;
  dispatchNote: string | null;
  invoiceReference: string | null;
  expectedDelivery: string | null;
  receivingStatus: DeliveryRefStatus;
  discrepancyNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPerformanceSnapshot {
  orderCount: number;
  outstandingBalance: number | null;
  outstandingBalanceUnavailableReason: string | null;
  onTimeDelivery: null;
  onTimeDeliveryUnavailableReason: string;
  acceptedQuantity: null;
  rejectedQuantity: null;
  quantityUnavailableReason: string;
  invoiceDiscrepancies: number | null;
}

export interface SupplierAttentionSnapshot {
  unacknowledgedPurchaseOrders: number;
  delayedExpectedDeliveries: number;
  invoiceGrnMismatches: number;
}

export interface SupplierPortalService {
  resolveContext(principal: AuthPrincipal): Promise<SupplierPortalContext>;
  getProfile(ctx: SupplierPortalContext): Promise<Record<string, unknown>>;
  listOrders(ctx: SupplierPortalContext): Promise<PortalPurchaseOrder[]>;
  getOrder(ctx: SupplierPortalContext, orderId: string): Promise<PortalPurchaseOrder>;
  respondToOrder(
    ctx: SupplierPortalContext,
    orderId: string,
    input: {
      responseType: SupplierResponseType;
      reason?: string | null;
      confirmedDeliveryDate?: string | null;
    },
  ): Promise<PortalPurchaseOrder>;
  listDocuments(ctx: SupplierPortalContext): Promise<PortalDocument[]>;
  createDocument(
    ctx: SupplierPortalContext,
    input: {
      documentType: SupplierDocumentType;
      title: string;
      fileUrl: string;
      purchaseOrderId?: string | null;
    },
  ): Promise<PortalDocument>;
  upsertDeliveryRef(
    ctx: SupplierPortalContext,
    orderId: string,
    input: {
      dispatchNote?: string | null;
      invoiceReference?: string | null;
      expectedDelivery?: string | null;
      receivingStatus?: DeliveryRefStatus;
      discrepancyNotes?: string | null;
    },
  ): Promise<PortalDeliveryRef>;
  getPerformance(ctx: SupplierPortalContext): Promise<SupplierPerformanceSnapshot>;

  /** Admin: provision supplier portal user (service-role auth create). */
  provisionPortalUser(
    scope: BranchActorScope,
    actorUserId: string,
    supplierId: string,
    input: { email: string; fullName: string; temporaryPassword: string },
  ): Promise<{ userId: string; email: string; supplierId: string }>;
  listPortalUsers(
    scope: BranchActorScope,
    supplierId: string,
  ): Promise<Array<{ id: string; userId: string; status: string; email: string | null }>>;
  replaceOrderLines(
    scope: BranchActorScope,
    orderId: string,
    lines: Array<{ description: string; quantity: number; unitPrice: number; skuRef?: string | null }>,
  ): Promise<PortalPurchaseOrderLine[]>;
  updateSupplierProfile(
    scope: BranchActorScope,
    supplierId: string,
    input: Partial<{
      taxId: string | null;
      businessRegistration: string | null;
      paymentTerms: string | null;
      suppliedCategories: string[];
      approvalStatus: "pending" | "approved" | "suspended";
      notes: string | null;
      contactPerson: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      status: "active" | "inactive";
    }>,
  ): Promise<Record<string, unknown>>;
  getSupplierAttention(scope: BranchActorScope, branchId?: string): Promise<SupplierAttentionSnapshot>;
}

function clientFrom(env: EnvironmentStatus): SupabaseClient {
  if (!env.config.supabaseUrl || !env.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(env.config.supabaseUrl, env.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function writeAudit(
  client: SupabaseClient,
  entry: {
    supplierId?: string | null;
    purchaseOrderId?: string | null;
    actorUserId: string;
    eventType: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await client.from("supplier_portal_events").insert({
    supplier_id: entry.supplierId ?? null,
    purchase_order_id: entry.purchaseOrderId ?? null,
    actor_user_id: entry.actorUserId,
    event_type: entry.eventType,
    payload: entry.payload ?? {},
  });
  if (error) throwMappedDbError("SUPPLIER_PORTAL_AUDIT_WRITE_FAILED", error);
}

function mapLine(row: Record<string, unknown>): PortalPurchaseOrderLine {
  return {
    id: String(row.id),
    lineNumber: Number(row.line_number),
    description: String(row.description),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    skuRef: row.sku_ref == null ? null : String(row.sku_ref),
  };
}

function mapResponse(row: Record<string, unknown> | null): PortalPurchaseOrderResponse | null {
  if (!row) return null;
  return {
    id: String(row.id),
    purchaseOrderId: String(row.purchase_order_id),
    responseType: row.response_type as SupplierResponseType,
    reason: row.reason == null ? null : String(row.reason),
    confirmedDeliveryDate:
      row.confirmed_delivery_date == null ? null : String(row.confirmed_delivery_date),
    createdAt: String(row.created_at),
  };
}

function mapDocument(row: Record<string, unknown>): PortalDocument {
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id),
    branchId: String(row.branch_id),
    purchaseOrderId: row.purchase_order_id == null ? null : String(row.purchase_order_id),
    documentType: row.document_type as SupplierDocumentType,
    title: String(row.title),
    fileUrl: String(row.file_url),
    uploadedAt: String(row.uploaded_at),
  };
}

function mapDeliveryRef(row: Record<string, unknown>): PortalDeliveryRef {
  return {
    id: String(row.id),
    purchaseOrderId: String(row.purchase_order_id),
    dispatchNote: row.dispatch_note == null ? null : String(row.dispatch_note),
    invoiceReference: row.invoice_reference == null ? null : String(row.invoice_reference),
    expectedDelivery: row.expected_delivery == null ? null : String(row.expected_delivery),
    receivingStatus: row.receiving_status as DeliveryRefStatus,
    discrepancyNotes: row.discrepancy_notes == null ? null : String(row.discrepancy_notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function createSupplierPortalService(envStatus: EnvironmentStatus): SupplierPortalService {
  const supabase = () => clientFrom(envStatus);

  async function loadOrderBundle(
    client: SupabaseClient,
    supplierId: string,
    orderId: string,
  ): Promise<PortalPurchaseOrder> {
    const { data: po, error } = await client
      .from("purchase_orders")
      .select(
        "id, branch_id, supplier_id, po_number, status, total_amount, expected_delivery_date, supplier_response_status, supplier_confirmed_delivery_date, notes, created_at, updated_at, branch:branches(branch_code, name)",
      )
      .eq("id", orderId)
      .eq("supplier_id", supplierId)
      .maybeSingle();
    if (error) throwMappedDbError("PURCHASE_ORDER_READ_FAILED", error);
    if (!po) throw new ApiError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order not found.");

    if (!PORTAL_VISIBLE_PO_STATUSES.includes(po.status as (typeof PORTAL_VISIBLE_PO_STATUSES)[number])) {
      throw new ApiError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order not found.");
    }

    const [{ data: lines, error: linesError }, { data: responses, error: respError }] =
      await Promise.all([
        client
          .from("purchase_order_lines")
          .select("id, line_number, description, quantity, unit_price, sku_ref")
          .eq("purchase_order_id", orderId)
          .order("line_number", { ascending: true }),
        client
          .from("purchase_order_responses")
          .select(
            "id, purchase_order_id, response_type, reason, confirmed_delivery_date, created_at",
          )
          .eq("purchase_order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
    if (linesError) throwMappedDbError("PURCHASE_ORDER_LINES_READ_FAILED", linesError);
    if (respError) throwMappedDbError("PURCHASE_ORDER_RESPONSES_READ_FAILED", respError);

    const branch = po.branch as { branch_code?: string; name?: string } | null;
    return {
      id: String(po.id),
      branchId: String(po.branch_id),
      branchCode: branch?.branch_code ?? null,
      branchName: branch?.name ?? null,
      supplierId: String(po.supplier_id),
      poNumber: String(po.po_number),
      status: String(po.status),
      totalAmount: Number(po.total_amount),
      expectedDeliveryDate:
        po.expected_delivery_date == null ? null : String(po.expected_delivery_date),
      supplierResponseStatus:
        po.supplier_response_status == null ? null : String(po.supplier_response_status),
      supplierConfirmedDeliveryDate:
        po.supplier_confirmed_delivery_date == null
          ? null
          : String(po.supplier_confirmed_delivery_date),
      notes: po.notes == null ? null : String(po.notes),
      createdAt: String(po.created_at),
      updatedAt: String(po.updated_at),
      lines: ((lines ?? []) as Record<string, unknown>[]).map(mapLine),
      latestResponse: mapResponse((responses?.[0] as Record<string, unknown>) ?? null),
    };
  }

  const service: SupplierPortalService = {
    async resolveContext(principal) {
      if (principal.userType !== "supplier" && !principal.permissions.includes("supplier.portal")) {
        throw new ApiError(403, "SUPPLIER_PORTAL_FORBIDDEN", "Supplier portal access required.");
      }
      const client = supabase();
      const { data, error } = await client
        .from("supplier_portal_users")
        .select(
          "supplier_id, status, supplier:suppliers(id, name, branch_id, approval_status, status)",
        )
        .eq("user_id", principal.userId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throwMappedDbError("SUPPLIER_PORTAL_CONTEXT_FAILED", error);
      if (!data) {
        throw new ApiError(
          403,
          "SUPPLIER_PORTAL_NOT_LINKED",
          "No active supplier portal linkage for this account.",
        );
      }
      const supplierRaw = data.supplier as unknown;
      const supplier = (Array.isArray(supplierRaw) ? supplierRaw[0] : supplierRaw) as {
        id: string;
        name: string;
        branch_id: string;
        approval_status: string;
        status: string;
      } | null;
      if (!supplier || supplier.status !== "active") {
        throw new ApiError(403, "SUPPLIER_INACTIVE", "Supplier is inactive.");
      }
      if (supplier.approval_status === "suspended") {
        throw new ApiError(403, "SUPPLIER_SUSPENDED", "Supplier portal access is suspended.");
      }
      return {
        userId: principal.userId,
        supplierId: String(data.supplier_id),
        supplierName: supplier.name,
        branchId: supplier.branch_id,
        approvalStatus: supplier.approval_status,
      };
    },

    async getProfile(ctx) {
      const client = supabase();
      const { data, error } = await client
        .from("suppliers")
        .select(
          "id, branch_id, name, contact_person, phone, email, address, status, tax_id, business_registration, payment_terms, supplied_categories, approval_status, notes, created_at, updated_at",
        )
        .eq("id", ctx.supplierId)
        .single();
      if (error) throwMappedDbError("SUPPLIER_READ_FAILED", error);
      return {
        id: data.id,
        branchId: data.branch_id,
        name: data.name,
        contactPerson: data.contact_person,
        phone: data.phone,
        email: data.email,
        address: data.address,
        status: data.status,
        taxId: data.tax_id,
        businessRegistration: data.business_registration,
        paymentTerms: data.payment_terms,
        suppliedCategories: data.supplied_categories ?? [],
        approvalStatus: data.approval_status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },

    async listOrders(ctx) {
      const client = supabase();
      const { data, error } = await client
        .from("purchase_orders")
        .select("id")
        .eq("supplier_id", ctx.supplierId)
        .in("status", [...PORTAL_VISIBLE_PO_STATUSES])
        .order("created_at", { ascending: false });
      if (error) throwMappedDbError("PURCHASE_ORDERS_READ_FAILED", error);
      const orders: PortalPurchaseOrder[] = [];
      for (const row of data ?? []) {
        orders.push(await loadOrderBundle(client, ctx.supplierId, String(row.id)));
      }
      return orders;
    },

    async getOrder(ctx, orderId) {
      return loadOrderBundle(supabase(), ctx.supplierId, orderId);
    },

    async respondToOrder(ctx, orderId, input) {
      const client = supabase();
      const order = await loadOrderBundle(client, ctx.supplierId, orderId);

      if (input.responseType === "reject" || input.responseType === "request_amendment") {
        if (!input.reason?.trim()) {
          throw new ApiError(
            400,
            "VALIDATION_ERROR",
            "reason is required for reject and request_amendment.",
          );
        }
      }

      // Suppliers never approve POs internally — only record a response.
      const { data: inserted, error: insertError } = await client
        .from("purchase_order_responses")
        .insert({
          purchase_order_id: orderId,
          supplier_id: ctx.supplierId,
          response_type: input.responseType,
          reason: input.reason?.trim() || null,
          confirmed_delivery_date: input.confirmedDeliveryDate || null,
          created_by: ctx.userId,
        })
        .select(
          "id, purchase_order_id, response_type, reason, confirmed_delivery_date, created_at",
        )
        .single();
      if (insertError) throwMappedDbError("PURCHASE_ORDER_RESPONSE_CREATE_FAILED", insertError);

      const nextStatus = RESPONSE_STATUS_MAP[input.responseType];
      const { error: updateError } = await client
        .from("purchase_orders")
        .update({
          supplier_response_status: nextStatus,
          supplier_confirmed_delivery_date:
            input.confirmedDeliveryDate || order.supplierConfirmedDeliveryDate,
        })
        .eq("id", orderId)
        .eq("supplier_id", ctx.supplierId);
      if (updateError) throwMappedDbError("PURCHASE_ORDER_UPDATE_FAILED", updateError);

      await writeAudit(client, {
        supplierId: ctx.supplierId,
        purchaseOrderId: orderId,
        actorUserId: ctx.userId,
        eventType: "po_response",
        payload: {
          responseType: input.responseType,
          responseId: inserted.id,
          // Explicit: response is not internal approval
          grantsInternalApproval: false,
        },
      });

      return loadOrderBundle(client, ctx.supplierId, orderId);
    },

    async listDocuments(ctx) {
      const client = supabase();
      const { data, error } = await client
        .from("supplier_documents")
        .select(
          "id, supplier_id, branch_id, purchase_order_id, document_type, title, file_url, uploaded_at",
        )
        .eq("supplier_id", ctx.supplierId)
        .order("uploaded_at", { ascending: false });
      if (error) throwMappedDbError("SUPPLIER_DOCUMENTS_READ_FAILED", error);
      return ((data ?? []) as Record<string, unknown>[]).map(mapDocument);
    },

    async createDocument(ctx, input) {
      const client = supabase();
      if (input.purchaseOrderId) {
        await loadOrderBundle(client, ctx.supplierId, input.purchaseOrderId);
      }
      const title = input.title.trim();
      const fileUrl = input.fileUrl.trim();
      if (!title || !fileUrl) {
        throw new ApiError(400, "VALIDATION_ERROR", "title and fileUrl are required.");
      }
      if (!/^https?:\/\//i.test(fileUrl)) {
        throw new ApiError(400, "VALIDATION_ERROR", "fileUrl must be an http(s) URL reference.");
      }

      const { data, error } = await client
        .from("supplier_documents")
        .insert({
          supplier_id: ctx.supplierId,
          branch_id: ctx.branchId,
          purchase_order_id: input.purchaseOrderId || null,
          document_type: input.documentType,
          title,
          file_url: fileUrl,
          uploaded_by: ctx.userId,
        })
        .select(
          "id, supplier_id, branch_id, purchase_order_id, document_type, title, file_url, uploaded_at",
        )
        .single();
      if (error) throwMappedDbError("SUPPLIER_DOCUMENT_CREATE_FAILED", error);

      await writeAudit(client, {
        supplierId: ctx.supplierId,
        purchaseOrderId: input.purchaseOrderId || null,
        actorUserId: ctx.userId,
        eventType: "document_uploaded",
        payload: { documentId: data.id, documentType: input.documentType },
      });

      return mapDocument(data as Record<string, unknown>);
    },

    async upsertDeliveryRef(ctx, orderId, input) {
      const client = supabase();
      await loadOrderBundle(client, ctx.supplierId, orderId);

      const { data: existing, error: readError } = await client
        .from("purchase_order_delivery_refs")
        .select("id")
        .eq("purchase_order_id", orderId)
        .eq("supplier_id", ctx.supplierId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (readError) throwMappedDbError("DELIVERY_REF_READ_FAILED", readError);

      const payload = {
        purchase_order_id: orderId,
        supplier_id: ctx.supplierId,
        dispatch_note: input.dispatchNote?.trim() || null,
        invoice_reference: input.invoiceReference?.trim() || null,
        expected_delivery: input.expectedDelivery || null,
        receiving_status: input.receivingStatus ?? "dispatched",
        discrepancy_notes: input.discrepancyNotes?.trim() || null,
        created_by: ctx.userId,
      };

      let row: Record<string, unknown>;
      if (existing?.id) {
        const { data, error } = await client
          .from("purchase_order_delivery_refs")
          .update({
            dispatch_note: payload.dispatch_note,
            invoice_reference: payload.invoice_reference,
            expected_delivery: payload.expected_delivery,
            receiving_status: payload.receiving_status,
            discrepancy_notes: payload.discrepancy_notes,
          })
          .eq("id", existing.id)
          .select(
            "id, purchase_order_id, dispatch_note, invoice_reference, expected_delivery, receiving_status, discrepancy_notes, created_at, updated_at",
          )
          .single();
        if (error) throwMappedDbError("DELIVERY_REF_UPDATE_FAILED", error);
        row = data as Record<string, unknown>;
      } else {
        const { data, error } = await client
          .from("purchase_order_delivery_refs")
          .insert(payload)
          .select(
            "id, purchase_order_id, dispatch_note, invoice_reference, expected_delivery, receiving_status, discrepancy_notes, created_at, updated_at",
          )
          .single();
        if (error) throwMappedDbError("DELIVERY_REF_CREATE_FAILED", error);
        row = data as Record<string, unknown>;
      }

      await writeAudit(client, {
        supplierId: ctx.supplierId,
        purchaseOrderId: orderId,
        actorUserId: ctx.userId,
        eventType: "delivery_ref_upserted",
        payload: { deliveryRefId: row.id, receivingStatus: row.receiving_status },
      });

      return mapDeliveryRef(row);
    },

    async getPerformance(ctx) {
      const client = supabase();
      const { data: orders, error: ordersError } = await client
        .from("purchase_orders")
        .select("id, status")
        .eq("supplier_id", ctx.supplierId);
      if (ordersError) throwMappedDbError("PURCHASE_ORDERS_READ_FAILED", ordersError);

      const { data: invoices, error: invError } = await client
        .from("supplier_invoices")
        .select("id, status, total_amount, matching_status")
        .eq("supplier_id", ctx.supplierId);
      if (invError) throwMappedDbError("SUPPLIER_INVOICES_READ_FAILED", invError);

      let outstanding: number | null = 0;
      for (const inv of invoices ?? []) {
        if (inv.status === "paid" || inv.status === "voided" || inv.status === "cancelled") continue;
        outstanding += Number(inv.total_amount ?? 0);
      }

      const discrepancies = (invoices ?? []).filter(
        (inv) => String(inv.matching_status) === "DISCREPANCY",
      ).length;

      return {
        orderCount: (orders ?? []).length,
        outstandingBalance: outstanding,
        outstandingBalanceUnavailableReason: null,
        onTimeDelivery: null,
        onTimeDeliveryUnavailableReason:
          "On-time delivery requires complete expected vs GRN receipt timestamps — not fully wired.",
        acceptedQuantity: null,
        rejectedQuantity: null,
        quantityUnavailableReason:
          "Accepted/rejected quantity requires GRN line variance tracking — not available.",
        invoiceDiscrepancies: discrepancies,
      };
    },

    async provisionPortalUser(scope, actorUserId, supplierId, input) {
      const client = supabase();
      const { data: supplier, error: supplierError } = await client
        .from("suppliers")
        .select("id, branch_id, status, approval_status")
        .eq("id", supplierId)
        .maybeSingle();
      if (supplierError) throwMappedDbError("SUPPLIER_READ_FAILED", supplierError);
      if (!supplier) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier not found.");
      assertBranchMembership(scope, supplier.branch_id);

      const email = input.email.trim().toLowerCase();
      const fullName = input.fullName.trim();
      const password = input.temporaryPassword;
      if (!email || !fullName || password.length < 10) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "email, fullName, and temporaryPassword (≥10 chars) are required.",
        );
      }

      const { data: existingUser } = await client
        .from("users")
        .select("id, email, user_type, auth_user_id")
        .ilike("email", email)
        .maybeSingle();
      if (existingUser) {
        throw new ApiError(
          409,
          "SUPPLIER_PORTAL_ACCOUNT_CONFLICT",
          "An account already exists for this email. Linking existing accounts is not supported in this slice.",
        );
      }

      const { data: created, error: createError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user) {
        const message = createError?.message?.toLowerCase() ?? "";
        if (message.includes("already") || message.includes("registered")) {
          throw new ApiError(
            409,
            "SUPPLIER_PORTAL_ACCOUNT_CONFLICT",
            "An auth account already exists for this email.",
          );
        }
        throw new ApiError(
          503,
          "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE",
          "Unable to provision supplier portal user.",
        );
      }

      const { data: insertedUser, error: userError } = await client
        .from("users")
        .insert({
          auth_user_id: created.user.id,
          email,
          full_name: fullName,
          user_type: "supplier",
          status: "active",
        })
        .select("id")
        .single();
      if (userError) {
        // Best-effort cleanup of orphan auth user
        await client.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        throwMappedDbError("SUPPLIER_USER_CREATE_FAILED", userError);
      }
      const appUserId = insertedUser.id as string;

      const { data: role, error: roleError } = await client
        .from("roles")
        .select("id")
        .eq("code", "supplier")
        .maybeSingle();
      if (roleError) throwMappedDbError("ROLE_READ_FAILED", roleError);
      if (!role) throw new ApiError(500, "SUPPLIER_ROLE_MISSING", "Supplier role is not seeded.");

      const { error: insertRoleError } = await client.from("user_roles").insert({
        user_id: appUserId,
        role_id: role.id,
        branch_id: supplier.branch_id,
      });
      if (insertRoleError && insertRoleError.code !== "23505") {
        throwMappedDbError("SUPPLIER_ROLE_ASSIGN_FAILED", insertRoleError);
      }

      const { error: linkError } = await client.from("supplier_portal_users").insert({
        supplier_id: supplierId,
        user_id: appUserId,
        status: "active",
        created_by: actorUserId,
      });
      if (linkError) throwMappedDbError("SUPPLIER_PORTAL_LINK_FAILED", linkError);

      await writeAudit(client, {
        supplierId,
        actorUserId,
        eventType: "portal_user_provisioned",
        payload: { userId: appUserId, email },
      });

      return { userId: appUserId, email, supplierId };
    },

    async listPortalUsers(scope, supplierId) {
      const client = supabase();
      const { data: supplier, error: supplierError } = await client
        .from("suppliers")
        .select("id, branch_id")
        .eq("id", supplierId)
        .maybeSingle();
      if (supplierError) throwMappedDbError("SUPPLIER_READ_FAILED", supplierError);
      if (!supplier) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier not found.");
      assertBranchMembership(scope, supplier.branch_id);

      const { data, error } = await client
        .from("supplier_portal_users")
        .select("id, user_id, status, user:users(email)")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      if (error) throwMappedDbError("SUPPLIER_PORTAL_USERS_READ_FAILED", error);

      return (data ?? []).map((row) => {
        const userRaw = row.user as unknown;
        const user = (Array.isArray(userRaw) ? userRaw[0] : userRaw) as { email?: string } | null;
        return {
          id: String(row.id),
          userId: String(row.user_id),
          status: String(row.status),
          email: user?.email ?? null,
        };
      });
    },

    async replaceOrderLines(scope, orderId, lines) {
      const client = supabase();
      const { data: order, error: orderError } = await client
        .from("purchase_orders")
        .select("id, branch_id, status")
        .eq("id", orderId)
        .maybeSingle();
      if (orderError) throwMappedDbError("PURCHASE_ORDER_READ_FAILED", orderError);
      if (!order) throw new ApiError(404, "PURCHASE_ORDER_NOT_FOUND", "Purchase order not found.");
      assertBranchMembership(scope, order.branch_id);

      if (order.status === "received" || order.status === "cancelled") {
        throw new ApiError(
          409,
          "PO_LINES_LOCKED",
          `Cannot replace lines when purchase order status is '${order.status}'.`,
        );
      }

      const { error: deleteError } = await client
        .from("purchase_order_lines")
        .delete()
        .eq("purchase_order_id", orderId);
      if (deleteError) throwMappedDbError("PURCHASE_ORDER_LINES_DELETE_FAILED", deleteError);

      if (lines.length === 0) return [];

      const rows = lines.map((line, index) => ({
        purchase_order_id: orderId,
        line_number: index + 1,
        description: line.description.trim(),
        quantity: line.quantity,
        unit_price: line.unitPrice,
        sku_ref: line.skuRef?.trim() || null,
      }));
      for (const row of rows) {
        if (!row.description || !(row.quantity > 0) || row.unit_price < 0) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid purchase order line.");
        }
      }

      const { data, error } = await client
        .from("purchase_order_lines")
        .insert(rows)
        .select("id, line_number, description, quantity, unit_price, sku_ref")
        .order("line_number", { ascending: true });
      if (error) throwMappedDbError("PURCHASE_ORDER_LINES_CREATE_FAILED", error);

      const total = rows.reduce((sum, r) => sum + Number(r.quantity) * Number(r.unit_price), 0);
      const { error: totalError } = await client
        .from("purchase_orders")
        .update({ total_amount: Math.round(total * 100) / 100 })
        .eq("id", orderId);
      if (totalError) throwMappedDbError("PURCHASE_ORDER_UPDATE_FAILED", totalError);

      return ((data ?? []) as Record<string, unknown>[]).map(mapLine);
    },

    async updateSupplierProfile(scope, supplierId, input) {
      const client = supabase();
      const { data: existing, error: readError } = await client
        .from("suppliers")
        .select("id, branch_id")
        .eq("id", supplierId)
        .maybeSingle();
      if (readError) throwMappedDbError("SUPPLIER_READ_FAILED", readError);
      if (!existing) throw new ApiError(404, "SUPPLIER_NOT_FOUND", "Supplier not found.");
      assertBranchMembership(scope, existing.branch_id);

      const patch: Record<string, unknown> = {};
      if (input.taxId !== undefined) patch.tax_id = input.taxId?.trim() || null;
      if (input.businessRegistration !== undefined) {
        patch.business_registration = input.businessRegistration?.trim() || null;
      }
      if (input.paymentTerms !== undefined) patch.payment_terms = input.paymentTerms?.trim() || null;
      if (input.suppliedCategories !== undefined) patch.supplied_categories = input.suppliedCategories;
      if (input.approvalStatus !== undefined) patch.approval_status = input.approvalStatus;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      if (input.contactPerson !== undefined) patch.contact_person = input.contactPerson?.trim() || null;
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.email !== undefined) patch.email = input.email?.trim().toLowerCase() || null;
      if (input.address !== undefined) patch.address = input.address?.trim() || null;
      if (input.status !== undefined) patch.status = input.status;

      const { data, error } = await client
        .from("suppliers")
        .update(patch)
        .eq("id", supplierId)
        .select(
          "id, branch_id, name, contact_person, phone, email, address, status, tax_id, business_registration, payment_terms, supplied_categories, approval_status, notes, created_at, updated_at",
        )
        .single();
      if (error) throwMappedDbError("SUPPLIER_UPDATE_FAILED", error);

      return {
        id: data.id,
        branchId: data.branch_id,
        name: data.name,
        contactPerson: data.contact_person,
        phone: data.phone,
        email: data.email,
        address: data.address,
        status: data.status,
        taxId: data.tax_id,
        businessRegistration: data.business_registration,
        paymentTerms: data.payment_terms,
        suppliedCategories: data.supplied_categories ?? [],
        approvalStatus: data.approval_status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },

    async getSupplierAttention(scope, branchId) {
      const client = supabase();
      let supplierQuery = client.from("suppliers").select("id, branch_id");
      if (branchId) {
        assertBranchMembership(scope, branchId);
        supplierQuery = supplierQuery.eq("branch_id", branchId);
      } else if (!scope.isSuperAdmin) {
        if (scope.branchIds.length === 0) {
          return {
            unacknowledgedPurchaseOrders: 0,
            delayedExpectedDeliveries: 0,
            invoiceGrnMismatches: 0,
          };
        }
        supplierQuery = supplierQuery.in("branch_id", scope.branchIds);
      }
      const { data: suppliers, error: suppliersError } = await supplierQuery;
      if (suppliersError) throwMappedDbError("SUPPLIER_READ_FAILED", suppliersError);
      const supplierIds = (suppliers ?? []).map((s) => String(s.id));
      if (supplierIds.length === 0) {
        return {
          unacknowledgedPurchaseOrders: 0,
          delayedExpectedDeliveries: 0,
          invoiceGrnMismatches: 0,
        };
      }

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const { data: orders, error: ordersError } = await client
        .from("purchase_orders")
        .select("id, status, supplier_response_status, expected_delivery_date")
        .in("supplier_id", supplierIds)
        .in("status", ["approved", "ordered", "submitted"]);
      if (ordersError) throwMappedDbError("PURCHASE_ORDERS_READ_FAILED", ordersError);

      const unacknowledged = (orders ?? []).filter(
        (o) => o.supplier_response_status == null || o.supplier_response_status === "",
      ).length;
      const delayed = (orders ?? []).filter(
        (o) =>
          o.expected_delivery_date &&
          String(o.expected_delivery_date) < today &&
          o.status !== "received",
      ).length;

      const { data: invoices, error: invError } = await client
        .from("supplier_invoices")
        .select("id")
        .in("supplier_id", supplierIds)
        .eq("matching_status", "DISCREPANCY");
      if (invError) throwMappedDbError("SUPPLIER_INVOICES_READ_FAILED", invError);

      return {
        unacknowledgedPurchaseOrders: unacknowledged,
        delayedExpectedDeliveries: delayed,
        invoiceGrnMismatches: (invoices ?? []).length,
      };
    },
  };

  return service;
}

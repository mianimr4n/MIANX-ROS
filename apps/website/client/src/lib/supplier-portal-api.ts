import { bearerHeaders, fetchApiData } from "@/lib/api";

export interface SupplierPortalContext {
  userId: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  approvalStatus: string;
}

export interface SupplierPortalOrder {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  expectedDeliveryDate: string | null;
  supplierResponseStatus: string | null;
  branchName: string | null;
  notes: string | null;
  lines: Array<{
    id: string;
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  latestResponse: {
    responseType: string;
    reason: string | null;
    confirmedDeliveryDate: string | null;
    createdAt: string;
  } | null;
}

function authInit(accessToken: string, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...bearerHeaders(accessToken),
      ...(init?.headers as Record<string, string> | undefined),
    },
  };
}

export function fetchSupplierPortalMe(accessToken: string) {
  return fetchApiData<{
    context: SupplierPortalContext;
    profile: Record<string, unknown>;
  }>("/supplier-portal/me", authInit(accessToken, { method: "GET" }));
}

export function fetchSupplierPortalDashboard(accessToken: string) {
  return fetchApiData<{
    awaitingResponse: number;
    acceptedOpen: number;
    amendmentRequested: number;
    delayedExpected: number;
  }>("/supplier-portal/dashboard", authInit(accessToken, { method: "GET" }));
}

export function listSupplierPortalOrders(accessToken: string) {
  return fetchApiData<SupplierPortalOrder[]>(
    "/supplier-portal/orders",
    authInit(accessToken, { method: "GET" }),
  );
}

export function respondSupplierPortalAction(
  accessToken: string,
  orderId: string,
  action: "acknowledge" | "accept" | "reject" | "request-amendment" | "propose-delivery-date" | "confirm-delivery-date",
  body: {
    reason?: string | null;
    confirmedDeliveryDate?: string | null;
    idempotencyKey?: string | null;
  },
) {
  return fetchApiData<SupplierPortalOrder>(
    `/supplier-portal/orders/${orderId}/${action}`,
    authInit(accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** @deprecated prefer respondSupplierPortalAction */
export function respondSupplierPortalOrder(
  accessToken: string,
  orderId: string,
  body: {
    responseType: "acknowledge" | "accept" | "request_amendment" | "reject";
    reason?: string | null;
    confirmedDeliveryDate?: string | null;
  },
) {
  return fetchApiData<SupplierPortalOrder>(
    `/supplier-portal/orders/${orderId}/respond`,
    authInit(accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function listSupplierPortalDocuments(accessToken: string) {
  return fetchApiData<
    Array<{
      id: string;
      documentType: string;
      title: string;
      fileUrl: string;
      uploadedAt: string;
    }>
  >("/supplier-portal/documents", authInit(accessToken, { method: "GET" }));
}

export function createSupplierPortalDocument(
  accessToken: string,
  body: {
    documentType: string;
    title: string;
    fileUrl: string;
    purchaseOrderId?: string | null;
  },
) {
  return fetchApiData(
    "/supplier-portal/documents",
    authInit(accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export function fetchSupplierPerformance(accessToken: string) {
  return fetchApiData<{
    orderCount: number;
    outstandingBalance: number | null;
    onTimeDelivery: null;
    onTimeDeliveryUnavailableReason: string;
    acceptedQuantity: null;
    rejectedQuantity: null;
    quantityUnavailableReason: string;
    invoiceDiscrepancies: number | null;
  }>("/supplier-portal/performance", authInit(accessToken, { method: "GET" }));
}

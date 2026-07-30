/** Purchasing & Suppliers helpers — live suppliers/POs/requisitions/GRN; no invented payables. */

import type { GoodsReceiving, PurchaseOrder, PurchaseRequisition, Supplier } from "@/lib/admin-api";

export type ProcurementIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type PurchasingKpiSnapshot = {
  supplierCount: number | null;
  openPoCount: number | null;
  openRequisitionCount: number | null;
  inventoryFoundationLinked: boolean;
  stockLedgerAvailable: boolean;
  menuCatalogAvailable: boolean;
};

export type ProcurementInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation" | "live";
};

export type ProcurementReadinessGroup = {
  id: string;
  title: string;
  unavailable: string;
  why: string;
  entities: string[];
  apis: string[];
  permission: string;
  related: string;
};

const OPEN_PO_STATUSES = new Set(["draft", "submitted", "approved", "ordered", "partially_received"]);
const OPEN_REQ_STATUSES = new Set(["draft", "submitted", "approved"]);

export function integrationChecks(): ProcurementIntegrationCheck[] {
  return [
    {
      id: "suppliers",
      label: "Supplier master",
      status: "present",
      note: "suppliers + GET/POST /api/v1/admin/purchasing/suppliers.",
    },
    {
      id: "requisitions",
      label: "Purchase requisitions",
      status: "present",
      note: "purchase_requisitions + GET/POST /api/v1/admin/purchasing/requisitions.",
    },
    {
      id: "approvals",
      label: "Approval workflow",
      status: "missing",
      note: "No procurement approval enforcement yet — Coming Soon.",
    },
    {
      id: "purchase-orders",
      label: "Purchase orders",
      status: "present",
      note: "purchase_orders + GET/POST /api/v1/admin/purchasing/orders.",
    },
    {
      id: "receiving",
      label: "Goods receiving / GRN",
      status: "present",
      note: "goods_receiving + GET/POST /api/v1/admin/purchasing/receiving.",
    },
    {
      id: "inventory-posting",
      label: "Inventory posting from GRN",
      status: "partial",
      note: "GRN headers are LIVE — line → stock_movements posting Coming Soon.",
    },
    {
      id: "invoices",
      label: "Supplier invoices",
      status: "missing",
      note: "No purchase invoice or AP tables — Coming Soon.",
    },
    {
      id: "matching",
      label: "Three-way matching",
      status: "missing",
      note: "PO ↔ GRN ↔ invoice matching not implemented — Coming Soon.",
    },
    {
      id: "payments",
      label: "Supplier payments / payables",
      status: "missing",
      note: "payment.* permissions cover customer payments — not supplier AP — Coming Soon.",
    },
    {
      id: "inventory-module",
      label: "Inventory demand context",
      status: "present",
      note: "Inventory stock ledger is LIVE — reorder suggestions Coming Soon.",
    },
    {
      id: "permission",
      label: "Procurement permission",
      status: "present",
      note: "purchasing.manage seeded; routes also accept admin.access.",
    },
  ];
}

export function buildPurchasingKpis(
  suppliers: Supplier[] | null = null,
  orders: PurchaseOrder[] | null = null,
  requisitions: PurchaseRequisition[] | null = null,
): PurchasingKpiSnapshot {
  return {
    supplierCount: suppliers == null ? null : suppliers.length,
    openPoCount: orders == null ? null : orders.filter((o) => OPEN_PO_STATUSES.has(o.status)).length,
    openRequisitionCount:
      requisitions == null ? null : requisitions.filter((r) => OPEN_REQ_STATUSES.has(r.status)).length,
    inventoryFoundationLinked: true,
    stockLedgerAvailable: true,
    menuCatalogAvailable: true,
  };
}

export function buildProcurementInsights(
  branchLabel: string,
  suppliers: Supplier[] | null = null,
  orders: PurchaseOrder[] | null = null,
  receipts: GoodsReceiving[] | null = null,
): ProcurementInsightItem[] {
  const items: ProcurementInsightItem[] = [];

  if (suppliers != null) {
    items.push({
      id: "live-suppliers",
      title: `${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"} in branch scope.`,
      detail: "Live from GET /admin/purchasing/suppliers — empty until staff add vendors.",
      source: "live",
    });
  }

  if (orders != null) {
    items.push({
      id: "live-pos",
      title: `${orders.length} purchase order${orders.length === 1 ? "" : "s"} on record.`,
      detail: "Live from GET /admin/purchasing/orders. Line items Coming Soon.",
      source: "live",
    });
  }

  if (receipts != null) {
    items.push({
      id: "live-grn",
      title: `${receipts.length} goods receipt${receipts.length === 1 ? "" : "s"} recorded.`,
      detail: "Live GRN headers — line-level inventory posting Coming Soon.",
      source: "live",
    });
  }

  items.push({
    id: "no-matching",
    title: "Purchase invoice matching is Coming Soon.",
    detail: "Three-way match requires supplier invoice records in addition to PO and GRN.",
    source: "foundation",
  });

  items.push({
    id: "no-approvals",
    title: "Server-side approval workflow is Coming Soon.",
    detail: "Requisitions and POs can be created; approval enforcement is not shipped.",
    source: "foundation",
  });

  items.push({
    id: "branch",
    title: `Branch context: ${branchLabel} — purchasing APIs are branch-scoped.`,
    detail: "purchasing.manage or admin.access required for write APIs.",
    source: "live",
  });

  return items.slice(0, 6);
}

export function readinessGroups(): ProcurementReadinessGroup[] {
  return [
    {
      id: "supplier",
      title: "Supplier foundation",
      unavailable: "— LIVE",
      why: "Supplier master is live; commercial terms catalogue Coming Soon.",
      entities: ["suppliers"],
      apis: ["GET/POST /api/v1/admin/purchasing/suppliers"],
      permission: "purchasing.manage or admin.access",
      related: "Inventory items may link via supplier_items later — not menu SKUs alone.",
    },
    {
      id: "workflow",
      title: "Procurement workflow",
      unavailable: "Approvals Coming Soon — requisitions & POs LIVE",
      why: "Requisitions and purchase orders can be created; approval enforcement not shipped.",
      entities: ["purchase_requisitions", "purchase_orders"],
      apis: [
        "GET/POST /api/v1/admin/purchasing/requisitions",
        "GET/POST /api/v1/admin/purchasing/orders",
      ],
      permission: "purchasing.manage or admin.access",
      related: "PO/requisition line items Coming Soon.",
    },
    {
      id: "receiving",
      title: "Receiving foundation",
      unavailable: "Line posting Coming Soon — GRN headers LIVE",
      why: "Goods receiving headers are live; line-level inventory posting Coming Soon.",
      entities: ["goods_receiving"],
      apis: ["GET/POST /api/v1/admin/purchasing/receiving"],
      permission: "purchasing.manage or admin.access",
      related: "Use Inventory adjustments for quantity until GRN lines post to stock_movements.",
    },
    {
      id: "finance",
      title: "Finance matching foundation",
      unavailable: "Supplier invoices, three-way match, payables (Coming Soon)",
      why: "Customer payment.* permissions do not imply supplier accounts payable.",
      entities: ["supplier_invoices", "invoice_match_results", "accounts_payable"],
      apis: ["POST /api/v1/admin/finance/supplier-invoices", "POST /api/v1/admin/finance/match"],
      permission: "payment.manage (supplier AP) — not yet scoped",
      related: "Finance module consumes matched invoices for payables.",
    },
  ];
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

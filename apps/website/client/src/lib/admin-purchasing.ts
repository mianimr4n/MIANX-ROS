/** Purchasing & Suppliers helpers — live suppliers/POs; no invented receipts or payables. */

import type { PurchaseOrder, Supplier } from "@/lib/admin-api";

export type ProcurementIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type PurchasingKpiSnapshot = {
  supplierCount: number | null;
  openPoCount: number | null;
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
      status: "missing",
      note: "No requisition entities or admin APIs — Coming Soon.",
    },
    {
      id: "approvals",
      label: "Approval workflow",
      status: "missing",
      note: "No procurement approval infrastructure in backend — Coming Soon.",
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
      status: "missing",
      note: "No goods_receipts table or receiving API — Coming Soon.",
    },
    {
      id: "inventory-posting",
      label: "Inventory posting from GRN",
      status: "partial",
      note: "Stock ledger is LIVE — GRN → stock_movements posting Coming Soon.",
    },
    {
      id: "invoices",
      label: "Supplier invoices",
      status: "missing",
      note: "No purchase invoice or AP tables.",
    },
    {
      id: "matching",
      label: "Three-way matching",
      status: "missing",
      note: "PO ↔ GRN ↔ invoice matching not implemented.",
    },
    {
      id: "payments",
      label: "Supplier payments / payables",
      status: "missing",
      note: "payment.* permissions cover customer payments — not supplier AP.",
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
): PurchasingKpiSnapshot {
  return {
    supplierCount: suppliers == null ? null : suppliers.length,
    openPoCount: orders == null ? null : orders.filter((o) => OPEN_PO_STATUSES.has(o.status)).length,
    inventoryFoundationLinked: true,
    stockLedgerAvailable: true,
    menuCatalogAvailable: true,
  };
}

export function buildProcurementInsights(
  branchLabel: string,
  suppliers: Supplier[] | null = null,
  orders: PurchaseOrder[] | null = null,
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
      detail: "Live from GET /admin/purchasing/orders. Line items and GRN Coming Soon.",
      source: "live",
    });
  }

  items.push({
    id: "no-grn",
    title: "Goods receiving and GRN creation are Coming Soon.",
    detail: "Receiving requires persistent receipt rows and inventory posting.",
    source: "foundation",
  });

  items.push({
    id: "no-matching",
    title: "Purchase invoice matching is Coming Soon.",
    detail: "Three-way match requires PO, GRN, and supplier invoice records.",
    source: "foundation",
  });

  items.push({
    id: "no-approvals",
    title: "Server-side approval workflow is Coming Soon.",
    detail: "Draft POs can be created; approval enforcement is not shipped.",
    source: "foundation",
  });

  items.push({
    id: "branch",
    title: `Branch context: ${branchLabel} — supplier and PO APIs are branch-scoped.`,
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
      unavailable: "— LIVE (contacts/terms catalogue partial)",
      why: "Supplier master is live; commercial terms catalogue Coming Soon.",
      entities: ["suppliers"],
      apis: ["GET/POST /api/v1/admin/purchasing/suppliers"],
      permission: "purchasing.manage or admin.access",
      related: "Inventory items may link via supplier_items later — not menu SKUs alone.",
    },
    {
      id: "workflow",
      title: "Procurement workflow",
      unavailable: "Requisitions & approvals Coming Soon — POs LIVE",
      why: "Purchase orders can be created; requisition→approval workflow not shipped.",
      entities: ["purchase_orders"],
      apis: ["GET/POST /api/v1/admin/purchasing/orders"],
      permission: "purchasing.manage or admin.access",
      related: "PO line items Coming Soon.",
    },
    {
      id: "receiving",
      title: "Receiving foundation",
      unavailable: "GRN, partial receipts, quality rejection (Coming Soon)",
      why: "Receiving must create immutable receipt events — not frontend quantity bumps.",
      entities: ["goods_receipts", "goods_receipt_lines", "rejection_reasons"],
      apis: ["POST /api/v1/admin/purchasing/receipts"],
      permission: "purchasing.manage or inventory.manage",
      related: "Posts to stock_movements when receiving ships.",
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

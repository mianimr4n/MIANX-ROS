/** Purchasing & Suppliers helpers — no invented suppliers, POs, or receipts. */

export type ProcurementIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type PurchasingKpiSnapshot = {
  inventoryFoundationLinked: boolean;
  stockLedgerAvailable: boolean;
  menuCatalogAvailable: boolean;
};

export type ProcurementInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation";
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

export function integrationChecks(): ProcurementIntegrationCheck[] {
  return [
    {
      id: "suppliers",
      label: "Supplier master",
      status: "missing",
      note: "No suppliers / vendors tables in committed migrations.",
    },
    {
      id: "requisitions",
      label: "Purchase requisitions",
      status: "missing",
      note: "No requisition entities or admin APIs.",
    },
    {
      id: "approvals",
      label: "Approval workflow",
      status: "missing",
      note: "No procurement approval infrastructure in backend.",
    },
    {
      id: "purchase-orders",
      label: "Purchase orders",
      status: "missing",
      note: "No purchase_orders table or PO admin routes.",
    },
    {
      id: "receiving",
      label: "Goods receiving / GRN",
      status: "missing",
      note: "No goods_receipts table or receiving API.",
    },
    {
      id: "inventory-posting",
      label: "Inventory posting from GRN",
      status: "missing",
      note: "No stock movement ledger — inventory module is Foundation.",
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
      status: "partial",
      note: "Inventory workspace is Foundation — no reorder thresholds or balances.",
    },
    {
      id: "permission",
      label: "Procurement permission",
      status: "partial",
      note: "No purchasing.manage — workspace gated on branch.manage until seeded.",
    },
  ];
}

export function buildPurchasingKpis(): PurchasingKpiSnapshot {
  return {
    inventoryFoundationLinked: true,
    stockLedgerAvailable: false,
    menuCatalogAvailable: true,
  };
}

export function buildProcurementInsights(branchLabel: string): ProcurementInsightItem[] {
  return [
    {
      id: "no-suppliers",
      title: "No supplier master records exist in the repository.",
      detail: "Rule-based: migrations contain no suppliers or vendor tables.",
      source: "derived",
    },
    {
      id: "no-po",
      title: "Purchase orders cannot be created — no PO backend or numbering service.",
      detail: "Foundation until purchase_orders and admin write APIs ship.",
      source: "foundation",
    },
    {
      id: "no-grn",
      title: "Goods receiving and GRN creation are unavailable.",
      detail: "Receiving requires persistent receipt rows and inventory posting.",
      source: "foundation",
    },
    {
      id: "no-matching",
      title: "Purchase invoice matching is unavailable.",
      detail: "Three-way match requires PO, GRN, and supplier invoice records.",
      source: "foundation",
    },
    {
      id: "no-ledger",
      title: "Inventory posting is unavailable because no persistent stock movement ledger exists.",
      detail: "GRN cannot safely update stock without server-side movements.",
      source: "foundation",
    },
    {
      id: "branch",
      title: `Branch context: ${branchLabel} — procurement APIs must enforce branch scope when added.`,
      detail: "Display context only; no branch-scoped purchasing data today.",
      source: "foundation",
    },
  ];
}

export function readinessGroups(): ProcurementReadinessGroup[] {
  return [
    {
      id: "supplier",
      title: "Supplier foundation",
      unavailable: "Supplier master, contacts, terms, item catalogue",
      why: "Procurement cannot start without verified supplier records and commercial terms.",
      entities: ["suppliers", "supplier_contacts", "supplier_addresses", "supplier_items"],
      apis: ["GET/POST /api/v1/admin/suppliers"],
      permission: "purchasing.manage (proposed)",
      related: "Inventory items link via supplier_items — not menu SKUs alone.",
    },
    {
      id: "workflow",
      title: "Procurement workflow",
      unavailable: "Requisitions, approvals, purchase orders",
      why: "Draft POs in React state are not auditable procurement records.",
      entities: ["purchase_requisitions", "purchase_orders", "purchase_order_lines", "approval_events"],
      apis: ["POST /api/v1/admin/purchasing/requisitions", "POST /api/v1/admin/purchasing/orders"],
      permission: "purchasing.manage + approval rules",
      related: "Branch managers may approve up to configured thresholds.",
    },
    {
      id: "receiving",
      title: "Receiving foundation",
      unavailable: "GRN, partial receipts, quality rejection",
      why: "Receiving must create immutable receipt events — not frontend quantity bumps.",
      entities: ["goods_receipts", "goods_receipt_lines", "rejection_reasons"],
      apis: ["POST /api/v1/admin/purchasing/receipts"],
      permission: "purchasing.manage or inventory.manage",
      related: "Posts to stock_movements when inventory ledger exists.",
    },
    {
      id: "finance",
      title: "Finance matching foundation",
      unavailable: "Supplier invoices, three-way match, payables",
      why: "Customer payment.* permissions do not imply supplier accounts payable.",
      entities: ["supplier_invoices", "invoice_match_results", "accounts_payable"],
      apis: ["POST /api/v1/admin/finance/supplier-invoices", "POST /api/v1/admin/finance/match"],
      permission: "payment.manage (supplier AP) — not yet scoped",
      related: "Finance module consumes matched invoices for payables.",
    },
  ];
}

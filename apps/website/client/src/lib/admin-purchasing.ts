/** Purchasing & Suppliers helpers — live suppliers/POs/requisitions/GRN/invoices/payments. */

import type {
  GoodsReceiving,
  PurchaseOrder,
  PurchaseRequisition,
  Supplier,
  SupplierInvoice,
  SupplierPayment,
} from "@/lib/admin-api";

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
  pendingApprovalCount: number | null;
  awaitingDeliveryCount: number | null;
  partiallyReceivedCount: number | null;
  overduePoCount: number | null;
  onTimeDeliveryPct: number | null;
  outstandingInvoiceCount: number | null;
  purchaseSpend: number | null;
  matchedInvoiceCount: number | null;
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
const PENDING_APPROVAL_STATUSES = new Set(["draft", "submitted"]);
const OUTSTANDING_INVOICE_STATUSES = new Set(["pending", "partially_paid"]);
const OVERDUE_PO_STATUSES = new Set(["approved", "ordered", "partially_received"]);

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

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
      status: "present",
      note: "PATCH /api/v1/admin/purchasing/orders/:id/approve (approve|reject draft/submitted POs).",
    },
    {
      id: "purchase-orders",
      label: "Purchase orders",
      status: "present",
      note: "purchase_orders + GET/POST /api/v1/admin/purchasing/orders (includes awaitingDeliveryCount).",
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
      status: "present",
      note: "GRN lines with inventoryItemId post stock_movements (purchase) + current_stock atomically; unmapped items are skipped.",
    },
    {
      id: "invoices",
      label: "Supplier invoices",
      status: "present",
      note: "supplier_invoices + GET/POST /api/v1/admin/purchasing/invoices.",
    },
    {
      id: "matching",
      label: "Three-way matching",
      status: "present",
      note: "On invoice create: compare linked PO total + posted GRN presence vs invoice total → matching_status UNMATCHED|MATCHED|DISCREPANCY.",
    },
    {
      id: "payments",
      label: "Supplier payments / payables",
      status: "present",
      note: "supplier_payments + GET/POST /api/v1/admin/purchasing/payments (updates invoice status).",
    },
    {
      id: "inventory-module",
      label: "Inventory demand context",
      status: "present",
      note: "Inventory stock ledger is LIVE and linked from GRN posting.",
    },
    {
      id: "permission",
      label: "Procurement permission",
      status: "present",
      note: "purchasing.manage / finance.manage / admin.access.",
    },
  ];
}

export function buildPurchasingKpis(
  suppliers: Supplier[] | null = null,
  orders: PurchaseOrder[] | null = null,
  requisitions: PurchaseRequisition[] | null = null,
  awaitingDeliveryCount: number | null = null,
  invoices: SupplierInvoice[] | null = null,
  receipts: GoodsReceiving[] | null = null,
): PurchasingKpiSnapshot {
  const today = todayIsoDate();
  let overduePoCount: number | null = null;
  let onTimeDeliveryPct: number | null = null;

  if (orders != null) {
    overduePoCount = orders.filter(
      (o) =>
        OVERDUE_PO_STATUSES.has(o.status) &&
        o.expectedDeliveryDate != null &&
        o.expectedDeliveryDate < today,
    ).length;

    const receivedWithDate = orders.filter((o) => o.status === "received" && o.expectedDeliveryDate);
    if (receipts == null) {
      onTimeDeliveryPct = null;
    } else if (receivedWithDate.length === 0) {
      onTimeDeliveryPct = 0;
    } else {
      let onTime = 0;
      for (const o of receivedWithDate) {
        const grnDates = receipts
          .filter((r) => r.purchaseOrderId === o.id && r.status === "posted")
          .map((r) => r.receivedAt.slice(0, 10))
          .sort();
        if (grnDates.length > 0 && grnDates[0]! <= o.expectedDeliveryDate!) onTime += 1;
      }
      onTimeDeliveryPct = Math.round((onTime / receivedWithDate.length) * 100);
    }
  }

  return {
    supplierCount: suppliers == null ? null : suppliers.length,
    openPoCount: orders == null ? null : orders.filter((o) => OPEN_PO_STATUSES.has(o.status)).length,
    openRequisitionCount:
      requisitions == null ? null : requisitions.filter((r) => OPEN_REQ_STATUSES.has(r.status)).length,
    pendingApprovalCount:
      orders == null ? null : orders.filter((o) => PENDING_APPROVAL_STATUSES.has(o.status)).length,
    awaitingDeliveryCount,
    partiallyReceivedCount:
      orders == null ? null : orders.filter((o) => o.status === "partially_received").length,
    overduePoCount,
    onTimeDeliveryPct,
    outstandingInvoiceCount:
      invoices == null
        ? null
        : invoices.filter((i) => OUTSTANDING_INVOICE_STATUSES.has(i.status)).length,
    purchaseSpend: invoices == null ? null : invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    matchedInvoiceCount:
      invoices == null ? null : invoices.filter((i) => i.matchingStatus === "MATCHED").length,
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
  invoices: SupplierInvoice[] | null = null,
  payments: SupplierPayment[] | null = null,
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
      detail: "Live from GET /admin/purchasing/orders.",
      source: "live",
    });
  }

  if (receipts != null) {
    items.push({
      id: "live-grn",
      title: `${receipts.length} goods receipt${receipts.length === 1 ? "" : "s"} recorded.`,
      detail: "Live GRN headers and atomic stock posting for mapped inventory lines.",
      source: "live",
    });
  }

  if (invoices != null) {
    const matched = invoices.filter((i) => i.matchingStatus === "MATCHED").length;
    const discrepancy = invoices.filter((i) => i.matchingStatus === "DISCREPANCY").length;
    items.push({
      id: "live-invoices",
      title: `${invoices.length} supplier invoice${invoices.length === 1 ? "" : "s"} · ${matched} matched · ${discrepancy} discrepancy.`,
      detail: "Three-way matching runs on invoice create (PO total ↔ posted GRN ↔ invoice amount).",
      source: "live",
    });
  }

  if (payments != null) {
    items.push({
      id: "live-payments",
      title: `${payments.length} supplier payment${payments.length === 1 ? "" : "s"} recorded.`,
      detail: "Payments update invoice status to partially_paid / paid atomically.",
      source: "live",
    });
  }

  items.push({
    id: "branch",
    title: `Branch context: ${branchLabel} — purchasing APIs are branch-scoped.`,
    detail: "purchasing.manage, finance.manage, or admin.access required.",
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
      why: "Supplier master is live for branch-scoped vendor records.",
      entities: ["suppliers"],
      apis: ["GET/POST /api/v1/admin/purchasing/suppliers"],
      permission: "purchasing.manage or admin.access",
      related: "Inventory items may link via supplier_items later — not menu SKUs alone.",
    },
    {
      id: "workflow",
      title: "Procurement workflow",
      unavailable: "— LIVE",
      why: "Requisitions and purchase orders can be created; draft/submitted POs can be approved or rejected.",
      entities: ["purchase_requisitions", "purchase_orders"],
      apis: [
        "GET/POST /api/v1/admin/purchasing/requisitions",
        "GET/POST /api/v1/admin/purchasing/orders",
        "PATCH /api/v1/admin/purchasing/orders/:id/approve",
      ],
      permission: "purchasing.manage or admin.access",
      related: "Approve/reject actions are available on the purchase orders table.",
    },
    {
      id: "receiving",
      title: "Receiving foundation",
      unavailable: "Unmapped lines skip stock — mapped inventory lines post LIVE",
      why: "Goods receiving headers and optional lines are live; mapped inventoryItemId lines post stock_movements (purchase) atomically.",
      entities: ["goods_receiving"],
      apis: ["GET/POST /api/v1/admin/purchasing/receiving"],
      permission: "purchasing.manage or admin.access",
      related: "Awaiting delivery KPI uses approved/ordered POs without linked GRN.",
    },
    {
      id: "finance",
      title: "Supplier payables",
      unavailable: "— LIVE",
      why: "Supplier invoices, payments, and three-way matching_status are live on invoice create.",
      entities: ["supplier_invoices", "supplier_payments"],
      apis: [
        "GET/POST /api/v1/admin/purchasing/invoices",
        "GET/POST /api/v1/admin/purchasing/payments",
      ],
      permission: "purchasing.manage, finance.manage, or admin.access",
      related: "matching_status: UNMATCHED | MATCHED | DISCREPANCY.",
    },
  ];
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Finance & Accounting helpers — live GL where implemented; no invented balances. */

import type { AdminOperationsDashboard, ProfitLossReport } from "@/lib/admin-api";

export type FinanceIntegrationCheck = {
  id: string;
  label: string;
  status: "present" | "partial" | "derived" | "missing";
  note: string;
};

export type FinanceKpiSnapshot = {
  ordersApiLinked: boolean;
  purchasingFoundationLinked: boolean;
  inventoryFoundationLinked: boolean;
  customerPaymentsPartial: boolean;
};

export type FinanceInsightItem = {
  id: string;
  title: string;
  detail: string;
  source: "derived" | "foundation" | "live";
};

export type FinanceReadinessGroup = {
  id: string;
  title: string;
  unavailable: string;
  why: string;
  entities: string[];
  apis: string[];
  permission: string;
  related: string;
};

export type OperationalSalesSnapshot = {
  todayGrossSales: number | null;
  todayOrders: number | null;
  averageOrderValue: number | null;
  paidOrdersToday: number | null;
  refundedOrdersToday: number | null;
  note: string;
};

export function buildFinanceKpiSnapshot(): FinanceKpiSnapshot {
  return {
    ordersApiLinked: true,
    purchasingFoundationLinked: true,
    inventoryFoundationLinked: true,
    customerPaymentsPartial: true,
  };
}

export function integrationChecks(): FinanceIntegrationCheck[] {
  return [
    {
      id: "chart-of-accounts",
      label: "Chart of accounts",
      status: "present",
      note: "LIVE — chart_of_accounts + GET/POST /admin/finance/accounts.",
    },
    {
      id: "general-ledger",
      label: "General ledger / journal entries",
      status: "present",
      note: "LIVE — balanced journal_entries (debits = credits) via atomic RPC.",
    },
    {
      id: "customer-payments",
      label: "Customer payment capture",
      status: "partial",
      note: "orders.payment_status + payments table — not auto-posted to GL.",
    },
    {
      id: "accounts-receivable",
      label: "Accounts receivable",
      status: "missing",
      note: "Planned for Phase 2 — no AR aging or credit invoices.",
    },
    {
      id: "accounts-payable",
      label: "Accounts payable",
      status: "partial",
      note: "Operational supplier invoices LIVE via Purchasing — GL AP auto-post Planned for Phase 2.",
    },
    {
      id: "expenses",
      label: "Operating expenses",
      status: "present",
      note: "Expense claims LIVE — submit/approve/post; journal blocked until account mapping exists.",
    },
    {
      id: "tax-config",
      label: "Tax configuration (VAT/GST)",
      status: "missing",
      note: "Planned for Phase 2 — VAT/GST returns and tax engine.",
    },
    {
      id: "cash-bank",
      label: "Cash & bank accounts",
      status: "partial",
      note: "Cash reconciliations LIVE (float, counted, variance). Bank account register Planned for Phase 2.",
    },
    {
      id: "inventory-valuation",
      label: "Inventory valuation",
      status: "partial",
      note: "Inventory stock LIVE separately — COGS auto-post to GL Planned for Phase 2.",
    },
    {
      id: "payroll",
      label: "Payroll linkage",
      status: "partial",
      note: "Payroll calc/approve APIs LIVE in HR — GL salary accrual journals remain Deferred.",
    },
    {
      id: "statements",
      label: "Financial statements",
      status: "partial",
      note: "LIVE trial balance + P&L (dynamic). Balance sheet / cash flow UI Foundation (API may exist; panel unwired).",
    },
    {
      id: "permission",
      label: "Finance permission",
      status: "present",
      note: "finance.manage seeded for super-admin and branch-manager (plus admin.access).",
    },
  ];
}

export function readinessGroups(): FinanceReadinessGroup[] {
  return [
    {
      id: "gl",
      title: "General ledger",
      unavailable: "Period close / fiscal periods Planned for Phase 2",
      why: "CoA and balanced journal entries are LIVE. Period lock is not shipped.",
      entities: ["chart_of_accounts", "journal_entries", "journal_entry_lines"],
      apis: [
        "GET/POST /api/v1/admin/finance/accounts",
        "GET/POST /api/v1/admin/finance/journal-entries",
      ],
      permission: "finance.manage or admin.access",
      related: "Manual journals only — sales/purchasing auto-post Planned for Phase 2.",
    },
    {
      id: "sales",
      title: "Sales recognition",
      unavailable: "Auto-post from orders Planned for Phase 2",
      why: "Operational sales are separate from GL until recognition mapping ships.",
      entities: ["sales_invoices", "revenue_recognition_rules"],
      apis: ["POST /api/v1/admin/finance/sales/post-from-order (Planned for Phase 2)"],
      permission: "finance.manage",
      related: "Orders · POS feed operational sales only.",
    },
    {
      id: "ap",
      title: "Accounts payable",
      unavailable: "Supplier bills, three-way match, payment runs",
      why: "Planned for Phase 2 — purchasing GRN does not yet create AP journals.",
      entities: ["supplier_invoices", "accounts_payable"],
      apis: ["Planned for Phase 2"],
      permission: "finance.manage",
      related: "Purchasing module is LIVE operationally; AP GL mapping is not.",
    },
    {
      id: "ar",
      title: "Accounts receivable",
      unavailable: "Credit customers, aging, collections",
      why: "Planned for Phase 2 — walk-in/delivery settle at checkout.",
      entities: ["customer_invoices", "ar_aging_buckets"],
      apis: ["Planned for Phase 2"],
      permission: "finance.manage",
      related: "CRM is not AR.",
    },
    {
      id: "tax",
      title: "Tax compliance",
      unavailable: "VAT/GST returns Planned for Phase 2",
      why: "orders.tax_amount is not a filing engine.",
      entities: ["tax_codes", "tax_returns"],
      apis: ["Planned for Phase 2"],
      permission: "finance.manage",
      related: "Manual tax journals possible via GL today.",
    },
    {
      id: "statements",
      title: "Financial statements",
      unavailable: "Balance sheet and cash flow UI Foundation (unwired)",
      why: "Trial balance and P&L are calculated dynamically from posted journal lines.",
      entities: ["(dynamic — no snapshot tables)"],
      apis: [
        "GET /api/v1/admin/finance/reports/trial-balance",
        "GET /api/v1/admin/finance/reports/profit-loss",
      ],
      permission: "finance.manage or admin.access",
      related: "No fabricated statement figures.",
    },
  ];
}

export function buildOperationalSalesSnapshot(
  dashboard: AdminOperationsDashboard | null,
  ordersApiAvailable: boolean,
): OperationalSalesSnapshot {
  if (!ordersApiAvailable || !dashboard) {
    return {
      todayGrossSales: null,
      todayOrders: null,
      averageOrderValue: null,
      paidOrdersToday: null,
      refundedOrdersToday: null,
      note: "Operational sales snapshot requires order.manage and live dashboard API — not accounting revenue.",
    };
  }

  const paid = dashboard.recentOrders.filter((o) => o.paymentStatus === "paid").length;
  const refunded = dashboard.recentOrders.filter((o) => o.paymentStatus === "refunded").length;

  return {
    todayGrossSales: dashboard.kpis.todayGrossSales,
    todayOrders: dashboard.kpis.todayOrders,
    averageOrderValue: dashboard.kpis.averageOrderValue,
    paidOrdersToday: paid,
    refundedOrdersToday: refunded,
    note: "Operational order totals from dashboard API — not recognized accounting revenue or GL postings.",
  };
}

export function formatPkr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function buildFinanceInsights(
  branchLabel: string,
  pl: ProfitLossReport | null,
): FinanceInsightItem[] {
  const items: FinanceInsightItem[] = [
    {
      id: "gl-live",
      title: "General ledger is LIVE",
      detail: `Chart of accounts and balanced journal entries are available for ${branchLabel}. Debits must equal credits.`,
      source: "live",
    },
  ];

  if (pl && (pl.revenue !== 0 || pl.expenses !== 0)) {
    items.push({
      id: "pl-live",
      title: `Net income ${formatPkr(pl.netIncome)}`,
      detail: `Revenue ${formatPkr(pl.revenue)} − Expenses ${formatPkr(pl.expenses)} from posted journals (not order UI totals).`,
      source: "live",
    });
  } else {
    items.push({
      id: "no-posted-pl",
      title: "No posted P&L activity yet",
      detail: "Create accounts and balanced journal entries to populate trial balance and profit & loss.",
      source: "derived",
    });
  }

  items.push(
    {
      id: "ops-ap",
      title: "Operational supplier payables LIVE",
      detail: "Outstanding invoices from Purchasing; GL AP auto-post Planned for Phase 2.",
      source: "live",
    },
    {
      id: "no-ar",
      title: "Trade receivables Planned for Phase 2",
      detail: "Customer orders settle at checkout — no AR aging workflow.",
      source: "foundation",
    },
    {
      id: "no-cashflow",
      title: "Cash flow statement Planned for Phase 2",
      detail: "Trial balance and P&L are LIVE; cash flow and balance sheet UI remain Foundation until wired.",
      source: "foundation",
    },
  );

  return items;
}

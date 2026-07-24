/** Finance & Accounting helpers — no invented ledger, journals, or statements. */

import type { AdminOperationsDashboard } from "@/lib/admin-api";

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
  source: "derived" | "foundation";
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
      status: "missing",
      note: "No chart_of_accounts table or admin APIs in committed migrations.",
    },
    {
      id: "general-ledger",
      label: "General ledger / journal entries",
      status: "missing",
      note: "No journal_entries, ledger_lines, or posting engine.",
    },
    {
      id: "customer-payments",
      label: "Customer payment capture",
      status: "partial",
      note: "orders.payment_status + payments table (service-role only) — not accounting postings.",
    },
    {
      id: "accounts-receivable",
      label: "Accounts receivable",
      status: "missing",
      note: "No AR aging, invoices, or credit terms for B2B customers.",
    },
    {
      id: "accounts-payable",
      label: "Accounts payable",
      status: "missing",
      note: "No supplier invoices or AP — purchasing module is Foundation.",
    },
    {
      id: "expenses",
      label: "Operating expenses",
      status: "missing",
      note: "No expense claims, petty cash, or OPEX ledger.",
    },
    {
      id: "tax-config",
      label: "Tax configuration (VAT/GST)",
      status: "missing",
      note: "orders.tax_amount exists but no tax codes, rates, or filing exports.",
    },
    {
      id: "cash-bank",
      label: "Cash & bank accounts",
      status: "missing",
      note: "No cash drawers, bank accounts, or reconciliation workspace.",
    },
    {
      id: "inventory-valuation",
      label: "Inventory valuation",
      status: "missing",
      note: "Inventory module is Foundation — no stock ledger or COGS posting.",
    },
    {
      id: "payroll",
      label: "Payroll linkage",
      status: "missing",
      note: "No payroll runs or salary accrual journals.",
    },
    {
      id: "statements",
      label: "Financial statements",
      status: "missing",
      note: "No trial balance, P&L, balance sheet, or cash flow APIs.",
    },
    {
      id: "permission",
      label: "Finance permission",
      status: "partial",
      note: "Workspace gated on payment.read / payment.manage — no finance.manage in seed.",
    },
  ];
}

export function readinessGroups(): FinanceReadinessGroup[] {
  return [
    {
      id: "gl",
      title: "General ledger foundation",
      unavailable: "Journal entries, posting rules, period close",
      why: "Every financial transaction must post to an immutable ledger before statements are trustworthy.",
      entities: ["chart_of_accounts", "journal_entries", "ledger_lines", "fiscal_periods"],
      apis: ["GET /api/v1/admin/finance/ledger", "POST /api/v1/admin/finance/journals"],
      permission: "payment.manage (proposed finance.post) — not yet scoped",
      related: "Consumes sales, purchasing, inventory, and payroll events.",
    },
    {
      id: "sales",
      title: "Sales recognition",
      unavailable: "Revenue recognition rules, deferred revenue, refunds journal",
      why: "Order totals are operational — accounting revenue requires recognition policy and GL mapping.",
      entities: ["sales_invoices", "revenue_recognition_rules", "refund_journals"],
      apis: ["POST /api/v1/admin/finance/sales/post-from-order"],
      permission: "payment.read + order.manage for operational context",
      related: "Orders · POS · Delivery modules feed operational sales.",
    },
    {
      id: "ap",
      title: "Accounts payable",
      unavailable: "Supplier bills, three-way match, payment runs",
      why: "Customer payment.* permissions do not cover supplier payables.",
      entities: ["supplier_invoices", "accounts_payable", "payment_runs"],
      apis: ["GET /api/v1/admin/finance/payables", "POST /api/v1/admin/finance/supplier-payments"],
      permission: "payment.manage (supplier AP) — not yet scoped",
      related: "Purchasing module (Foundation) must ship first.",
    },
    {
      id: "ar",
      title: "Accounts receivable",
      unavailable: "Credit customers, aging, collections",
      why: "Walk-in and delivery orders settle at checkout — no trade receivables ledger yet.",
      entities: ["customer_invoices", "ar_aging_buckets", "collection_notes"],
      apis: ["GET /api/v1/admin/finance/receivables"],
      permission: "payment.read",
      related: "CRM provides customer context only — not AR balances.",
    },
    {
      id: "tax",
      title: "Tax compliance",
      unavailable: "Tax codes, returns, filing exports",
      why: "tax_amount on orders is not a substitute for configured tax engine and GL tax accounts.",
      entities: ["tax_codes", "tax_returns", "tax_journals"],
      apis: ["GET /api/v1/admin/finance/tax/summary"],
      permission: "payment.read",
      related: "Finance consumes posted sales and purchase tax lines.",
    },
    {
      id: "statements",
      title: "Financial statements",
      unavailable: "Trial balance, P&L, balance sheet, cash flow",
      why: "Statements require closed periods and posted ledger — cannot fabricate from order UI totals.",
      entities: ["trial_balance_snapshots", "financial_statements"],
      apis: ["GET /api/v1/admin/finance/statements/trial-balance", "GET /api/v1/admin/finance/statements/pl"],
      permission: "payment.read",
      related: "Reports module will consume statement APIs when available.",
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

export function buildFinanceInsights(branchLabel: string): FinanceInsightItem[] {
  return [
    {
      id: "no-ledger",
      title: "General ledger is not available",
      detail: `No journal entry or chart-of-accounts backend exists for ${branchLabel}. Finance cannot post transactions.`,
      source: "foundation",
    },
    {
      id: "no-ap",
      title: "Supplier payables linkage is missing",
      detail: "Purchasing is Foundation — supplier invoices and three-way match are required before payables.",
      source: "foundation",
    },
    {
      id: "no-ar",
      title: "Trade receivables are not configured",
      detail: "Customer orders settle at checkout — no AR aging or credit-invoice workflow in repository.",
      source: "foundation",
    },
    {
      id: "no-tax",
      title: "Tax configuration is absent",
      detail: "orders.tax_amount is not a tax engine — VAT/GST codes, returns, and GL tax accounts are missing.",
      source: "foundation",
    },
    {
      id: "no-cogs",
      title: "Inventory cost linkage is unavailable",
      detail: "No stock ledger or recipe COGS — gross margin cannot be calculated in Finance.",
      source: "foundation",
    },
    {
      id: "customer-payments",
      title: "Customer payments are operational only",
      detail: "payment.read covers order payment state — not supplier payments, bank reconciliation, or GL cash accounts.",
      source: "derived",
    },
  ];
}

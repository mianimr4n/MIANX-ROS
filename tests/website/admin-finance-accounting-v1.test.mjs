/**
 * Finance & Accounting V1 — live GL honesty wiring (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Finance & Accounting V1 (static)", () => {
  it("composes /admin/finance from reusable finance components", () => {
    const page = read("apps/website/client/src/pages/admin/AdminFinance.tsx");
    assert.match(page, /FinanceHeader/);
    assert.match(page, /FinanceStatusBanner/);
    assert.match(page, /FinanceKPIs/);
    assert.match(page, /SalesOverview/);
    assert.match(page, /CashPanel/);
    assert.match(page, /ReceivablePanel/);
    assert.match(page, /PayablePanel/);
    assert.match(page, /ExpensePanel/);
    assert.match(page, /TaxPanel/);
    assert.match(page, /LedgerPanel/);
    assert.match(page, /StatementsPanel/);
    assert.doesNotMatch(page, /FinanceFoundationPanel|FinanceReadinessSections|Integration readiness/);
    assert.match(page, /FinanceInsights/);
    assert.match(page, /canAccessAdminFinance/);
    assert.match(page, /listFinanceJournalEntries/);
    assert.match(page, /listSupplierInvoices/);
    assert.match(page, /fetchTrialBalance/);
    assert.match(page, /fetchProfitLoss/);
  });

  it("wires live GL without inventing journal figures in the browser", () => {
    const ledger = read("apps/website/client/src/components/admin/finance/LedgerPanel.tsx");
    assert.match(ledger, /No journal entries recorded yet/);
    assert.match(ledger, /createFinanceJournalEntry/);
    assert.doesNotMatch(ledger, /JE-\d{4}|fakeBalance|sampleJournal/i);
    const statements = read("apps/website/client/src/components/admin/finance/LedgerPanel.tsx");
    assert.match(statements, /Trial balance/);
    assert.match(statements, /No financial data available/);
    assert.match(statements, /Planned for Phase 2/);
    assert.doesNotMatch(statements, /totalAssets:\s*\d|netIncome:\s*5000|operatingCash:\s*\d/i);
  });

  it("does not treat order totals as accounting revenue in KPIs", () => {
    const kpis = read("apps/website/client/src/components/admin/finance/FinanceKPIs.tsx");
    assert.match(kpis, /Revenue \(accounting\)/);
    assert.match(kpis, /posted journals only/);
    const sales = read("apps/website/client/src/components/admin/finance/SalesOverview.tsx");
    assert.match(sales, /not recognized accounting revenue/);
    assert.match(sales, /Operational order totals/);
  });

  it("wires operational payables from Purchasing and keeps AR as Phase 2", () => {
    const panels = read("apps/website/client/src/components/admin/finance/FinancePanels.tsx");
    assert.match(panels, /Operational supplier invoices/);
    assert.match(panels, /No outstanding supplier invoices/);
    assert.match(panels, /Accounts receivable — Planned for Phase 2/);
    assert.match(panels, /listSupplierInvoices|SupplierInvoice|invoices/);
    const page = read("apps/website/client/src/pages/admin/AdminFinance.tsx");
    assert.match(page, /listSupplierInvoices/);
    assert.match(page, /outstandingPayables/);
  });

  it("tax panel does not fabricate VAT/GST figures", () => {
    const tax = read("apps/website/client/src/components/admin/finance/FinancePanels.tsx");
    assert.match(tax, /VAT\/GST returns — Planned for Phase 2/);
    assert.match(tax, /not a tax engine/);
    assert.doesNotMatch(tax, /vatRate|gstRate|taxLiability:\s*\d/i);
  });

  it("Mianx finance insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/finance/FinanceInsights.tsx");
    assert.match(insights, /Mianx\.ai Finance Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Live GL/);
    assert.doesNotMatch(insights, /profit prediction|fraud detection|forecasting|automated bookkeeping/i);
  });

  it("gates /admin/finance with finance.manage or payment/admin access", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminFinance/);
    assert.match(access, /finance\.manage/);
    assert.match(access, /payment\.read/);
    assert.match(access, /requiresFinance/);
    assert.match(access, /href: "\/admin\/finance"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminFinance/);
    assert.match(app, /path="\/admin\/finance"/);
    const page = read("apps/website/client/src/pages/admin/AdminFinance.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks document live CoA / GL and Phase 2 gaps", () => {
    const helper = read("apps/website/client/src/lib/admin-finance.ts");
    assert.match(helper, /chart_of_accounts/);
    assert.match(helper, /journal_entries/);
    assert.match(helper, /finance\.manage/);
    assert.match(helper, /status: "present"/);
    assert.match(helper, /Planned for Phase 2/);
    assert.match(helper, /id: "accounts-payable"[\s\S]*status: "partial"/);
  });
});

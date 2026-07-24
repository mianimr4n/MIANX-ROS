/**
 * Finance & Accounting V1 — composition and honesty wiring (static).
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
    assert.match(page, /FinanceFoundationPanel/);
    assert.match(page, /FinanceInsights/);
    assert.match(page, /canAccessAdminFinance/);
  });

  it("does not fabricate ledger entries or financial statements", () => {
    const ledger = read("apps/website/client/src/components/admin/finance/LedgerPanel.tsx");
    assert.match(ledger, /No journal entries in repository/);
    assert.doesNotMatch(ledger, /JE-\d+|journalEntry|debit:\s*\d|credit:\s*\d/i);
    const statements = read("apps/website/client/src/components/admin/finance/LedgerPanel.tsx");
    assert.match(statements, /Trial balance/);
    assert.match(statements, /will not fabricate statement figures/);
    assert.doesNotMatch(statements, /totalAssets|netIncome|operatingCash/i);
  });

  it("does not treat order totals as accounting revenue in KPIs", () => {
    const kpis = read("apps/website/client/src/components/admin/finance/FinanceKPIs.tsx");
    assert.match(kpis, /Revenue \(accounting\)/);
    assert.match(kpis, /FOUNDATION/);
    const sales = read("apps/website/client/src/components/admin/finance/SalesOverview.tsx");
    assert.match(sales, /not recognized accounting revenue/);
    assert.match(sales, /Operational order totals/);
  });

  it("payables and receivables remain Foundation without backend", () => {
    const panels = read("apps/website/client/src/components/admin/finance/FinancePanels.tsx");
    assert.match(panels, /Accounts payable foundation/);
    assert.match(panels, /Customer payment records are not[\s\S]*supplier payables/);
    assert.match(panels, /Accounts receivable unavailable/);
    assert.doesNotMatch(panels, /onPaySupplier|createInvoice|postJournal/i);
  });

  it("tax panel does not fabricate VAT/GST figures", () => {
    const tax = read("apps/website/client/src/components/admin/finance/FinancePanels.tsx");
    assert.match(tax, /Tax configuration foundation/);
    assert.match(tax, /not a tax engine/);
    assert.doesNotMatch(tax, /vatRate|gstRate|taxLiability:\s*\d/i);
  });

  it("Mianx finance insights remain rule-based only", () => {
    const insights = read("apps/website/client/src/components/admin/finance/FinanceInsights.tsx");
    assert.match(insights, /Mianx\.ai Finance Insights/);
    assert.match(insights, /Rule-based Summary/);
    assert.match(insights, /Missing ledger/);
    assert.doesNotMatch(insights, /profit prediction|fraud detection|forecasting|automated bookkeeping/i);
  });

  it("gates /admin/finance with canAccessAdminFinance (payment.read)", () => {
    const access = read("apps/website/client/src/lib/admin-access.ts");
    assert.match(access, /canAccessAdminFinance/);
    assert.match(access, /canReadFinance/);
    assert.match(access, /payment\.read/);
    assert.match(access, /requiresFinance/);
    assert.match(access, /href: "\/admin\/finance"/);
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /AdminFinance/);
    assert.match(app, /path="\/admin\/finance"/);
    const page = read("apps/website/client/src/pages/admin/AdminFinance.tsx");
    assert.match(page, /useAdminAccessGate/);
  });

  it("integration checks document missing accounting backend", () => {
    const helper = read("apps/website/client/src/lib/admin-finance.ts");
    assert.match(helper, /chart_of_accounts/);
    assert.match(helper, /journal_entries/);
    assert.match(helper, /finance\.manage/);
    assert.doesNotMatch(helper, /permissions\.includes\("finance\.manage"\)/);
  });
});

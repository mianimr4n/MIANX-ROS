import { describe, expect, it } from "vitest";

import { allocateReceiptAmount, classifyInvoiceStatus } from "../src/services/finance/ar-calc.js";
import { calculateInvoiceTaxTotals, calculateLineTax, roundMoney } from "../src/services/finance/tax-calc.js";
import { MAPPING_PURPOSES } from "../src/services/finance/operations.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  join(here, "../../../supabase/migrations/20260731190000_rc4_finance_phase2_foundation.sql"),
  "utf8",
);

describe("RC4-8 finance phase2 calc", () => {
  it("rounds money half-up to 2dp", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1.004)).toBe(1);
  });

  it("calculates exclusive and inclusive tax", () => {
    const exclusive = calculateLineTax(100, {
      rate: 0.16,
      taxBasis: "exclusive",
      isActive: true,
      effectiveFrom: "2026-01-01",
    }, "2026-07-31");
    expect(exclusive.taxAmount).toBe(16);
    expect(exclusive.grossAmount).toBe(116);

    const inclusive = calculateLineTax(116, {
      rate: 0.16,
      taxBasis: "inclusive",
      isActive: true,
      effectiveFrom: "2026-01-01",
    }, "2026-07-31");
    expect(inclusive.taxAmount).toBe(16);
    expect(inclusive.netAmount).toBe(100);
  });

  it("invoice totals apply discount before exclusive tax", () => {
    const totals = calculateInvoiceTaxTotals(
      [100, 50],
      { rate: 0.1, taxBasis: "exclusive", isActive: true, effectiveFrom: "2026-01-01" },
      "2026-07-31",
      50,
    );
    expect(totals.subtotal).toBe(150);
    expect(totals.discountAmount).toBe(50);
    expect(totals.taxAmount).toBe(10);
    expect(totals.totalAmount).toBe(110);
  });

  it("rejects over-allocation", () => {
    const bad = allocateReceiptAmount(50, [{ invoiceId: "a", amount: 60, balanceDue: 100 }]);
    expect(bad.ok).toBe(false);
    const good = allocateReceiptAmount(50, [{ invoiceId: "a", amount: 40, balanceDue: 100 }]);
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.remaining).toBe(10);
  });

  it("classifies overdue invoices", () => {
    expect(
      classifyInvoiceStatus({
        status: "ISSUED",
        balanceDue: 10,
        totalAmount: 10,
        dueDate: "2026-01-01",
        asOf: "2026-07-31",
      }),
    ).toBe("OVERDUE");
  });

  it("includes phase2 mapping purposes", () => {
    expect(MAPPING_PURPOSES).toContain("ar_control");
    expect(MAPPING_PURPOSES).toContain("cogs");
    expect(MAPPING_PURPOSES).toContain("sales_revenue");
    expect(MAPPING_PURPOSES).toContain("salary_expense");
    expect(MAPPING_PURPOSES).toContain("payroll_payable");
    expect(MAPPING_PURPOSES).toContain("payroll_deduction_payable");
  });

  it("phase2 service source includes payroll accrual and settlement posting", () => {
    const phase2 = readFileSync(join(here, "../src/services/finance/phase2.ts"), "utf8");
    expect(phase2).toMatch(/postPayrollAccrual/);
    expect(phase2).toMatch(/postPayrollSettlement/);
    expect(phase2).toMatch(/payroll_accrual:/);
    expect(phase2).toMatch(/payroll_settlement:/);
  });

  it("migration defines AR, tax, periods, BS/CF", () => {
    expect(migration).toMatch(/customer_invoices/);
    expect(migration).toMatch(/tax_definitions/);
    expect(migration).toMatch(/finance_periods/);
    expect(migration).toMatch(/finance_balance_sheet/);
    expect(migration).toMatch(/finance_cash_flow_indirect/);
    expect(migration).toMatch(/finance_exceptions/);
    expect(migration).toMatch(/inventory_asset/);
  });
});

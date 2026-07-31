/**
 * RC3 Finance PR1 — Admin Finance UI honesty for cash closes and expenses.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("RC3 finance operations UI", () => {
  it("exposes live cash closes and expense claims panels", () => {
    const panels = readFileSync(
      join(root, "apps/website/client/src/components/admin/finance/FinancePanels.tsx"),
      "utf8",
    );
    assert.match(panels, /No cash closes are awaiting review/);
    assert.match(panels, /No expense claims require approval/);
    assert.match(panels, /Journal posting requires account mapping/);
    assert.match(panels, /createCashReconciliation/);
    assert.match(panels, /createExpenseClaim/);
    assert.doesNotMatch(panels, /Dedicated expense claims — Planned for Phase 2/);
  });

  it("wires Owner finance attention from verified API", () => {
    const builders = readFileSync(
      join(root, "apps/website/client/src/components/admin/dashboard/owner-command-builders.ts"),
      "utf8",
    );
    const dashboard = readFileSync(
      join(root, "apps/website/client/src/pages/admin/AdminDashboard.tsx"),
      "utf8",
    );
    assert.match(builders, /Cash Closes Awaiting Approval/);
    assert.match(builders, /Unresolved Cash Variance/);
    assert.match(builders, /Pending Expense Approvals/);
    assert.match(builders, /Overdue Supplier Invoices/);
    assert.match(builders, /No elevated finance signals/);
    assert.match(dashboard, /fetchFinanceAttention/);
  });

  it("blocks payment on mismatch in purchasing UI", () => {
    const panels = readFileSync(
      join(root, "apps/website/client/src/components/admin/purchasing/ProcurementPanels.tsx"),
      "utf8",
    );
    assert.match(panels, /This invoice cannot be paid until the receiving mismatch is resolved/);
    assert.match(panels, /approveSupplierInvoiceException/);
    assert.match(panels, /Approve exception/);
  });
});

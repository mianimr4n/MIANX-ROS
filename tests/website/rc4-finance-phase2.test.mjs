import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("RC4-8 finance phase2 website honesty", () => {
  it("receivables and tax panels are Foundation (API exists; UI unwired)", () => {
    const panels = readFileSync(
      join(root, "apps/website/client/src/components/admin/finance/FinancePanels.tsx"),
      "utf8",
    );
    assert.match(panels, /Accounts receivable — Foundation/);
    assert.match(panels, /Tax configuration — Foundation/);
    assert.match(panels, /Filing Deferred|Filing DEFERRED/);
  });

  it("statements mark BS/CF as Foundation (unwired UI)", () => {
    const ledger = readFileSync(
      join(root, "apps/website/client/src/components/admin/finance/LedgerPanel.tsx"),
      "utf8",
    );
    assert.match(ledger, /Balance sheet/);
    assert.match(ledger, /Cash flow \(indirect\)/);
    assert.match(ledger, /Foundation/);
    assert.doesNotMatch(
      ledger,
      /\{ id: "balance-sheet", label: "Balance sheet", state: "LIVE" \}/,
    );
  });

  it("evidence pack present", () => {
    assert.equal(
      existsSync(join(root, "docs/testing/acceptance-evidence/rc4-finance-phase2/ACCOUNTING_EVENT_MAP.md")),
      true,
    );
  });
});

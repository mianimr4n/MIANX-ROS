/**
 * Contract guard for Production Owner smoke selectors.
 * Keeps `.tmp/rc6-prod-owner-smoke.mjs` / e2e aligned with rendered testids.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

describe("RC6 Owner smoke selector contract", () => {
  it("Branch Health and Profitability expose *-panel testids", () => {
    const branch = read("apps/website/client/src/components/admin/dashboard/BranchHealthPanel.tsx");
    const profit = read(
      "apps/website/client/src/components/admin/dashboard/ProfitabilityTruthPanel.tsx",
    );
    assert.match(branch, /data-testid="branch-health-panel"/);
    assert.match(profit, /data-testid="profitability-truth-panel"/);
    assert.doesNotMatch(branch, /data-testid="branch-health"/);
    assert.doesNotMatch(profit, /data-testid="profitability-truth"/);
  });

  it("command modes are radios in a radiogroup, not buttons", () => {
    const header = read("apps/website/client/src/components/admin/dashboard/CommandModeHeader.tsx");
    assert.match(header, /role="radiogroup"/);
    assert.match(header, /data-testid="command-mode-selector"/);
    assert.match(header, /type="radio"/);
    assert.match(header, /name="commandMode"/);
    assert.match(header, /Pre-open|COMMAND_MODE_ORDER/);
  });

  it("sign-out control is an aria-labelled button routing to login", () => {
    const shell = read("apps/website/client/src/pages/admin/AdminShell.tsx");
    assert.match(shell, /aria-label="Sign out"/);
    assert.match(shell, /setLocation\("\/admin\/login"\)/);
  });

  it("QA-03 e2e uses the same panel and mode contracts", () => {
    const e2e = read("e2e/rc5/owner-command-center-integration.spec.ts");
    assert.match(e2e, /branch-health-panel/);
    assert.match(e2e, /profitability-truth-panel/);
    assert.match(e2e, /command-mode-selector/);
    assert.match(e2e, /getByRole\("button", \{ name: \/Sign out\/i \}\)/);
    assert.match(e2e, /label[\s\S]*filter\(\{ hasText: mode\.label \}\)/);
  });

  it("dashboard role-home bounce waits for auth and skips signed-out principals", () => {
    const dash = read("apps/website/client/src/pages/admin/AdminDashboard.tsx");
    assert.match(dash, /if \(isAuthLoading\) return/);
    assert.match(dash, /if \(!isAuthenticated\) return/);
    assert.match(dash, /resolveStaffHome/);
    assert.match(dash, /isAuthenticated/);
  });
});

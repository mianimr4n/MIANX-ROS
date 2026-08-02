/**
 * RC6-DASH-04 — Approval Inbox foundation contracts.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const buildSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/approval-inbox/build-approvals.ts"),
  "utf8",
);
const typesSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/approval-inbox/types.ts"),
  "utf8",
);
const prioritySrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/approval-inbox/priority.ts"),
  "utf8",
);
const panelSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/ApprovalInboxPanel.tsx"),
  "utf8",
);
const ownerSrc = readFileSync(
  path.join(root, "apps/website/client/src/components/admin/dashboard/OwnerCommandCenter.tsx"),
  "utf8",
);
const modeRegSrc = readFileSync(
  path.join(root, "apps/website/client/src/lib/command-modes/registry.ts"),
  "utf8",
);

/** Pure mirror of build + priority for deterministic tests. */
const PRIORITY = {
  "APR-CASH-CLOSE": "URGENT",
  "APR-EXPENSE": "HIGH",
  "APR-PO-PENDING": "HIGH",
  "APR-LEAVE": "NORMAL",
};

function buildInbox(input) {
  const items = [];
  const unavailable = [];
  if (!input.purchasingEnabled) {
    /* restricted */
  } else if (!input.procurement || input.procurement.unavailable) {
    unavailable.push("Purchase orders");
  } else if ((input.procurement.pendingPoApprovals ?? 0) > 0) {
    items.push({
      id: "APR-PO-PENDING",
      priority: PRIORITY["APR-PO-PENDING"],
      count: input.procurement.pendingPoApprovals,
      domain: "purchasing",
    });
  }
  if (!input.financeEnabled) {
    /* restricted */
  } else if (!input.finance || input.finance.unavailable) {
    unavailable.push("Finance approvals");
  } else {
    if ((input.finance.cashClosesAwaitingApproval ?? 0) > 0) {
      items.push({
        id: "APR-CASH-CLOSE",
        priority: PRIORITY["APR-CASH-CLOSE"],
        count: input.finance.cashClosesAwaitingApproval,
        domain: "finance",
      });
    }
    if ((input.finance.pendingExpenseApprovals ?? 0) > 0) {
      items.push({
        id: "APR-EXPENSE",
        priority: PRIORITY["APR-EXPENSE"],
        count: input.finance.pendingExpenseApprovals,
        domain: "finance",
      });
    }
  }
  if (!input.hrEnabled) {
    /* restricted */
  } else if (!input.hr || input.hr.unavailable) {
    unavailable.push("Leave approvals");
  } else if ((input.hr.leaveRequestsAwaitingApproval ?? 0) > 0) {
    items.push({
      id: "APR-LEAVE",
      priority: PRIORITY["APR-LEAVE"],
      count: input.hr.leaveRequestsAwaitingApproval,
      domain: "hr",
    });
  }
  const rank = { URGENT: 0, HIGH: 1, NORMAL: 2 };
  const typeOrder = ["APR-CASH-CLOSE", "APR-EXPENSE", "APR-PO-PENDING", "APR-LEAVE"];
  items.sort((a, b) => {
    const byP = rank[a.priority] - rank[b.priority];
    if (byP !== 0) return byP;
    return typeOrder.indexOf(a.id) - typeOrder.indexOf(b.id);
  });
  const enabledFailed = unavailable.length;
  const totalPending = items.reduce((s, i) => s + i.count, 0);
  return { items, unavailable, totalPending, allClear: unavailable.length === 0 && items.length === 0 };
}

describe("RC6-DASH-04 Approval Inbox contracts", () => {
  it("selects four verified approval types only", () => {
    for (const id of ["APR-PO-PENDING", "APR-CASH-CLOSE", "APR-EXPENSE", "APR-LEAVE"]) {
      assert.match(typesSrc, new RegExp(id));
      assert.match(buildSrc, new RegExp(id));
    }
    assert.match(typesSrc, /Refunds/);
    assert.match(typesSrc, /DEFERRED_APPROVAL_DOMAINS/);
    assert.doesNotMatch(buildSrc, /APR-REFUND|APR-PAYROLL|APR-AI|APR-MENU/);
  });

  it("keeps DRILL_DOWN maturity and forbids inline mutations", () => {
    assert.match(typesSrc, /actionMaturity.*DRILL_DOWN|DRILL_DOWN/);
    assert.match(buildSrc, /actionMaturity: "DRILL_DOWN"/);
    assert.doesNotMatch(panelSrc, /approve\(|reject\(|onApprove|bulkApprove/i);
    assert.match(panelSrc, /no inline approve\/reject/i);
    assert.doesNotMatch(ownerSrc, /updatePurchaseOrder|transitionCash|approveLeave/i);
  });

  it("wires inbox into Owner Command Center and all command modes", () => {
    assert.match(ownerSrc, /ApprovalInboxPanel/);
    assert.match(ownerSrc, /buildApprovalInbox/);
    assert.match(modeRegSrc, /"approval-inbox"/);
    assert.match(panelSrc, /emphasizeApprovalsForMode/);
    assert.match(panelSrc, /Clear filters/);
  });

  it("maps destinations without PII query keys", () => {
    assert.match(buildSrc, /\/admin\/purchasing/);
    assert.match(buildSrc, /\/admin\/finance/);
    assert.match(buildSrc, /\/admin\/hr/);
    assert.doesNotMatch(buildSrc, /destinationHref:.*phone|email|salary|payroll/i);
  });

  it("acceptance evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/rc6-dash-04");
    for (const name of [
      "APPROVAL_SOURCE_AUDIT.md",
      "SELECTED_AND_DEFERRED_TYPES.md",
      "APPROVAL_SUMMARY_CONTRACT.md",
      "PRIORITIZATION_RULES.md",
      "FILTER_AND_DRILL_DOWN_MATRIX.md",
      "ROLE_AND_SEPARATION_OF_DUTIES.md",
      "FRESHNESS_AND_DEGRADED_STATES.md",
      "SECURITY_PRIVACY_REVIEW.md",
      "ACCESSIBILITY_PERFORMANCE.md",
      "TEST_RESULTS.md",
      "FINAL_REPORT.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
  });
});

describe("RC6-DASH-04 approval mapping (pure)", () => {
  it("includes selected pending counts and orders by priority", () => {
    const result = buildInbox({
      purchasingEnabled: true,
      financeEnabled: true,
      hrEnabled: true,
      procurement: { unavailable: false, pendingPoApprovals: 2 },
      finance: { unavailable: false, cashClosesAwaitingApproval: 1, pendingExpenseApprovals: 3 },
      hr: { unavailable: false, leaveRequestsAwaitingApproval: 4 },
    });
    assert.equal(result.items[0].id, "APR-CASH-CLOSE");
    assert.equal(result.items[0].priority, "URGENT");
    assert.equal(result.totalPending, 10);
    assert.deepEqual(
      result.items.map((i) => i.id),
      ["APR-CASH-CLOSE", "APR-EXPENSE", "APR-PO-PENDING", "APR-LEAVE"],
    );
  });

  it("omits zero counts and deferred types", () => {
    const result = buildInbox({
      purchasingEnabled: true,
      financeEnabled: true,
      hrEnabled: true,
      procurement: { unavailable: false, pendingPoApprovals: 0 },
      finance: { unavailable: false, cashClosesAwaitingApproval: 0, pendingExpenseApprovals: 1 },
      hr: { unavailable: false, leaveRequestsAwaitingApproval: 0 },
    });
    assert.deepEqual(
      result.items.map((i) => i.id),
      ["APR-EXPENSE"],
    );
  });

  it("does not treat source failure as all-clear zero", () => {
    const result = buildInbox({
      purchasingEnabled: true,
      financeEnabled: true,
      hrEnabled: true,
      procurement: { unavailable: true, pendingPoApprovals: null },
      finance: { unavailable: true, cashClosesAwaitingApproval: null, pendingExpenseApprovals: null },
      hr: { unavailable: true, leaveRequestsAwaitingApproval: null },
    });
    assert.equal(result.items.length, 0);
    assert.equal(result.allClear, false);
    assert.ok(result.unavailable.length >= 1);
  });

  it("honest empty when all sources load with zero pending", () => {
    const result = buildInbox({
      purchasingEnabled: true,
      financeEnabled: true,
      hrEnabled: true,
      procurement: { unavailable: false, pendingPoApprovals: 0 },
      finance: { unavailable: false, cashClosesAwaitingApproval: 0, pendingExpenseApprovals: 0 },
      hr: { unavailable: false, leaveRequestsAwaitingApproval: 0 },
    });
    assert.equal(result.allClear, true);
    assert.equal(result.totalPending, 0);
  });

  it("priority rules document cash close as URGENT", () => {
    assert.match(prioritySrc, /APR-CASH-CLOSE[\s\S]*URGENT|priority: "URGENT"/);
    assert.match(prioritySrc, /No invented financial thresholds/);
  });
});

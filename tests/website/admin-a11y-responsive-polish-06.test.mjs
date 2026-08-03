/**
 * POLISH-06 — Admin accessibility / responsive / route-matrix contracts (static).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

function registeredPaths() {
  const app = read("apps/website/client/src/App.tsx");
  return [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
}

describe("POLISH-06 Admin accessibility and responsive hardening", () => {
  it("registers an authoritative App.tsx route set (87 paths)", () => {
    const paths = registeredPaths();
    assert.equal(paths.length, 87);
    assert.ok(paths.includes("/"));
    assert.ok(paths.includes("/admin/dashboard"));
    assert.ok(paths.includes("/admin/settings"));
    assert.ok(paths.includes("/reset-password"));
    assert.ok(paths.includes("/404"));
  });

  it("defines a11y certification contract without legal WCAG claim", () => {
    const src = read("apps/website/client/src/lib/admin-a11y-contract.ts");
    assert.match(src, /ADMIN_A11Y_CERTIFICATION/);
    assert.match(src, /axeCriticalTarget: 0/);
    assert.match(src, /axeSeriousTarget: 0/);
    assert.match(src, /legalWcagClaimed: false/);
    assert.match(src, /ADMIN_RESPONSIVE_VIEWPORTS/);
    assert.match(src, /COVERED_BY_ROUTE_FAMILY/);
  });

  it("AdminShell provides skip link, one main, mobile drawer focus trap", () => {
    const shell = read("apps/website/client/src/pages/admin/AdminShell.tsx");
    assert.match(shell, /Skip to content/);
    assert.match(shell, /id="admin-main"/);
    assert.match(shell, /<main id="admin-main"/);
    assert.match(shell, /aria-label="Admin navigation"/);
    assert.match(shell, /data-admin-mobile-drawer/);
    assert.match(shell, /focusables/);
    assert.match(shell, /document\.body\.style\.overflow/);
    assert.match(shell, /role=\{sidebarOpen && !isLgUp \? "dialog"/);
    assert.match(shell, /aria-label=\{`Active operational branch:/);
    assert.match(shell, /aria-label="Sign out"/);
    assert.match(shell, /motion-reduce:transition-none/);
  });

  it("sidebar nav exposes aria-current and group expand state", () => {
    const nav = read("apps/website/client/src/components/admin/shell/AdminSidebarNav.tsx");
    assert.match(nav, /aria-label="Admin modules"/);
    assert.match(nav, /aria-current/);
    assert.match(nav, /aria-expanded/);
    assert.match(nav, /aria-controls/);
  });

  it("module navigator is always named and Ctrl/Cmd+K skips form fields", () => {
    const nav = read("apps/website/client/src/components/admin/shell/AdminModuleNavigator.tsx");
    assert.match(nav, /aria-label="Go to module"/);
    assert.match(nav, /contenteditable='true'/);
    assert.match(nav, /role='textbox'/);
    assert.match(nav, /title="Go to module"/);
  });

  it("AdminShell owns the page h1; representative module titles are not h1", () => {
    const shell = read("apps/website/client/src/pages/admin/AdminShell.tsx");
    assert.match(shell, /<h1 className="truncate text-lg font-semibold tracking-tight">\{resolvedTitle\}<\/h1>/);
    for (const file of [
      "apps/website/client/src/components/admin/inventory/InventoryHeader.tsx",
      "apps/website/client/src/components/admin/purchasing/PurchasingHeader.tsx",
      "apps/website/client/src/components/admin/settings/SettingsHeader.tsx",
      "apps/website/client/src/components/admin/hr/HRHeader.tsx",
      "apps/website/client/src/components/admin/finance/FinanceHeader.tsx",
      "apps/website/client/src/components/admin/menu/MenuHeader.tsx",
      "apps/website/client/src/components/admin/reports/ReportsHeader.tsx",
      "apps/website/client/src/components/admin/crm/CRMHeader.tsx",
      "apps/website/client/src/components/admin/operations/OperationsWorkspaceHeader.tsx",
    ]) {
      const src = read(file);
      assert.match(src, /data-admin-page-title/);
      assert.doesNotMatch(src, /<h1[\s>]/);
    }
  });

  it("shared data states announce errors assertively without fetching", () => {
    const src = read("apps/website/client/src/components/admin/AdminDataState.tsx");
    assert.match(src, /aria-live=\{live\}/);
    assert.match(src, /assertive/);
    assert.doesNotMatch(src, /fetch\(|axios|useQuery/);
  });

  it("Orders and Delivery tables expose accessible names and overflow wrappers", () => {
    const orders = read("apps/website/client/src/components/admin/orders/OrderGrid.tsx");
    assert.match(orders, /overflow-x-auto/);
    assert.match(orders, /aria-label="Orders for current filters"/);
    assert.match(orders, /<caption className="sr-only"/);
    const delivery = read("apps/website/client/src/components/admin/delivery/DispatchQueue.tsx");
    assert.match(delivery, /overflow-x-auto/);
    assert.match(delivery, /aria-label="Delivery dispatch queue"/);
  });

  it("admin CSS respects prefers-reduced-motion", () => {
    const css = read("apps/website/client/src/index.css");
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /\.admin-shell \*/);
  });

  it("public a11y suite remains present for home/menu/login", () => {
    const e2e = read("e2e/rc6/a11y-02-public.spec.ts");
    assert.match(e2e, /criticalSerious/);
    assert.match(e2e, /\/admin\/login/);
    assert.match(e2e, /assertNoOverflow/);
    assert.match(e2e, /@axe-core\/playwright/);
  });

  it("does not add new UI framework dependencies", () => {
    const pkg = read("apps/website/package.json");
    assert.doesNotMatch(pkg, /"@mui\/|"antd"|"chakra-ui"/);
    const rootPkg = read("package.json");
    assert.match(rootPkg, /"@axe-core\/playwright": "4\.10\.2"/);
  });

  it("evidence pack exists with required POLISH-06 documents", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/phase1-polish-06");
    const required = [
      "FINAL_REPORT.md",
      "AUTHORITATIVE_ROUTE_MATRIX.md",
      "CERTIFICATION_STANDARD.md",
      "AXE_MATRIX.md",
      "RESPONSIVE_VIEWPORT_MATRIX.md",
      "BASELINE_AND_POLISH05_MERGE.md",
      "RESIDUAL_FINDINGS.md",
    ];
    for (const name of required) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
    assert.ok(readdirSync(dir).length >= 20);
  });
});

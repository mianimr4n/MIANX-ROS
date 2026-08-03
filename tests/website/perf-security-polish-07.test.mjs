/**
 * POLISH-07 — performance, network, security and privacy contracts (static).
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

describe("POLISH-07 performance, network and privacy", () => {
  it("defines performance budgets and storage contracts", () => {
    const src = read("apps/website/client/src/lib/admin-performance-contract.ts");
    assert.match(src, /PERFORMANCE_BUDGETS/);
    assert.match(src, /publicEntryGzipKbMax/);
    assert.match(src, /duplicateIdenticalConcurrentReadsMax: 0/);
    assert.match(src, /BROWSER_STORAGE_ALLOWLIST_AFTER_LOGOUT/);
    assert.match(src, /BROWSER_STORAGE_CLEAR_ON_LOGOUT_PREFIXES/);
    assert.match(src, /pausePollingWhenDocumentHidden: true/);
    assert.match(src, /csvFormulaInjectionGuard: true/);
  });

  it("provides identical in-flight read sharing without caching failures", () => {
    const src = read("apps/website/client/src/lib/request-share.ts");
    assert.match(src, /export function shareIdenticalRead/);
    assert.match(src, /inflight\.delete/);
    assert.match(src, /clearInflightReads/);
    assert.match(src, /\.finally\(/);
    assert.doesNotMatch(src, /localStorage|sessionStorage/);
  });

  it("public App entry does not eager-import AdminShell or Admin routes beyond login", () => {
    const app = read("apps/website/client/src/App.tsx");
    assert.match(app, /import AdminLogin from/);
    assert.match(app, /lazy\(\(\) => import\("\.\/pages\/admin\/AdminDashboard"\)\)/);
    assert.match(app, /lazy\(\(\) => import\("\.\/pages\/admin\/AdminOrders"\)\)/);
    assert.doesNotMatch(app, /^import .*AdminShell/m);
    assert.doesNotMatch(app, /^import .*AdminDashboard/m);
    assert.doesNotMatch(app, /@axe-core/);
  });

  it("module navigator does not import route page modules", () => {
    const nav = read("apps/website/client/src/components/admin/shell/AdminModuleNavigator.tsx");
    assert.doesNotMatch(nav, /pages\/admin\/Admin/);
    assert.match(nav, /filterAdminNavByQuery/);
  });

  it("useOperationalData pauses polling while the document is hidden", () => {
    const src = read("apps/website/client/src/lib/op-status.ts");
    assert.match(src, /visibilitychange/);
    assert.match(src, /visibilityState === "hidden"/);
    assert.match(src, /AbortController/);
    assert.match(src, /controller\.abort/);
  });

  it("logout clears private browser persistence prefixes", () => {
    const auth = read("apps/website/client/src/contexts/AuthContext.tsx");
    assert.match(auth, /clearPrivateBrowserPersistence/);
    const contract = read("apps/website/client/src/lib/admin-performance-contract.ts");
    assert.match(contract, /telepizza\.orders/);
    assert.match(contract, /telepizza\.customer\.addresses\./);
    assert.match(contract, /telepizza\.loyalty\.points/);
    const clearer = read("apps/website/client/src/lib/clear-private-browser-persistence.ts");
    assert.match(clearer, /BROWSER_STORAGE_CLEAR_ON_LOGOUT_PREFIXES/);
    assert.match(clearer, /clearInflightReads/);
  });

  it("EOD CSV guards formula injection and revokes object URLs", () => {
    const src = read("apps/website/client/src/lib/eod-pack/export.ts");
    assert.match(src, /formula injection/i);
    assert.match(src, /Mitigate spreadsheet/);
    assert.match(src, /revokeObjectURL/);
  });

  it("submit-order does not console-dump error payloads", () => {
    const src = read("apps/website/client/src/lib/submit-order.ts");
    assert.match(src, /console\.warn\("API order failed; saving locally\."\)/);
    assert.doesNotMatch(src, /console\.warn\("API order failed; saving locally\.", error\)/);
  });

  it("Vite build does not enable production source maps and keeps min chunk merge", () => {
    const vite = read("apps/website/vite.config.ts");
    assert.doesNotMatch(vite, /sourcemap:\s*true/);
    assert.match(vite, /experimentalMinChunkSize:\s*12_000/);
  });

  it("vercel.json does not invent CSP without evidence (headers NOT_CONFIGURED)", () => {
    const vercel = read("apps/website/vercel.json");
    assert.doesNotMatch(vercel, /Content-Security-Policy/);
  });

  it("no new UI framework or analytics SDK dependency", () => {
    const pkg = read("apps/website/package.json");
    assert.doesNotMatch(pkg, /"@mui\/|"antd"|"chakra-ui"|"@sentry\/|"mixpanel"|"segment"/);
    const rootPkg = read("package.json");
    assert.match(rootPkg, /"@axe-core\/playwright"/);
  });

  it("evidence pack exists", () => {
    const dir = path.join(root, "docs/testing/acceptance-evidence/phase1-polish-07");
    for (const name of [
      "FINAL_REPORT.md",
      "PERFORMANCE_BUDGETS.md",
      "REQUEST_INVENTORY.md",
      "FINDINGS_REGISTER.md",
      "BASELINE_AND_POLISH06_MERGE.md",
      "RESIDUAL_FINDINGS.md",
    ]) {
      assert.equal(existsSync(path.join(dir, name)), true, name);
    }
    assert.ok(readdirSync(dir).length >= 20);
  });
});

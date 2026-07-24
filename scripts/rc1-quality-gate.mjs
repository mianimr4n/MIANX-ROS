/**
 * RC1 Quality Gate — blocking checks + known non-blocking debt.
 * Usage: node scripts/rc1-quality-gate.mjs   OR   pnpm rc1:gate
 * Exit 0 = PASS WITH KNOWN DEBT (or clean PASS if no debt)
 * Exit 1 = BLOCKING FAILURE
 * Does not mutate sources. Does not commit evidence by default.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const rows = [];

function run(label, cmd, args, opts = {}) {
  const started = Date.now();
  const useShell = opts.shell ?? (process.platform === "win32" && cmd !== process.execPath);
  console.log(`\n>> ${label}\n   $ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: useShell,
    cwd: resolve("."),
    env: process.env,
  });
  const durationMs = Date.now() - started;
  const status = r.status === 0 ? "PASS" : "FAIL";
  rows.push({ label, status, exitCode: r.status, durationMs, kind: "blocking" });
  console.log(`   ${status} (${durationMs}ms) exit=${r.status}`);
  if (status === "FAIL" && opts.failFast !== false) {
    const tail = `${r.stdout || ""}${r.stderr || ""}`.split(/\n/).slice(-12).join("\n");
    if (tail.trim()) console.log(tail);
  }
  return status === "PASS";
}

function debt(label, reason) {
  rows.push({ label, status: "KNOWN-DEBT", reason, kind: "debt" });
  console.log(`\n>> ${label}\n   KNOWN-DEBT — ${reason}`);
}

function skip(label, reason) {
  rows.push({ label, status: "SKIP", reason, kind: "optional" });
  console.log(`\n>> ${label}\n   SKIP — ${reason}`);
}

console.log("RC1 QUALITY GATE");
console.log("================");

/**
 * Backend Vitest under sequential gate load previously crashed with:
 *   [vitest-pool]: Worker forks emitted error / Worker exited unexpectedly
 * after the memory-heavy website build. Tooling mitigation (F-owned gate only):
 * 1) Run backend tests BEFORE website build.
 * 2) Invoke Vitest with a single fork worker and no file parallelism
 *    (CLI flags only — does not change vitest.config.ts or product tests).
 */
let ok = true;
ok = run("local:guard", "pnpm", ["local:guard"]) && ok;
ok = run("website typecheck", "pnpm", ["check:website"]) && ok;
ok = run("backend typecheck", "pnpm", ["check:backend"]) && ok;
// Backend tests before website build — avoids Vitest worker OOM/exit under post-build pressure.
ok =
  run(
    "backend tests",
    "pnpm",
    [
      "--filter",
      "@telepizza/api",
      "exec",
      "vitest",
      "run",
      "--pool=forks",
      "--maxWorkers=1",
      "--fileParallelism=false",
    ],
    {
      shell: process.platform === "win32",
    },
  ) && ok;
ok = run("website build", "pnpm", ["--filter", "telepizza-pakistan", "build"]) && ok;
ok =
  run(
    "admin static suites",
    process.execPath,
    [
      "--test",
      "tests/website/admin-erp-foundation-s1.test.mjs",
      "tests/website/admin-crm-v1.test.mjs",
      "tests/website/admin-delivery-management-v1.test.mjs",
      "tests/website/admin-executive-dashboard-v1.test.mjs",
      "tests/website/admin-finance-accounting-v1.test.mjs",
      "tests/website/admin-hr-workforce-management-v1.test.mjs",
      "tests/website/admin-inventory-management-v1.test.mjs",
      "tests/website/admin-kitchen-display-v1.test.mjs",
      "tests/website/admin-kitchen-manager-dashboard-v1.test.mjs",
      "tests/website/admin-loyalty-rewards-v1.test.mjs",
      "tests/website/admin-menu-management-v1.test.mjs",
      "tests/website/admin-orders-management-v1.test.mjs",
      "tests/website/admin-pos-v1.test.mjs",
      "tests/website/admin-purchasing-suppliers-v1.test.mjs",
      "tests/website/admin-reports-business-intelligence-v1.test.mjs",
      "tests/website/admin-settings-configuration-v1.test.mjs",
      "tests/website/admin-whatsapp-order-center-v1.test.mjs",
    ],
    { shell: false },
  ) && ok;
ok = run("auth/branch matrix", process.execPath, ["scripts/rc1/auth-branch-matrix.mjs"], { shell: false }) && ok;
ok = run("KDS authorization", process.execPath, ["scripts/rc1/kds-auth.mjs"], { shell: false }) && ok;

skip(
  "BM browser acceptance",
  "NON-BLOCKING OPTIONAL ACCEPTANCE — run manually: node scripts/rc1/bm-landing.mjs",
);

// auth-foundation getSession drift corrected in F; full test:db remains broader and may include other debt.

const blockingFails = rows.filter((r) => r.kind === "blocking" && r.status === "FAIL");
const debts = rows.filter((r) => r.kind === "debt");

console.log("\n================");
console.log(`BLOCKING FAILURES: ${blockingFails.length}`);
console.log(`KNOWN NON-BLOCKING DEBT: ${debts.length}`);
for (const d of debts) console.log(`  - ${d.label}`);

if (blockingFails.length > 0) {
  console.log("RESULT: FAIL");
  process.exit(1);
}

console.log(debts.length > 0 ? "RESULT: PASS WITH KNOWN DEBT" : "RESULT: PASS");
process.exit(0);

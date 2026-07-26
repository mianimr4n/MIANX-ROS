/**
 * Rebuild variant-reference evidence with a simple recursive walk (no shell rg).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(
  root,
  "docs",
  "testing",
  "acceptance-evidence",
  "menu-variant-runtime-references.json",
);

const ROOTS = ["apps/website/client/src", "backend/api/src", "supabase/migrations", "tests", "scripts", "docs/architecture"];
const EXTS = new Set([".ts", ".tsx", ".mjs", ".js", ".sql", ".md"]);
const NEEDLE =
  /menu_item_variants|\bvariantId\b|\bvariant_id\b|\bselectedVariant\b|resolveVariantPrice|getDefaultVariant|\bitem\.variants\b|\bproduct\.variants\b/g;

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (EXTS.has(name.slice(name.lastIndexOf(".")))) files.push(full);
  }
  return files;
}

function classify(rel, line) {
  const path = rel.replace(/\\/g, "/");
  const text = line.toLowerCase();
  if (
    path.includes("scan-variant-runtime-refs") ||
    path.includes("reconcile-menu-catalog") ||
    path.includes("reconcile-canonical-menu-counts") ||
    path.includes("generate-menu-fallback") ||
    path.includes("verify-menu-price-definition-conflicts") ||
    path.includes("verify-canonical-menu") ||
    path.includes("verify-menu-audit") ||
    path.includes("dry-run-canonical-menu") ||
    path.includes("apply-founder-price-decision") ||
    path.includes("sync-local-db-founder-prices")
  ) {
    return "TEST COMPATIBILITY";
  }
  if (path.includes("20260725130000") || path.includes("20260725140000") || path.includes("migrations/")) {
    return "MIGRATION COMPATIBILITY";
  }
  if (path.includes(".test.") || path.includes("/tests/") || path.includes("e2e/")) {
    return "TEST COMPATIBILITY";
  }
  if (
    text.includes("deprecated") ||
    text.includes("historical") ||
    text.includes("never consult") ||
    text.includes("not a pricing") ||
    text.includes("must not remain")
  ) {
    return "MIGRATION COMPATIBILITY";
  }
  if (path.includes("ORDERS_ARCHITECTURE.md")) {
    return "HISTORICAL ORDER READ";
  }
  if (text.includes("variant_name") || text.includes("variantname") || text.includes("variantlabel")) {
    return "HISTORICAL ORDER READ";
  }
  if (text.includes("variant_id") && (path.includes("orders") || path.includes("kitchen"))) {
    return "HISTORICAL ORDER READ";
  }
  if (
    /from\(\s*['"]menu_item_variants['"]\s*\)/.test(line) ||
    /\bitem\.variants\b/.test(line) ||
    /\bproduct\.variants\b/.test(line) ||
    /resolveVariantPrice|getDefaultVariant/.test(line)
  ) {
    return "ACTIVE RUNTIME BLOCKER";
  }
  return "UNUSED";
}

const refs = [];
for (const base of ROOTS) {
  for (const file of walk(join(root, base))) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      NEEDLE.lastIndex = 0;
      if (!NEEDLE.test(line)) return;
      refs.push({
        file: rel,
        line: index + 1,
        excerpt: line.trim().slice(0, 220),
        classification: classify(rel, line),
      });
    });
  }
}

const blockers = refs.filter((r) => r.classification === "ACTIVE RUNTIME BLOCKER");
const report = {
  generatedAt: new Date().toISOString(),
  gate: blockers.length === 0 ? "PASS" : "FAIL",
  blockerCount: blockers.length,
  countsByClass: refs.reduce((acc, r) => {
    acc[r.classification] = (acc[r.classification] ?? 0) + 1;
    return acc;
  }, {}),
  references: refs,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, gate: report.gate, countsByClass: report.countsByClass, blockerCount: blockers.length }, null, 2));
if (blockers.length) {
  console.error(blockers.slice(0, 20));
  process.exit(1);
}

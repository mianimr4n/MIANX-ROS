/**
 * Phase 5 + Phase 10 evidence — atomic price audit rollback and historical order
 * compatibility, verified against the live local database.
 *
 * LOCAL ONLY. Every mutation runs inside a transaction that is rolled back.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTAINER = "supabase_db_telepizza-platform";
const dbIndex = process.argv.indexOf("--db");
const DB = dbIndex >= 0 ? process.argv[dbIndex + 1] : "postgres";

function query(sql) {
  const res = spawnSync(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", DB, "-t", "-A", "-F", "|", "-c", sql],
    { encoding: "utf8" },
  );
  return {
    exitCode: res.status,
    rows: (res.stdout || "")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("|")),
    stderr: (res.stderr || "").trim(),
  };
}

function runFile(relSqlPath) {
  const abs = join(root, relSqlPath);
  const name = relSqlPath.split("/").pop();
  const copy = spawnSync("docker", ["cp", abs, `${CONTAINER}:/tmp/${name}`], { encoding: "utf8" });
  if (copy.status !== 0) throw new Error(`docker cp failed: ${copy.stderr}`);
  const res = spawnSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", "postgres", "-d", DB, "-f", `/tmp/${name}`],
    { encoding: "utf8" },
  );
  return { exitCode: res.status, stdout: (res.stdout || "").trim(), stderr: (res.stderr || "").trim() };
}

// ---------------------------------------------------------------- Phase 5
const rollback = runFile("scripts/sql/prove-menu-price-audit-rollback.sql");
const rollbackLine = rollback.stdout
  .split("\n")
  .map((l) => l.trim())
  .find((l) => /^t\s*\||^f\s*\|/.test(l) || /\bt\b\s*\|\s*\d+/.test(l));
const auditRollback = {
  sqlFile: "scripts/sql/prove-menu-price-audit-rollback.sql",
  exitCode: rollback.exitCode,
  sawInducedFailure: /INDUCED_AUDIT_FAILURE/.test(rollback.stdout + rollback.stderr),
  priceUnchanged: /(^|\|)\s*t\s*\|/.test(rollbackLine ?? "") || / t \| +0/.test(rollback.stdout),
  auditRowsWritten: Number((rollbackLine ?? "|0").split("|").pop()),
  transactionRolledBack: /ROLLBACK/.test(rollback.stdout),
};

const rpcExists = query(
  "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='update_menu_item_price_atomic';",
);

// ---------------------------------------------------------------- Phase 10
const historical = {
  orderItemsTotal: Number(query("select count(*) from order_items;").rows[0]?.[0] ?? 0),
  orderItemsWithVariantId: Number(
    query("select count(*) from order_items where variant_id is not null;").rows[0]?.[0] ?? 0,
  ),
  orderItemsWithMenuItem: Number(
    query("select count(*) from order_items where menu_item_id is not null;").rows[0]?.[0] ?? 0,
  ),
  orphanedOrderItems: Number(
    query(
      "select count(*) from order_items oi left join orders o on o.id=oi.order_id where o.id is null;",
    ).rows[0]?.[0] ?? 0,
  ),
  orderItemsWithNullSnapshotName: Number(
    query("select count(*) from order_items where item_name is null or item_name='';").rows[0]?.[0] ?? 0,
  ),
  orderItemsWithNullUnitPrice: Number(
    query("select count(*) from order_items where unit_price is null;").rows[0]?.[0] ?? 0,
  ),
  orderItemModifiers: Number(query("select count(*) from order_item_modifiers;").rows[0]?.[0] ?? 0),
  orphanedModifiers: Number(
    query(
      "select count(*) from order_item_modifiers m left join order_items oi on oi.id=m.order_item_id where oi.id is null;",
    ).rows[0]?.[0] ?? 0,
  ),
  danglingVariantIds: Number(
    query(
      "select count(*) from order_items oi where oi.variant_id is not null and not exists (select 1 from menu_item_variants v where v.id=oi.variant_id);",
    ).rows[0]?.[0] ?? 0,
  ),
  variantSkuMappings: Number(query("select count(*) from menu_variant_sku_mappings;").rows[0]?.[0] ?? 0),
  variantsWithoutSkuMapping: Number(
    query(
      "select count(*) from menu_item_variants v where not exists (select 1 from menu_variant_sku_mappings m where m.variant_id=v.id);",
    ).rows[0]?.[0] ?? 0,
  ),
  menuItemsNullPrice: Number(query("select count(*) from menu_items where price is null;").rows[0]?.[0] ?? 0),
  menuItemsNegativePrice: Number(query("select count(*) from menu_items where price < 0;").rows[0]?.[0] ?? 0),
  duplicateSkuSlugs: Number(
    query("select count(*) from (select slug from menu_items group by slug having count(*)>1) d;").rows[0]?.[0] ?? 0,
  ),
  duplicateSemanticProducts: Number(
    query(
      "select count(*) from (select product_group_slug, coalesce(size_label,'') sl from menu_items group by 1,2 having count(*)>1) d;",
    ).rows[0]?.[0] ?? 0,
  ),
  branchOverridesActive: Number(
    query("select count(*) from branch_menu_item_overrides where is_active is true;").rows[0]?.[0] ?? 0,
  ),
  northernBypassStatus:
    query("select status from branches where branch_code like '%northern%';").rows[0]?.[0] ?? "n/a",
  operatingBranches: query("select branch_code || '=' || status from branches order by branch_code;").rows.map(
    (r) => r[0],
  ),
};

const evidence = {
  generatedAt: new Date().toISOString(),
  scope: "LOCAL ONLY — production data untouched",
  database: DB,
  priceAuditAtomicity: { rpcPresent: Number(rpcExists.rows[0]?.[0] ?? 0) === 1, ...auditRollback },
  historicalCompatibility: historical,
};

evidence.gate =
  evidence.priceAuditAtomicity.rpcPresent &&
  evidence.priceAuditAtomicity.sawInducedFailure &&
  evidence.priceAuditAtomicity.auditRowsWritten === 0 &&
  historical.orphanedOrderItems === 0 &&
  historical.orphanedModifiers === 0 &&
  historical.danglingVariantIds === 0 &&
  historical.orderItemsWithNullSnapshotName === 0 &&
  historical.orderItemsWithNullUnitPrice === 0 &&
  historical.variantsWithoutSkuMapping === 0 &&
  historical.menuItemsNullPrice === 0 &&
  historical.menuItemsNegativePrice === 0 &&
  historical.duplicateSkuSlugs === 0 &&
  historical.duplicateSemanticProducts === 0 &&
  historical.branchOverridesActive === 0
    ? "PASS"
    : "FAIL";

const outPath = join(
  root,
  "docs",
  "testing",
  "acceptance-evidence",
  "canonical-menu-audit-and-historical.json",
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.gate === "PASS" ? 0 : 1);

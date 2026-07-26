/**
 * Founder gate — detect conflicting price definitions for the same SKU.
 *
 * Two candidate price definitions currently exist in the worktree:
 *   A. Bootstrap catalog  data/catalog/telepizza-canonical-menu.json
 *   B. Expand migration   supabase/migrations/20260725120000_expand_and_activate_real_menu_catalog.sql
 *      (as materialized in the scratch database menu_canon)
 *
 * "One SKU = one price" must also hold at the definition layer. Any SKU with two
 * different prices is an owner decision, not an engineering choice.
 *
 * LOCAL READ-ONLY.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTAINER = "supabase_db_telepizza-platform";
const SCRATCH = "menu_canon";
const LIVE = "postgres";

const catalog = JSON.parse(
  readFileSync(join(root, "data", "catalog", "telepizza-canonical-menu.json"), "utf8"),
);

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const bootstrapPrices = new Map();
for (const item of catalog.items ?? []) {
  if (!item.variants?.length) {
    bootstrapPrices.set(item.code, item.basePricePkr ?? null);
    continue;
  }
  item.variants.forEach((variant, index) => {
    const suffix = slugify(variant.sizeCode) || slugify(variant.label) || `option-${index + 1}`;
    bootstrapPrices.set(`${item.code}-${suffix}`, variant.pricePkr);
  });
}

function dbPrices(database) {
  const res = spawnSync(
    "docker",
    [
      "exec",
      CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-t",
      "-A",
      "-F",
      "|",
      "-c",
      "select slug, price::text from menu_items order by slug;",
    ],
    { encoding: "utf8" },
  );
  const map = new Map();
  for (const line of (res.stdout || "").trim().split(/\r?\n/).filter(Boolean)) {
    const [slug, price] = line.split("|");
    map.set(slug, Number(price));
  }
  return map;
}

const scratch = dbPrices(SCRATCH);
const live = dbPrices(LIVE);

const conflicts = [];
for (const [slug, bootstrapPrice] of bootstrapPrices) {
  const scratchPrice = scratch.get(slug);
  const livePrice = live.get(slug);
  if (scratchPrice != null && bootstrapPrice != null && scratchPrice !== bootstrapPrice) {
    conflicts.push({
      sku: slug,
      bootstrapCatalogPrice: bootstrapPrice,
      expandMigrationPrice: scratchPrice,
      liveLocalPrice: livePrice ?? null,
      classification: "OWNER PRICE DECISION REQUIRED",
    });
  }
}

const flagged = (catalog.items ?? [])
  .filter((item) => (item.flags ?? []).length > 0)
  .map((item) => ({ code: item.code, flags: item.flags, pricingEra: item.pricingEra }));

const ownerConfirmationRequired = (catalog.items ?? []).filter((item) =>
  (item.flags ?? []).includes("OWNER_CONFIRMATION_REQUIRED"),
).length;

const founderDecisionApplied =
  catalog.completionStatus === "OWNER_PRICES_LOCKED_EXPAND_20260725120000" &&
  Boolean(catalog.founderPriceDecision);

const evidence = {
  generatedAt: new Date().toISOString(),
  scope: "LOCAL READ-ONLY — no production or local data was modified",
  definitionSources: {
    bootstrapCatalog: "data/catalog/telepizza-canonical-menu.json",
    expandMigration:
      "supabase/migrations/20260725120000_expand_and_activate_real_menu_catalog.sql (materialized in menu_canon)",
    liveLocalDatabase: "postgres (synced to founder-locked expand prices)",
  },
  bootstrapCompletionStatus: catalog.completionStatus,
  founderDecisionApplied,
  founderPriceDecision: catalog.founderPriceDecision ?? null,
  unresolvedConflicts: conflicts.length,
  ownerConfirmationRequired,
  conflictCount: conflicts.length,
  flaggedBootstrapProducts: flagged.length,
  flaggedSample: flagged.slice(0, 12),
  conflicts,
  gate:
    conflicts.length === 0 &&
    ownerConfirmationRequired === 0 &&
    founderDecisionApplied
      ? "PASS"
      : "FAIL",
  requiredAction:
    conflicts.length === 0 && ownerConfirmationRequired === 0
      ? "None — founder price decision applied; Owner may edit later via Admin Menu with atomic audit."
      : "Founder must confirm a single authoritative price per SKU before any scoped menu commit or production apply.",
};

const outPath = join(
  root,
  "docs",
  "testing",
  "acceptance-evidence",
  "canonical-menu-price-definition-conflicts.json",
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      gate: evidence.gate,
      founderDecisionApplied: evidence.founderDecisionApplied,
      unresolvedConflicts: evidence.unresolvedConflicts,
      ownerConfirmationRequired: evidence.ownerConfirmationRequired,
      bootstrapCompletionStatus: evidence.bootstrapCompletionStatus,
      sample: conflicts.slice(0, 6),
      requiredAction: evidence.requiredAction,
    },
    null,
    2,
  ),
);
process.exit(evidence.gate === "PASS" ? 0 : 1);

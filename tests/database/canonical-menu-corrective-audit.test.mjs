import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checksumCanonicalCatalogFile } from "../../scripts/lib/canonical-menu-checksum.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("canonical menu corrective — transactional audit + variant guard", () => {
  const sql = read("supabase/migrations/20260725140000_canonical_menu_price_audit_atomic.sql");

  it("defines an atomic price update function", () => {
    assert.match(sql, /create or replace function public\.update_menu_item_price_atomic/i);
    assert.match(sql, /for update/i);
    assert.match(sql, /insert into public\.menu_audit_events/i);
    assert.match(sql, /item\.price_change/);
    assert.match(sql, /idempotentReplay/);
    assert.match(sql, /PRICE_INVALID/);
    assert.match(sql, /PRICE_CONFLICT/);
    const codeOnly = sql
      .replace(/--[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ");
    assert.doesNotMatch(codeOnly, /\btruncate\b/i);
    assert.doesNotMatch(codeOnly, /\bdelete\s+from\s+public\.menu_/i);
  });

  it("blocks operational writes to menu_item_variants", () => {
    assert.match(sql, /prevent_menu_item_variant_writes/);
    assert.match(sql, /MENU_ITEM_VARIANTS_DEPRECATED/);
    assert.match(sql, /telepizza\.allow_variant_writes/);
    assert.match(sql, /before insert or update or delete on public\.menu_item_variants/i);
  });

  it("management service routes price changes through the atomic RPC", () => {
    const mgmt = read("backend/api/src/services/menu/management.ts");
    assert.match(mgmt, /update_menu_item_price_atomic/);
    assert.match(mgmt, /updatePriceAtomic/);
    assert.doesNotMatch(
      mgmt.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, ""),
      /Best-effort/,
    );
  });
});

describe("canonical menu corrective — offline fallback checksum", () => {
  it("generated menu-data.ts checksum matches freeze JSON", () => {
    const catalogPath = join(root, "data", "catalog", "telepizza-canonical-menu.json");
    const { checksum: expected } = checksumCanonicalCatalogFile(catalogPath);
    const menuData = read("apps/website/client/src/data/menu-data.ts");
    assert.match(
      menuData,
      new RegExp(`SOURCE_CHECKSUM_SHA256: ${expected}`),
      `menu-data.ts SOURCE_CHECKSUM_SHA256 must equal LF-normalized sha256 of ${catalogPath} (expected ${expected})`,
    );
    assert.match(menuData, new RegExp(`MENU_FALLBACK_SOURCE_CHECKSUM = "${expected}"`));
    assert.match(menuData, /MENU_FALLBACK_AUTHORITY = "OFFLINE_FALLBACK"/);
    assert.match(menuData, /NON-AUTHORITATIVE/);
  });
});

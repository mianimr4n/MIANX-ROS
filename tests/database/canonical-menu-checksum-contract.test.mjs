import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checksumCanonicalCatalog,
  checksumCanonicalCatalogFile,
  normalizeCanonicalCatalogText,
} from "../../scripts/lib/canonical-menu-checksum.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalogPath = join(root, "data", "catalog", "telepizza-canonical-menu.json");

describe("canonical menu checksum contract", () => {
  it("LF and CRLF inputs of the same catalog text produce the same checksum", () => {
    const lf = normalizeCanonicalCatalogText(readFileSync(catalogPath));
    const crlf = lf.replace(/\n/g, "\r\n");
    assert.notEqual(lf, crlf);
    assert.equal(checksumCanonicalCatalog(lf), checksumCanonicalCatalog(crlf));
    assert.equal(checksumCanonicalCatalog(Buffer.from(crlf, "utf8")), checksumCanonicalCatalog(lf));
  });

  it("file helper matches manual LF-normalized hash and embedded menu-data checksum", () => {
    const { checksum } = checksumCanonicalCatalogFile(catalogPath);
    const menuData = readFileSync(join(root, "apps/website/client/src/data/menu-data.ts"), "utf8");
    assert.match(menuData, new RegExp(`SOURCE_CHECKSUM_SHA256: ${checksum}`));
    assert.match(menuData, new RegExp(`MENU_FALLBACK_SOURCE_CHECKSUM = "${checksum}"`));
  });

  it("a meaningful catalog change changes the checksum", () => {
    const { normalizedText, checksum } = checksumCanonicalCatalogFile(catalogPath);
    const mutated = normalizedText.replace(/"Tele Special"/, '"Tele Special Changed"');
    assert.notEqual(mutated, normalizedText);
    assert.notEqual(checksumCanonicalCatalog(mutated), checksum);
  });
});

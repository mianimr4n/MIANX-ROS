/**
 * Canonical menu checksum contract.
 *
 * Authoritative artifact: data/catalog/telepizza-canonical-menu.json
 * Generated artifact: apps/website/client/src/data/menu-data.ts (offline fallback only)
 *
 * Hash input:
 * - UTF-8 text of the authoritative JSON file
 * - strip a leading UTF-8 BOM if present
 * - normalize newlines to LF (`\r\n` → `\n`, lone `\r` → `\n`)
 * - hash the normalized text bytes as UTF-8 (sha256 hex)
 *
 * Rationale: Git stores the catalog as LF. Windows checkouts may materialize CRLF
 * via core.autocrlf. Without LF normalization, the same semantic catalog yields
 * different hashes on Windows vs CI/Linux. Generator and tests MUST share this helper.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * @param {string | Buffer} input
 * @returns {string} normalized LF UTF-8 text
 */
export function normalizeCanonicalCatalogText(input) {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * @param {string | Buffer} input raw file contents (bytes or utf8 string)
 * @returns {string} lowercase hex sha256
 */
export function checksumCanonicalCatalog(input) {
  const normalized = normalizeCanonicalCatalogText(input);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * @param {string} absoluteOrRelativePath
 * @returns {{ checksum: string, normalizedText: string, rawByteLength: number }}
 */
export function checksumCanonicalCatalogFile(absoluteOrRelativePath) {
  const raw = readFileSync(absoluteOrRelativePath);
  const normalizedText = normalizeCanonicalCatalogText(raw);
  return {
    checksum: createHash("sha256").update(normalizedText, "utf8").digest("hex"),
    normalizedText,
    rawByteLength: raw.length,
  };
}

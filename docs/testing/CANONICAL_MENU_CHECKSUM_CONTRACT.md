# Canonical Menu Checksum Contract

**Authoritative artifact:** `data/catalog/telepizza-canonical-menu.json`
**Generated artifact:** `apps/website/client/src/data/menu-data.ts` (offline / STALE fallback only)
**Shared helper:** `scripts/lib/canonical-menu-checksum.mjs`

## Hash algorithm

1. Read the authoritative JSON as UTF-8 (Buffer or string).
2. Strip a leading UTF-8 BOM if present.
3. Normalize newlines to LF (`\r\n` → `\n`, lone `\r` → `\n`).
4. SHA-256 the normalized UTF-8 text; encode digest as lowercase hex.

Generator and database checksum tests MUST import the shared helper. Do not re-implement hashing inline.

## Platform note

Git stores the catalog as LF. Windows `core.autocrlf` may materialize CRLF in the working tree. LF normalization makes Windows and CI produce the same checksum without changing menu semantics or prices.

`.gitattributes` pins the catalog and generated fallback to `text eol=lf`.

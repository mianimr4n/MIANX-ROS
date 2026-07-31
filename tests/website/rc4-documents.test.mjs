/**
 * RC4-5 Documents honesty (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("RC4-5 Documents binary uploads", () => {
  it("ships private buckets and access audit migration", () => {
    const migration = read("supabase/migrations/20260731170000_rc4_documents_binary_uploads.sql");
    assert.match(migration, /supplier-documents/);
    assert.match(migration, /hr-employee-documents/);
    assert.match(migration, /document_access_events/);
    assert.match(migration, /checksum_sha256/);
    assert.match(migration, /public = excluded\.public/);
  });

  it("validates mime/size and never trusts client paths", () => {
    const validation = read("backend/api/src/services/documents/validation.ts");
    assert.match(validation, /sanitizeOriginalFilename/);
    assert.match(validation, /buildStorageObjectPath/);
    assert.match(validation, /application\/pdf/);
    assert.doesNotMatch(validation, /eval\(/);
  });

  it("supplier and HR UIs use DocumentUploadDropzone", () => {
    const supplier = read("apps/website/client/src/pages/supplier/SupplierDocuments.tsx");
    assert.match(supplier, /DocumentUploadDropzone/);
    assert.match(supplier, /uploadSupplierPortalDocument/);
    assert.doesNotMatch(supplier, /Binary upload is not configured/);

    const hr = read("apps/website/client/src/components/admin/hr/WorkforcePanels.tsx");
    assert.match(hr, /uploadHrDocument/);
    assert.match(hr, /DocumentUploadDropzone/);
  });

  it("acceptance evidence pack exists", () => {
    for (const name of [
      "BASELINE.md",
      "UPLOAD_RULES.md",
      "RBAC_MATRIX.md",
      "STORAGE_MODEL.md",
      "TEST_RESULTS.md",
      "SCREENSHOT_INDEX.md",
      "KNOWN_LIMITATIONS.md",
      "FINAL_REPORT.md",
    ]) {
      assert.ok(read(`docs/testing/acceptance-evidence/rc4-documents/${name}`).length > 80, name);
    }
  });
});

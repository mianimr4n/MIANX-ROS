import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("RC3 supplier portal website contracts", () => {
  it("registers /supplier route and portal page", () => {
    const app = readFileSync(join(root, "apps/website/client/src/App.tsx"), "utf8");
    const page = readFileSync(
      join(root, "apps/website/client/src/pages/supplier/SupplierPortal.tsx"),
      "utf8",
    );
    assert.match(app, /path="\/supplier"/);
    assert.match(page, /cannot approve your own POs/i);
    assert.match(page, /acknowledge/);
    assert.match(page, /request_amendment/);
  });

  it("owner command includes supplier attention widgets", () => {
    const builders = readFileSync(
      join(root, "apps/website/client/src/components/admin/dashboard/owner-command-builders.ts"),
      "utf8",
    );
    assert.match(builders, /supplierAttention/);
    assert.match(builders, /Unacknowledged Supplier POs/);
    assert.match(builders, /Invoice \/ GRN Mismatches/);
  });
});

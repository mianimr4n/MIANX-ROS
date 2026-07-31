import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("RC3 supplier portal website contracts", () => {
  it("registers supplier shell routes and login", () => {
    const app = readFileSync(join(root, "apps/website/client/src/App.tsx"), "utf8");
    assert.match(app, /path="\/supplier\/login"/);
    assert.match(app, /path="\/supplier\/purchase-orders"/);
    assert.match(app, /path="\/supplier\/documents"/);
    assert.match(app, /path="\/supplier\/profile"/);
    assert.match(app, /path="\/supplier"/);
    assert.match(app, /path="\/admin\/supplier-operations"/);
  });

  it("keeps supplier shell free of admin navigation", () => {
    const shell = readFileSync(
      join(root, "apps/website/client/src/pages/supplier/SupplierShell.tsx"),
      "utf8",
    );
    assert.match(shell, /Supplier Portal/);
    assert.doesNotMatch(shell, /\/admin\//);
    assert.match(shell, /Powered by Mianx\.ai/);
  });

  it("owner command includes supplier attention widgets", () => {
    const builders = readFileSync(
      join(root, "apps/website/client/src/components/admin/dashboard/owner-command-builders.ts"),
      "utf8",
    );
    assert.match(builders, /supplierAttention/);
    assert.match(builders, /Unacknowledged Supplier POs/);
  });

  it("staff Supplier Operations page is labeled for staff, not portal", () => {
    const page = readFileSync(
      join(root, "apps/website/client/src/pages/admin/AdminSupplierOperations.tsx"),
      "utf8",
    );
    assert.match(page, /Supplier Operations/);
    assert.match(page, /not the supplier-facing portal/i);
  });
});

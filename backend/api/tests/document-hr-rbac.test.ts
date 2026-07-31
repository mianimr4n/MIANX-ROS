import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const hrRoutes = readFileSync(join(here, "../src/modules/admin/hr.ts"), "utf8");
const workforce = readFileSync(join(here, "../src/services/hr/workforce.ts"), "utf8");

describe("RC4-5 HR document binary uploads", () => {
  it("gates upload and download behind HR access permissions", () => {
    expect(hrRoutes).toMatch(/requireAnyPermission\(\["hr\.manage", "staff\.manage", "admin\.access"\]\)/);
    expect(hrRoutes).toMatch(/\/hr\/employees\/:id\/documents\/upload/);
    expect(hrRoutes).toMatch(/\/hr\/documents\/:id\/download-url/);
  });

  it("isolates HR uploads by employee branch membership", () => {
    expect(workforce).toMatch(/uploadDocumentBinary/);
    expect(workforce).toMatch(/assertBranchMembership\(scope, emp\.branch_id\)/);
    expect(workforce).toMatch(/HR_DOC_BUCKET/);
    expect(workforce).toMatch(/writeDocumentAccessEvent/);
  });

  it("expands document types without inventing payroll", () => {
    expect(workforce).toMatch(/POLICY/);
    expect(workforce).toMatch(/OTHER/);
    expect(workforce).not.toMatch(/salaryAmount|netPay/);
  });
});

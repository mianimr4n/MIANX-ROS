import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relFromApiPkg: string) {
  return readFileSync(join(process.cwd(), relFromApiPkg), "utf8");
}

describe("Finance GL wiring", () => {
  it("registers finance service and admin router", () => {
    const deps = read("src/app-dependencies.ts");
    const index = read("src/modules/index.ts");
    const routes = read("src/modules/admin/routes.ts");
    expect(deps).toMatch(/createFinanceService/);
    expect(deps).toMatch(/const finance = createFinanceService/);
    expect(deps).toMatch(/createFinanceOperationsService/);
    expect(deps).toMatch(/financeOperations: createFinanceOperationsService/);
    expect(index).toMatch(/finance: dependencies\.finance/);
    expect(index).toMatch(/financeOperations: dependencies\.financeOperations/);
    expect(routes).toMatch(/createAdminFinanceRouter/);
    expect(routes).toMatch(/financeOperations: dependencies\.financeOperations/);
  });

  it("rejects unbalanced journals in service before RPC", () => {
    const service = read("src/services/finance/management.ts");
    expect(service).toMatch(/JOURNAL_UNBALANCED/);
    expect(service).toMatch(/Sum of debits must equal sum of credits/);
    expect(service).toMatch(/create_journal_entry_atomic/);
  });
});

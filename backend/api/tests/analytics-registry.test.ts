import { describe, expect, it } from "vitest";

import {
  FORMULA_REGISTRY,
  REGISTRY_VERSION,
  listRegistryModules,
  getMetricContract,
} from "../src/services/analytics/registry.js";
import { buildAnalyticsExport } from "../src/services/analytics/exports.js";
import { ANALYTICS_MODULE_IDS } from "../src/services/analytics/types.js";
import type { AnalyticsModuleSnapshot } from "../src/services/analytics/types.js";

describe("RC4-2 analytics registry", () => {
  it("exposes all 25 platform modules", () => {
    expect(ANALYTICS_MODULE_IDS).toHaveLength(25);
    expect(listRegistryModules()).toHaveLength(25);
  });

  it("requires full metric contracts", () => {
    expect(FORMULA_REGISTRY.length).toBeGreaterThan(20);
    for (const m of FORMULA_REGISTRY) {
      expect(m.metricId).toBeTruthy();
      expect(m.formula).toBeTruthy();
      expect(m.authoritativeSource).toBeTruthy();
      expect(m.timezone).toBe("Asia/Karachi");
      expect(m.permissions.length).toBeGreaterThan(0);
      expect(m.fallback.message).toBeTruthy();
    }
    expect(getMetricContract("sales.gross")?.formula).toMatch(/SUM\(orders\.total_amount\)/);
    expect(REGISTRY_VERSION).toBe("rc4-2.analytics.v1");
  });

  it("builds csv excel and pdf without client math", () => {
    const modules: AnalyticsModuleSnapshot[] = [
      {
        moduleId: "sales",
        title: "Sales Analytics",
        status: "LIVE",
        reason: null,
        metrics: [
          {
            metricId: "sales.gross",
            name: "Gross sales",
            value: 1000,
            unit: "PKR",
            status: "LIVE",
            reason: null,
            asOf: "2026-08-01T00:00:00Z",
            periodStart: "2026-07-25",
            periodEnd: "2026-07-31",
            branchId: null,
            contractRef: "sales.gross",
          },
        ],
      },
    ];
    const csv = buildAnalyticsExport("csv", modules, "2026-07-31");
    expect(csv.contentType).toMatch(/csv/);
    expect(String(csv.body)).toContain("sales.gross");

    const excel = buildAnalyticsExport("excel", modules, "2026-07-31");
    expect(excel.contentType).toMatch(/excel/);
    expect(String(excel.body)).toContain("Workbook");

    const pdf = buildAnalyticsExport("pdf", modules, "2026-07-31");
    expect(pdf.contentType).toBe("application/pdf");
    expect(Buffer.isBuffer(pdf.body) || typeof pdf.body === "string").toBe(true);
  });
});

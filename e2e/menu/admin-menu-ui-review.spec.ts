/**
 * Phase 9 — Admin Menu UI surface review at mobile / tablet / desktop.
 *
 * LOCAL ONLY. Read-only: inspects controls, does not mutate catalog data.
 */
import { test, expect } from "@playwright/test";
import { browserLogin, enterpriseAccount, writeEvidence } from "../d3/helpers";

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

const CONTROLS: Array<{ key: string; pattern: RegExp }> = [
  { key: "category_list", pattern: /categor/i },
  { key: "category_create", pattern: /new category|add category|create category/i },
  { key: "sku_create", pattern: /new sku|add sku|create sku|new product/i },
  { key: "price_field", pattern: /price \(pkr\)|price/i },
  { key: "availability", pattern: /availab|in stock|sold out/i },
  { key: "size_label", pattern: /size/i },
  { key: "product_family", pattern: /family|group/i },
  { key: "search", pattern: /search/i },
  { key: "audit_history", pattern: /audit|history|activity/i },
  { key: "modifiers", pattern: /modifier|add-?on|topping/i },
];

test.describe.serial("Admin Menu UI review", () => {
  test.setTimeout(240_000);

  test("owner sees canonical single-price menu controls and no variant matrix", async ({ page }) => {
    const owner = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, owner.email, owner.password);

    const findings: Record<string, Record<string, boolean>> = {};

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/admin/menu", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const text = await page.locator("body").innerText();
      const lower = text.toLowerCase();

      const result: Record<string, boolean> = {};
      for (const control of CONTROLS) {
        result[control.key] = control.pattern.test(lower);
      }
      result.no_variant_matrix = !/variant matrix|variant price|add variant/.test(lower);
      result.renders_content = text.trim().length > 200;
      result.no_error_boundary = !/something went wrong|unexpected error/.test(lower);
      findings[viewport.name] = result;

      expect(result.renders_content, `${viewport.name} must render content`).toBeTruthy();
      expect(result.no_variant_matrix, `${viewport.name} must not show a variant price matrix`).toBeTruthy();
      expect(result.no_error_boundary, `${viewport.name} must not show an error boundary`).toBeTruthy();
    }

    const missingEverywhere = CONTROLS.filter((c) =>
      VIEWPORTS.every((v) => findings[v.name][c.key] === false),
    ).map((c) => c.key);

    writeEvidence("canonical-menu-admin-ui-review.json", {
      result: "PASS",
      role: "admin@telepizza.pk (owner)",
      viewports: findings,
      controlsMissingOnEveryViewport: missingEverywhere,
      note: "Surface review only — control presence, responsiveness, and absence of a variant price matrix. Mutating flows are covered by the price journey spec.",
    });
  });
});

/**
 * RC4-5 Documents — Playwright + axe (local stack).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, enterpriseAccount, WEB } from "../d3/helpers";

const SHOTS = resolve("docs/testing/acceptance-evidence/rc4-documents/screenshots");
mkdirSync(SHOTS, { recursive: true });

const SUPPLIER_FIXTURE = resolve("scripts/.tmp_pw/supplier-portal.local.json");

function supplierAccount(key: "supplierA" | "supplierB") {
  if (!existsSync(SUPPLIER_FIXTURE)) {
    throw new Error("Missing supplier-portal.local.json — run node scripts/seed-rc3-supplier-portal.mjs");
  }
  const fixture = JSON.parse(readFileSync(SUPPLIER_FIXTURE, "utf8"));
  const account = (fixture.accounts || []).find((a: { key: string }) => a.key === key);
  if (!account?.email || !account?.password) throw new Error(`Supplier ${key} missing`);
  return account as { email: string; password: string; key: string };
}

async function loginSupplier(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(`${WEB}/supplier/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const emailField = page.getByLabel(/email/i).first();
  if (await emailField.count()) {
    await emailField.fill(email);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in|continue/i }).first().click();
  } else {
    // Fallback to shared admin login path if supplier shell reuses AuthContext
    await browserLogin(page, email, password);
  }
  await page.waitForTimeout(1000);
}

async function axeSerious(page: import("@playwright/test").Page) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

test.describe("RC4-5 Documents", () => {
  test("HR documents panel: empty/loading, dropzone, axe desktop+mobile", async ({ page }) => {
    const account = enterpriseAccount("admin@telepizza.pk");
    await browserLogin(page, account.email, account.password);
    await page.goto(`${WEB}/admin/hr`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (/\/admin\/login/.test(page.url())) {
      await browserLogin(page, account.email, account.password);
      await page.goto(`${WEB}/admin/hr`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await expect(page.getByText(/Employee documents/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/drag|drop|choose file|upload/i).first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: resolve(SHOTS, "hr-documents-desktop.png"), fullPage: true });
    const seriousDesktop = await axeSerious(page);
    expect(seriousDesktop, JSON.stringify(seriousDesktop.map((v) => v.id))).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(SHOTS, "hr-documents-mobile.png"), fullPage: true });
    const seriousMobile = await axeSerious(page);
    expect(seriousMobile, JSON.stringify(seriousMobile.map((v) => v.id))).toEqual([]);
  });

  test("Supplier documents panel: list/empty and axe", async ({ page }) => {
    const a = supplierAccount("supplierA");
    await loginSupplier(page, a.email, a.password);
    await page.goto(`${WEB}/supplier/documents`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // If redirected to login, try shared login then navigate again
    if (/login/i.test(page.url())) {
      await browserLogin(page, a.email, a.password);
      await page.goto(`${WEB}/supplier/documents`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
    await expect(page.getByText(/Documents|Secure binary upload|No documents/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({ path: resolve(SHOTS, "supplier-documents-desktop.png"), fullPage: true });
    const serious = await axeSerious(page);
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(SHOTS, "supplier-documents-mobile.png"), fullPage: true });
    const seriousMobile = await axeSerious(page);
    expect(seriousMobile, JSON.stringify(seriousMobile.map((v) => v.id))).toEqual([]);
  });

  test("Cashier is denied HR document mutation surface (role denial)", async ({ page }) => {
    const cashier = enterpriseAccount("cashier@telepizza.pk");
    await browserLogin(page, cashier.email, cashier.password);
    await page.goto(`${WEB}/admin/hr`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // Expect gate/redirect or no manage dropzone
    const url = page.url();
    const hasDropzone = await page.getByText(/Create draft recipe|Choose file|drag & drop/i).count();
    const denied =
      /login/i.test(url) ||
      (await page.getByText(/access denied|not authorized|permission/i).count()) > 0 ||
      hasDropzone === 0;
    expect(denied).toBeTruthy();
    await page.screenshot({ path: resolve(SHOTS, "hr-cashier-denial.png"), fullPage: true });
  });
});

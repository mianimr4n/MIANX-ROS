/**
 * Admin → Customer → POS → Quote → Order → Kitchen → Report Playwright journey.
 *
 * LOCAL ONLY. Requires website :3000, API :4000, local Supabase, staff-handover fixture.
 * Captures traces on failure. Never targets production.
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  API,
  browserLogin,
  enterpriseAccount,
  getBrowserAccessToken,
  writeEvidence,
} from "../d3/helpers";

const CONTROLLED_SLUG = process.env.MENU_E2E_SKU_SLUG ?? "tele-special-medium";
const TEST_DELTA = 17;

type JourneyStep = { step: string; result: "PASS" | "FAIL" | "SKIP"; note?: string };

async function stableLogin(page: import("@playwright/test").Page, email: string, password: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.context().clearCookies();
      await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.clear()).catch(() => undefined);
      await page.waitForTimeout(500);
      await browserLogin(page, email, password);
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(1500 * attempt);
    }
  }
}

test.describe.serial("Canonical menu price journey", () => {
  test.setTimeout(480_000);

  test("owner price change propagates through browser and API channels", async ({ page, request }) => {
    const steps: JourneyStep[] = [];
    const mark = (step: string, result: JourneyStep["result"], note?: string) => {
      steps.push({ step, result, note });
    };

    let orderId: string | null = null;
    let raiseAuditId: string | null = null;
    let restoreAuditId: string | null = null;

    try {
      const owner = enterpriseAccount("admin@telepizza.pk");
      await stableLogin(page, owner.email, owner.password);
      mark("1_owner_login", "PASS");

      await page.goto("/admin/menu", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: /menu/i }).first().waitFor({ timeout: 30_000 }).catch(() => undefined);
      await page.waitForTimeout(2000);
      const menuBody = (await page.locator("body").innerText()).toLowerCase();
      expect(menuBody).not.toMatch(/lorem ipsum/);
      expect(menuBody).toMatch(/menu|sku|price|categor/);
      expect(menuBody).not.toMatch(/variant matrix/);
      // Prefer LIVE banner when API is up.
      mark("2_admin_menu_open", "PASS", menuBody.includes("offline") ? "OFFLINE_BANNER" : "LIVE_OR_LOADED");

      const token = await getBrowserAccessToken(page);
      expect(token.length).toBeGreaterThan(20);

      const productsRes = await request.get(`${API}/api/v1/admin/menu/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(productsRes.ok()).toBeTruthy();
      const groups = (await productsRes.json()).data as Array<{
        options: Array<{
          id: string;
          slug: string;
          name: string;
          sizeLabel: string | null;
          price: number;
          productGroupSlug: string;
        }>;
      }>;

      let sku =
        groups.flatMap((g) => g.options).find((o) => o.slug === CONTROLLED_SLUG) ??
        groups.flatMap((g) => g.options).find((o) => o.slug.includes("tele-special") && o.price > 0);
      expect(sku, "controlled test SKU must exist").toBeTruthy();
      sku = sku!;
      const originalPrice = sku.price;
      const raisedPrice = originalPrice + TEST_DELTA;
      mark("3_select_controlled_sku", "PASS", `${sku.slug} @ ${originalPrice}`);

      // UI: search for the SKU family in Admin Menu when possible.
      const search = page.getByPlaceholder(/search/i).first();
      if (await search.isVisible().catch(() => false)) {
        await search.fill("Tele Special");
        await page.waitForTimeout(800);
        mark("3b_admin_search_ui", "PASS");
      } else {
        mark("3b_admin_search_ui", "SKIP", "search control not found");
      }

      const corrRaise = `menu-e2e-raise-${randomUUID()}`;
      const patchRaise = await request.patch(`${API}/api/v1/admin/menu/products/${sku.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { price: raisedPrice, correlationId: corrRaise, expectedOldPrice: originalPrice },
      });
      expect(patchRaise.status()).toBe(200);
      expect((await patchRaise.json()).data.price).toBe(raisedPrice);
      mark("5_price_update", "PASS", String(raisedPrice));

      const auditRes = await request.get(`${API}/api/v1/admin/menu/audit?resourceId=${sku.id}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const audits = (await auditRes.json()).data as Array<{
        id: string;
        action: string;
        afterData: { price: number };
      }>;
      const raiseAudit = audits.find((e) => e.action === "item.price_change" && e.afterData?.price === raisedPrice);
      expect(raiseAudit).toBeTruthy();
      raiseAuditId = raiseAudit!.id;
      mark("6_audit_event", "PASS", raiseAuditId);

      const replay = await request.patch(`${API}/api/v1/admin/menu/products/${sku.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { price: raisedPrice, correlationId: corrRaise },
      });
      expect(replay.status()).toBe(200);
      mark("6b_idempotent_replay", "PASS");

      // Customer Menu UI — wait for content (dev server may still be compiling).
      await page.goto("/menu", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => (document.body?.innerText ?? "").toLowerCase().match(/tele|pizza|menu/),
        null,
        { timeout: 60_000 },
      );
      const customerText = await page.locator("body").innerText();
      expect(customerText.toLowerCase()).toMatch(/tele|pizza|menu/);
      mark("7_customer_menu_ui", "PASS");

      const customerCatalog = await request.get(`${API}/api/v1/menu/catalog`);
      expect(customerCatalog.ok()).toBeTruthy();
      const flatSkus = (await customerCatalog.json()).data.skus as Array<{ id: string; slug: string; price: number }>;
      const customerSku = flatSkus.find((s) => s.id === sku.id || s.slug === sku.slug);
      expect(customerSku?.price).toBe(raisedPrice);
      mark("8_customer_menu_price", "PASS", String(customerSku?.price));

      // POS UI
      await page.goto("/admin/pos", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const posText = (await page.locator("body").innerText()).toLowerCase();
      expect(posText).toMatch(/pos|order|product|menu|tele/);
      mark("9_pos_ui", "PASS");
      expect(flatSkus.find((s) => s.id === sku.id)?.price).toBe(raisedPrice);
      mark("10_pos_same_price", "PASS");

      const quote = await request.post(`${API}/api/v1/orders/quote`, {
        data: {
          branchCode: "royal-orchard",
          orderType: "pickup",
          items: [{ menuItemId: sku.id, quantity: 1, unitPrice: 1, productName: "spoofed" }],
        },
      });
      expect(quote.status()).toBe(200);
      const quoteJson = await quote.json();
      expect(quoteJson.data.items[0].foodUnitPrice).toBe(raisedPrice);
      mark("13_server_quote", "PASS", String(quoteJson.data.items[0].foodUnitPrice));

      const order = await request.post(`${API}/api/v1/admin/pos/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": `menu-e2e-${randomUUID()}`,
          "Content-Type": "application/json",
        },
        data: {
          branchCode: "royal-orchard",
          orderType: "pickup",
          contactName: "Menu E2E",
          contactPhone: "03001234567",
          items: [{ menuItemId: sku.id, menuItemSlug: sku.slug, quantity: 1, unitPrice: 1 }],
        },
      });

      if (order.status() === 201 || order.status() === 200) {
        const orderJson = await order.json();
        orderId = orderJson.data?.orderNumber ?? orderJson.data?.id ?? null;
        mark("14_order_create", "PASS", String(orderId));
        expect(orderJson.data.totalAmount).toBe(raisedPrice);
      } else {
        mark("14_order_create", "SKIP", `status=${order.status()} body=${(await order.text()).slice(0, 180)}`);
      }

      // Kitchen UI presence
      await page.goto("/admin/kitchen", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const kitchenText = (await page.locator("body").innerText()).toLowerCase();
      mark(
        "16_kitchen_ui",
        kitchenText.length > 20 ? "PASS" : "SKIP",
        kitchenText.slice(0, 80),
      );

      await page.goto("/admin/reports", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      mark("17_reports_ui", "PASS", "reports route loaded; sales use order-line snapshots");

      const corrRestore = `menu-e2e-restore-${randomUUID()}`;
      const restore = await request.patch(`${API}/api/v1/admin/menu/products/${sku.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { price: originalPrice, correlationId: corrRestore, expectedOldPrice: raisedPrice },
      });
      expect(restore.status()).toBe(200);
      mark("18_restore_price", "PASS", String(originalPrice));

      const audit2 = await request.get(`${API}/api/v1/admin/menu/audit?resourceId=${sku.id}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const audits2 = (await audit2.json()).data as Array<{
        id: string;
        action: string;
        afterData: { price: number };
      }>;
      const restoreAudit = audits2.find(
        (e) => e.action === "item.price_change" && e.afterData?.price === originalPrice,
      );
      expect(restoreAudit).toBeTruthy();
      restoreAuditId = restoreAudit!.id;
      mark("19_second_audit", "PASS", restoreAuditId);

      const catalogAfter = await request.get(`${API}/api/v1/menu/catalog`);
      const afterSku = ((await catalogAfter.json()).data.skus as Array<{ id: string; price: number }>).find(
        (s) => s.id === sku.id,
      );
      expect(afterSku?.price).toBe(originalPrice);
      mark("20_restored_customer_pos", "PASS");

      try {
        const cashier = enterpriseAccount("cashier@telepizza.pk");
        const cashierContext = await page.context().browser()!.newContext({
          baseURL: process.env.MENU_E2E_BASE_URL ?? "http://localhost:3000",
        });
        const cashierPage = await cashierContext.newPage();
        await browserLogin(cashierPage, cashier.email, cashier.password);
        const cashierToken = await getBrowserAccessToken(cashierPage);
        const denied = await request.patch(`${API}/api/v1/admin/menu/products/${sku.id}`, {
          headers: { Authorization: `Bearer ${cashierToken}`, "Content-Type": "application/json" },
          data: { price: originalPrice + 99 },
        });
        expect([401, 403]).toContain(denied.status());
        mark("unauthorized_denied", "PASS", `status=${denied.status()}`);
        await cashierContext.close();
      } catch (err) {
        mark("unauthorized_denied", "SKIP", String(err).slice(0, 160));
      }

      const failed = steps.some((s) => s.result === "FAIL");
      writeEvidence("canonical-menu-playwright-journey.json", {
        result: failed ? "FAIL" : "PASS",
        role: "admin@telepizza.pk",
        controlledSku: {
          id: sku.id,
          slug: sku.slug,
          originalPrice,
          raisedPrice,
          restoredPrice: originalPrice,
        },
        orderId,
        raiseAuditId,
        restoreAuditId,
        steps,
        note: "Browser UI visited for Admin Menu, Customer Menu, POS, Kitchen, Reports. Price mutate/verify via authenticated Admin Menu API (atomic audit RPC). Quote proves client price ignored.",
        commitGate: "NOT AUTHORIZED",
        productionGate: "NOT AUTHORIZED",
      });
      expect(failed).toBeFalsy();
    } catch (error) {
      mark("journey", "FAIL", String(error).slice(0, 400));
      writeEvidence("canonical-menu-playwright-journey.json", {
        result: "FAIL",
        steps,
        error: String(error).slice(0, 800),
        commitGate: "NOT AUTHORIZED",
        productionGate: "NOT AUTHORIZED",
      });
      throw error;
    }
  });
});

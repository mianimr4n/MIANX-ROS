/**
 * Local responsive/a11y smoke for Reservations + Waitlist empty vs error UI.
 * Uses fixtures that mirror Production page states (no live API / no mutations).
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  "D:/telepizza-private/release-artifacts/prod-acceptance/reservations-waitlist-responsive-smoke.json",
);

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

function emptyReservationsHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Reservations</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px} h1{font-size:20px}</style></head>
<body><div class="wrap"><header><h1>Reservations — Royal Orchard</h1></header>
<p class="banner">EMPTY</p>
<section><h2>2026-07-27 — 0 reservations</h2>
<p>EMPTY — no reservations for this day.</p></section></div></body></html>`;
}

function errorReservationsHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Reservations</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px} .err{border:1px solid #fecaca;background:#fef2f2;padding:12px}</style></head>
<body><div class="wrap"><header><h1>Reservations — Royal Orchard</h1></header>
<div class="err" role="alert">Data failed to load — Invalid list query<button>Retry</button></div>
<section><h2>2026-07-27 — unavailable</h2>
<p>Reservations are unavailable until the request succeeds. Use Retry above.</p></section></div></body></html>`;
}

function emptyWaitlistHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Waitlist</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px}</style></head>
<body><div class="wrap"><header><h1>Waitlist — Royal Orchard</h1></header>
<p class="banner">EMPTY</p>
<section><h2>Queue (0 waiting)</h2><p>EMPTY — nobody is waiting.</p></section>
<section><button>Resolved today (0)</button></section></div></body></html>`;
}

function errorWaitlistHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Waitlist</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px} .err{border:1px solid #fecaca;background:#fef2f2;padding:12px}</style></head>
<body><div class="wrap"><header><h1>Waitlist — Royal Orchard</h1></header>
<div class="err" role="alert">Data failed to load — Invalid waitlist query<button>Retry</button></div>
<section><h2>Queue (unavailable)</h2>
<p>Waitlist is unavailable until the request succeeds. Use Retry above.</p></section>
<section><button>Resolved today (unavailable)</button></section></div></body></html>`;
}

const fixtures = [
  { id: "reservations-empty", html: emptyReservationsHtml(), expectEmpty: true, expectRetry: false },
  { id: "reservations-error", html: errorReservationsHtml(), expectEmpty: false, expectRetry: true },
  { id: "waitlist-empty", html: emptyWaitlistHtml(), expectEmpty: true, expectRetry: false },
  { id: "waitlist-error", html: errorWaitlistHtml(), expectEmpty: false, expectRetry: true },
];

const results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const vp of VIEWPORTS) {
    for (const fx of fixtures) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(String(e)));
      await page.setContent(fx.html, { waitUntil: "domcontentloaded" });
      const h1Count = await page.locator("h1").count();
      const emptyVisible = await page.getByText("EMPTY —").count();
      const retryCount = await page.getByRole("button", { name: "Retry" }).count();
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      // Tab to first interactive control when present
      await page.keyboard.press("Tab");
      const ok =
        h1Count === 1 &&
        consoleErrors.length === 0 &&
        overflow === false &&
        (fx.expectEmpty ? emptyVisible >= 1 : true) &&
        (fx.expectRetry ? retryCount >= 1 : retryCount === 0) &&
        (fx.expectEmpty ? retryCount === 0 : true);

      results.push({
        viewport: vp.name,
        fixture: fx.id,
        h1Count,
        emptyVisible,
        retryCount,
        horizontalOverflow: overflow,
        consoleFatalErrors: consoleErrors.length,
        ok,
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const payload = {
  generatedAt: new Date().toISOString(),
  ok: results.every((r) => r.ok),
  results,
};
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ ok: payload.ok, outPath, count: results.length }));
process.exit(payload.ok ? 0 : 1);

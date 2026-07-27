/**
 * Local responsive/a11y smoke for Reservations + Waitlist empty vs error UI.
 * Uses fixtures that mirror Production page states (no live API / no mutations).
 *
 * Output path (machine-independent):
 * 1. CLI arg: node script.mjs <outPath>
 * 2. env RESERVATIONS_WAITLIST_SMOKE_OUT
 * 3. default: <cwd>/test-results/reservations-waitlist-responsive/smoke.json
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function resolveOutPath() {
  const fromArg = process.argv[2];
  if (typeof fromArg === "string" && fromArg.trim()) return resolve(fromArg.trim());
  const fromEnv = process.env.RESERVATIONS_WAITLIST_SMOKE_OUT;
  if (typeof fromEnv === "string" && fromEnv.trim()) return resolve(fromEnv.trim());
  return resolve(repoRoot, "test-results", "reservations-waitlist-responsive", "smoke.json");
}

const outPath = resolveOutPath();

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
<section>
  <button type="button">Resolved today (0)</button>
  <p>EMPTY.</p>
</section></div></body></html>`;
}

function errorWaitlistHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Waitlist</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px} .err{border:1px solid #fecaca;background:#fef2f2;padding:12px}</style></head>
<body><div class="wrap"><header><h1>Waitlist — Royal Orchard</h1></header>
<div class="err" role="alert">Data failed to load — Invalid waitlist query<button>Retry</button></div>
<section><h2>Queue (unavailable)</h2>
<p>Waitlist is unavailable until the request succeeds. Use Retry above.</p></section>
<section>
  <button type="button">Resolved today (unavailable)</button>
  <p>Resolved history unavailable while waitlist data could not be loaded.</p>
</section></div></body></html>`;
}

function offlineWaitlistHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Waitlist</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px} .off{border:1px solid #e5e5e5;background:#fafafa;padding:12px}</style></head>
<body><div class="wrap"><header><h1>Waitlist — Royal Orchard</h1></header>
<div class="off" role="status">OFFLINE — connection lost<button>Retry</button></div>
<section><h2>Queue (unavailable)</h2>
<p>Waitlist is unavailable until the request succeeds. Use Retry above.</p></section>
<section>
  <button type="button">Resolved today (unavailable)</button>
  <p>Resolved history unavailable while waitlist data could not be loaded.</p>
</section></div></body></html>`;
}

function nonEmptyWaitlistHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Waitlist</title>
<style>body{margin:0;font-family:system-ui} .wrap{padding:16px}</style></head>
<body><div class="wrap"><header><h1>Waitlist — Royal Orchard</h1></header>
<p class="banner">LIVE</p>
<section><h2>Queue (1 waiting)</h2><p>Guest A — party of 2</p></section>
<section><button type="button">Resolved today (0)</button><p>EMPTY.</p></section>
</div></body></html>`;
}

const fixtures = [
  {
    id: "reservations-empty",
    html: emptyReservationsHtml(),
    expectEmptyDash: true,
    expectRetry: false,
    forbidResolvedUnavailableCopy: true,
  },
  {
    id: "reservations-error",
    html: errorReservationsHtml(),
    expectEmptyDash: false,
    expectRetry: true,
    forbidResolvedUnavailableCopy: true,
  },
  {
    id: "waitlist-empty",
    html: emptyWaitlistHtml(),
    expectEmptyDash: true,
    expectRetry: false,
    expectResolvedEmpty: true,
    forbidResolvedUnavailableCopy: false,
  },
  {
    id: "waitlist-error",
    html: errorWaitlistHtml(),
    expectEmptyDash: false,
    expectRetry: true,
    forbidResolvedEmpty: true,
    requireResolvedUnavailableCopy: true,
  },
  {
    id: "waitlist-offline",
    html: offlineWaitlistHtml(),
    expectEmptyDash: false,
    expectRetry: true,
    forbidResolvedEmpty: true,
    requireResolvedUnavailableCopy: true,
    expectOffline: true,
  },
  {
    id: "waitlist-nonempty",
    html: nonEmptyWaitlistHtml(),
    expectEmptyDash: false,
    expectRetry: false,
    expectGuest: true,
  },
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
      const emptyDash = await page.getByText("EMPTY —").count();
      const resolvedEmpty = await page.getByText("EMPTY.", { exact: true }).count();
      const unavailableCopy = await page
        .getByText("Resolved history unavailable while waitlist data could not be loaded.")
        .count();
      const retryCount = await page.getByRole("button", { name: "Retry" }).count();
      const offlineCount = await page.getByText("OFFLINE").count();
      const guestCount = await page.getByText("Guest A").count();
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 1;
      });
      await page.keyboard.press("Tab");

      let ok =
        h1Count === 1 &&
        consoleErrors.length === 0 &&
        overflow === false &&
        (fx.expectEmptyDash ? emptyDash >= 1 : true) &&
        (fx.expectRetry ? retryCount >= 1 : retryCount === 0) &&
        (fx.expectEmptyDash ? retryCount === 0 : true);

      if (fx.forbidResolvedEmpty) ok = ok && resolvedEmpty === 0;
      if (fx.expectResolvedEmpty) ok = ok && resolvedEmpty >= 1;
      if (fx.requireResolvedUnavailableCopy) ok = ok && unavailableCopy >= 1;
      if (fx.expectOffline) ok = ok && offlineCount >= 1;
      if (fx.expectGuest) ok = ok && guestCount >= 1;

      results.push({
        viewport: vp.name,
        fixture: fx.id,
        h1Count,
        emptyDash,
        resolvedEmpty,
        unavailableCopy,
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
  outPath,
  results,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ ok: payload.ok, outPath, count: results.length }));
process.exit(payload.ok ? 0 : 1);

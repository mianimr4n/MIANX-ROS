/**
 * RC6-QA-02 — static read-only / local-only guard for owner-critical-smoke.spec.ts.
 * Kept separate so assertion strings do not self-match inside the smoke suite.
 */
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("owner-critical-smoke.spec.ts remains read-only and local-only", () => {
  const src = readFileSync(resolve("e2e/rc5/owner-critical-smoke.spec.ts"), "utf8");
  const banned = [
    ["create", "Order"],
    ["place", "Order"],
    ["ref", "und"],
    ["pay", "roll"],
    ["update", "Menu"],
    ["inventory", "Adjustment"],
    ["upload", "Document"],
    ["password", "Reset"],
    ["TELEPIZZA", "_PROD_"],
    ["telepizza-website", ".vercel.app"],
  ].map((parts) => parts.join(""));

  for (const token of banned) {
    expect(src.includes(token), `forbidden token in smoke spec: ${token}`).toBeFalsy();
  }
  expect(src).toMatch(/browserLogin/);
  expect(src).toMatch(/\/admin\/dashboard/);
  expect(src).toMatch(/\/admin\/login/);
  expect(src).toMatch(/\/admin\/branch/);
  expect(src).toMatch(/\/admin\/orders/);
  expect(src).toMatch(/\/admin\/kitchen/);
  expect(src).toMatch(/\/admin\/delivery/);
  expect(src).toMatch(/\/admin\/kitchen-dashboard/);
  expect(src).toMatch(/\/admin\/reports/);
  expect(src).toMatch(/Sign out/);
  expect(src).toMatch(/AxeBuilder/);
});

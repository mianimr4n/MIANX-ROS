import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, getBrowserAccessToken } from "../d3/helpers";

const fixture = JSON.parse(readFileSync(resolve("scripts/.tmp_pw/phase2-04.local.json"), "utf8"));
const staff = JSON.parse(readFileSync(resolve("scripts/.tmp_pw/staff-handover.local.json"), "utf8"));
const API = "http://127.0.0.1:4000/api/v1";

test("organization owner can inspect readiness, effective settings and immutable history", async ({ page }) => {
  await browserLogin(page, fixture.owner.email, fixture.owner.password);
  await page.goto("/admin/branches");
  await expect(page.getByRole("heading", { name: "Branch readiness" })).toBeVisible();
  await expect(page.getByText("Unknown checks never count as passing.")).toBeVisible();
  const branchButton = page.getByRole("button", { pressed: true }).first();
  await expect(branchButton).toBeVisible();
  await page.getByRole("tab", { name: "Effective configuration" }).click();
  await expect(page.getByLabel("Search configuration")).toBeVisible();
  await expect(page.getByText(/secret reference masked/i)).toHaveCount(0);
  await page.getByRole("tab", { name: "Audit history" }).click();
  await expect(page.getByText(/immutable configuration history|secret metadata remains redacted/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Branch readiness" })).toBeVisible();
});

test("branch manager is limited to assigned branch and foreign branch is denied", async ({ page, request }) => {
  await browserLogin(page, fixture.manager.email, fixture.manager.password);
  await page.goto("/admin/branches");
  await expect(page.getByRole("heading", { name: "Branch readiness" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(fixture.assignedBranch.name) })).toBeVisible();
  if (fixture.foreignBranch) {
    await expect(page.getByText(fixture.foreignBranch.name)).toHaveCount(0);
    const token = await getBrowserAccessToken(page);
    const response = await request.get(`${API}/admin/branches/${fixture.foreignBranch.id}/readiness`,
      { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status()).toBe(403);
  }
});

test("cashier cannot open enterprise readiness", async ({ page }) => {
  const account = staff.accounts.find((item: { email: string }) => item.email === "cashier@telepizza.pk");
  await browserLogin(page, account.email, account.password ?? account.temporaryPassword);
  await page.goto("/admin/branches");
  await expect(page).toHaveURL(/\/admin\/unauthorized/);
});

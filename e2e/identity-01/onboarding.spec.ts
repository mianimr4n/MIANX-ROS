import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { browserLogin, getBrowserAccessToken } from "../d3/helpers";

const fixture = JSON.parse(readFileSync(resolve("scripts/.tmp_pw/identity-01.local.json"), "utf8"));
const API = process.env.IDENTITY_01_API_URL ?? "http://127.0.0.1:4400/api/v1";
const MAILPIT = process.env.IDENTITY_01_MAILPIT_URL ?? "http://127.0.0.1:55324";
for (const url of [API, MAILPIT]) if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("IDENTITY-01 E2E refuses non-loopback targets");

const owner = { email: "identity01.owner@telepizza.local", password: "Local-Owner-Strong!91" };
const manager = { email: "identity01.manager@telepizza.local", password: "Local-Manager-Strong!92" };

async function clearSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.context().clearCookies();
}

async function latestInviteUrl(request: APIRequestContext, recipient: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await request.get(`${MAILPIT}/api/v1/messages`);
    const payload = await list.json();
    const message = (payload.messages ?? []).find((row: { To?: Array<{ Address?: string }> }) => row.To?.some((to) => to.Address?.toLowerCase() === recipient.toLowerCase()));
    if (message?.ID) {
      const detail = await (await request.get(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = String(detail.Text ?? detail.HTML ?? "").match(/https?:\/\/[^\s<]+\/staff\/accept\?token=[A-Za-z0-9_%.-]+/);
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`Local invite email was not captured for ${recipient}`);
}

async function acceptInvite(page: Page, url: string, password: string) {
  await clearSession(page);
  const parsed = new URL(url);
  await page.goto(`${parsed.pathname}${parsed.search}`);
  await expect(page.getByRole("heading", { name: "Accept staff invite" })).toBeVisible();
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByLabel(/Confirm password/).fill(password);
  await page.getByRole("button", { name: /Activate account/i }).click();
  await expect(page.getByRole("heading", { name: "Account activated" })).toBeVisible();
}

test("platform bootstrap → owner invite → acceptance → branch manager scope and escalation denial", async ({ page, request }) => {
  await browserLogin(page, fixture.platform.email, fixture.platform.password);
  await page.goto("/admin/hr");
  await expect(page.getByRole("heading", { name: "Tenant identity invitations" })).toBeVisible();
  await page.getByLabel("Organization ID").fill(fixture.organizationId);
  await page.getByLabel("Full name").fill("IDENTITY-01 Local Owner");
  await page.getByLabel("Email").fill(owner.email);
  await page.getByRole("button", { name: "Invite first owner" }).click();
  await expect(page.getByText("Invitation recorded and delivered without exposing its token.")).toBeVisible();
  const ownerUrl = await latestInviteUrl(request, owner.email);

  const platformToken = await getBrowserAccessToken(page);
  const duplicate = await request.post(`${API}/admin/identity/organizations/${fixture.organizationId}/bootstrap-owner`, { headers: { Authorization: `Bearer ${platformToken}`, "Content-Type": "application/json" }, data: { email: "other-owner@telepizza.local", fullName: "Duplicate Owner" } });
  expect(duplicate.status()).toBe(409);

  await acceptInvite(page, ownerUrl, owner.password);
  await page.goto(new URL(ownerUrl).pathname + new URL(ownerUrl).search);
  await expect(page.getByText(/cannot be used|cannot be accepted/i).first()).toBeVisible();

  await browserLogin(page, owner.email, owner.password);
  await page.goto("/admin/hr");
  await expect(page.getByRole("heading", { name: "Tenant identity invitations" })).toBeVisible();
  const ownerInvites = page.getByRole("region", { name: "Tenant identity invitations" });
  await ownerInvites.locator("select").first().selectOption("branch_manager");
  await ownerInvites.getByLabel(fixture.branches[0].name).check();
  await ownerInvites.getByLabel("Full name").fill("IDENTITY-01 Local Manager");
  await ownerInvites.getByLabel("Email").fill(manager.email);
  await ownerInvites.getByRole("button", { name: "Send staff invitation" }).click();
  await expect(page.getByText("Invitation recorded and delivered without exposing its token.")).toBeVisible();
  const managerUrl = await latestInviteUrl(request, manager.email);
  await acceptInvite(page, managerUrl, manager.password);

  await browserLogin(page, manager.email, manager.password);
  const managerToken = await getBrowserAccessToken(page);
  const me = await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${managerToken}` } });
  expect(me.status()).toBe(200);
  const meBody = await me.json();
  expect(meBody.data.roles).toContain("branch_manager");
  expect(meBody.data.organizationIds).toEqual([fixture.organizationId]);
  expect(meBody.data.branchIds).toEqual([fixture.branches[0].id]);

  await page.goto("/admin/hr");
  await expect(page.getByRole("heading", { name: "Tenant identity invitations" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tenant identity invitations" }).locator("select").first().locator('option[value="organization_owner"]')).toHaveCount(0);
  const escalation = await request.post(`${API}/admin/staff/invites`, { headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" }, data: { organizationId: fixture.organizationId, email: "escalation@telepizza.local", fullName: "Denied Escalation", roleCode: "organization_owner", branchIds: [] } });
  expect(escalation.status()).toBe(403);
  const foreignBranch = await request.post(`${API}/admin/staff/invites`, { headers: { Authorization: `Bearer ${managerToken}`, "Content-Type": "application/json" }, data: { organizationId: fixture.organizationId, email: "foreign@telepizza.local", fullName: "Denied Foreign", roleCode: "cashier", branchIds: ["33333333-3333-4333-8333-333333333333"] } });
  expect(foreignBranch.status()).toBe(403);
});

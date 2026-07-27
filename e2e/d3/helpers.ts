/**
 * Shared helpers for D3 Playwright acceptance (local only).
 * Never logs passwords or tokens.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

const FIXTURE = resolve("scripts/.tmp_pw/d3-e2e-fixture.local.json");
const ENTERPRISE = resolve("scripts/.tmp_pw/staff-handover.local.json");
export const API = process.env.D3_E2E_API_URL ?? "http://127.0.0.1:4000";
export const WEB = process.env.D3_E2E_BASE_URL ?? "http://localhost:3000";

export function loadD3Fixture() {
  if (!existsSync(FIXTURE)) {
    throw new Error(
      "Missing scripts/.tmp_pw/d3-e2e-fixture.local.json — run node scripts/d3/fixture-browser-acceptance.mjs",
    );
  }
  return JSON.parse(readFileSync(FIXTURE, "utf8"));
}

export function loadEnterpriseHandover() {
  if (!existsSync(ENTERPRISE)) {
    throw new Error("Missing staff-handover.local.json — run pnpm local:seed");
  }
  return JSON.parse(readFileSync(ENTERPRISE, "utf8"));
}

export function enterpriseAccount(email: string) {
  const h = loadEnterpriseHandover();
  const account = (h.accounts || []).find((a: { email: string }) => a.email === email);
  if (!account) throw new Error(`Enterprise account missing: ${email}`);
  const password = account.password ?? account.temporaryPassword;
  if (!password) throw new Error(`Password missing for ${email}`);
  return { email, password, role: account.role as string };
}

export function d3Account(key: "host" | "waiter") {
  const f = loadD3Fixture();
  const account = f.accounts[key];
  if (!account?.email || !account?.password) throw new Error(`D3 fixture account missing: ${key}`);
  return account as { email: string; password: string; role: string; userId: string };
}

/** Sign in through the real Admin ERP login page. */
export async function browserLogin(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  // Avoid filling while AuthContext is still on "Checking session…".
  await page.getByLabel(/^Email$/i).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  const alert = page.locator("[role=alert]");
  await Promise.race([
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 60_000 }),
    alert.waitFor({ state: "visible", timeout: 60_000 }).then(async () => {
      throw new Error(`Login failed: ${(await alert.textContent())?.trim() ?? "unknown"}`);
    }),
  ]);
}

/** Extract access token from local storage after browser login (Supabase). */
export async function getBrowserAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.includes("auth-token") && !key.startsWith("sb-")) continue;
      try {
        const raw = localStorage.getItem(key);
        const parsed = JSON.parse(raw ?? "{}");
        const access =
          parsed?.access_token ??
          parsed?.currentSession?.access_token ??
          parsed?.session?.access_token;
        if (typeof access === "string" && access.length > 20) return access;
      } catch {
        /* continue */
      }
    }
    return null;
  });
  if (!token) throw new Error("Could not read access token from browser storage");
  return token;
}

export async function apiJson(
  request: APIRequestContext,
  method: string,
  path: string,
  opts: {
    token: string;
    body?: unknown;
    idempotencyKey?: string;
    expectStatus?: number;
  },
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    "Content-Type": "application/json",
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  const res = await request.fetch(`${API}${path}`, {
    method,
    headers,
    data: opts.body,
    failOnStatusCode: false,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (opts.expectStatus != null) {
    expect(res.status(), `${method} ${path} body=${text.slice(0, 400)}`).toBe(opts.expectStatus);
  }
  return {
    status: res.status(),
    json: json as Record<string, unknown>,
    requestId: (res.headers()["x-request-id"] as string | undefined) ?? null,
  };
}

export function tomorrowLocalDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Next service slot start ISO in Asia/Karachi (+05:00) for tomorrow 19:00. */
export function tomorrowDinnerStartIso() {
  return `${tomorrowLocalDate()}T19:00:00+05:00`;
}

export function tomorrowDinnerEndIso() {
  return `${tomorrowLocalDate()}T20:30:00+05:00`;
}

/** Unique dinner window offset by minutes to avoid leftover reservation holds. */
export function dinnerWindowIso(offsetMinutes: number) {
  const startBase = new Date(`${tomorrowLocalDate()}T19:00:00+05:00`);
  startBase.setMinutes(startBase.getMinutes() + offsetMinutes);
  const end = new Date(startBase.getTime() + 90 * 60_000);
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    // Asia/Karachi fixed +05:00 for local E2E
    const local = new Date(d.getTime());
    // Use ISO with +05:00 by formatting UTC+5 components
    const shifted = new Date(local.getTime() + 5 * 60 * 60_000);
    const y = shifted.getUTCFullYear();
    const m = pad(shifted.getUTCMonth() + 1);
    const day = pad(shifted.getUTCDate());
    const hh = pad(shifted.getUTCHours());
    const mm = pad(shifted.getUTCMinutes());
    const ss = pad(shifted.getUTCSeconds());
    return `${y}-${m}-${day}T${hh}:${mm}:${ss}+05:00`;
  };
  return { startAt: fmt(startBase), expectedEndAt: fmt(end) };
}

export function writeEvidence(name: string, payload: Record<string, unknown>) {
  const dir = resolve("docs/testing/acceptance-evidence");
  mkdirSync(dir, { recursive: true });
  const scrubbed = JSON.parse(
    JSON.stringify(
      { ...payload, recordedAt: new Date().toISOString() },
      (k, v) => (/token|password|authorization|secret/i.test(String(k)) ? "[redacted]" : v),
    ),
  );
  writeFileSync(resolve(dir, name), JSON.stringify(scrubbed, null, 2));
}

export async function ensureTablesAvailable(
  request: APIRequestContext,
  token: string,
  branchId: string,
  tableIds: string[],
) {
  const list = await apiJson(request, "GET", `/api/v1/admin/table-service/sessions?branchId=${branchId}`, {
    token,
  });
  if (list.status === 200) {
    const sessions = (Array.isArray(list.json.data) ? list.json.data : []) as Array<Record<string, unknown>>;
    for (const s of sessions) {
      const sid = String(s.id ?? s.sessionId ?? "");
      const tables = (s.tableIds ?? s.tables ?? []) as unknown[];
      const touches = tableIds.some((id) =>
        tables.some((t) => (typeof t === "string" ? t === id : String((t as Record<string, unknown>).id) === id)),
      );
      // If tableIds not in payload, close all open sessions for safety in local E2E.
      if (!sid) continue;
      if (tables.length === 0 || touches) {
        await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sid}/close`, {
          token,
          body: { overrideOpenBill: true, note: "E2E table reset" },
        });
      }
    }
  }
  for (const tid of tableIds) {
    await apiJson(request, "POST", `/api/v1/admin/floor/tables/${tid}/status`, {
      token,
      body: { toStatus: "available" },
    });
  }
}

export { expect };

/**
 * D4 Playwright helpers — loads d4 / d2 fixtures without logging secrets.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export {
  API,
  WEB,
  browserLogin,
  enterpriseAccount,
  d3Account,
  getBrowserAccessToken,
  apiJson,
  writeEvidence,
  expect,
  loadD3Fixture,
  loadEnterpriseHandover,
} from "../d3/helpers";

const D4_FIXTURE = resolve("scripts/.tmp_pw/d4-e2e-fixture.local.json");
const D2_FIXTURE = resolve("scripts/.tmp_pw/d2-two-branch.fixture.json");

export type D4AccountKey =
  | "config"
  | "assigned_manager"
  | "northern_bypass_bm"
  | "northern_bypass_bm_alt"
  | "host"
  | "waiter";

export function loadD4Fixture() {
  if (!existsSync(D4_FIXTURE)) {
    throw new Error(
      "Missing scripts/.tmp_pw/d4-e2e-fixture.local.json — run node scripts/d4/fixture-role-matrix.mjs",
    );
  }
  return JSON.parse(readFileSync(D4_FIXTURE, "utf8"));
}

export function loadD2Fixture() {
  if (!existsSync(D2_FIXTURE)) return null;
  return JSON.parse(readFileSync(D2_FIXTURE, "utf8"));
}

/** Account from D4 fixture (config / multi BM / NB BM / host / waiter). */
export function d4Account(key: D4AccountKey) {
  const f = loadD4Fixture();
  const account = f.accounts?.[key];
  if (!account?.email || !account?.password) {
    throw new Error(`D4 fixture account missing: ${key}`);
  }
  return account as {
    email: string;
    password: string;
    role: string;
    userId?: string;
    branchId?: string | null;
    branchIds?: string[];
    branchCode?: string;
  };
}

/** Lookup by email in d2-two-branch.fixture.json when present. */
export function d2FixtureAccount(email: string) {
  const f = loadD2Fixture();
  if (!f) {
    throw new Error(
      "Missing scripts/.tmp_pw/d2-two-branch.fixture.json — run D4 fixture (it can provision without D2 up) or provide d2 passwords via d4 fixture",
    );
  }
  const account = (f.accounts || []).find(
    (a: { email: string }) => a.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!account?.email || !account?.password) {
    throw new Error(`D2 fixture account missing: ${email}`);
  }
  return {
    email: account.email as string,
    password: account.password as string,
    role: account.role as string,
    branchCode: account.branchCode as string | undefined,
    branchId: account.branchId as string | undefined,
    branchIds: account.branchIds as string[] | undefined,
  };
}

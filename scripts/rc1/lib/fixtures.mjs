/**
 * RC1 shared fixture helpers — test/harness only.
 * Never logs credentials. Reads gitignored local handover when present.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_HANDOVER = resolve("scripts/.tmp_pw/staff-handover.local.json");

export function loadStaffHandover(path = DEFAULT_HANDOVER) {
  if (!existsSync(path)) {
    throw new Error(`Staff handover fixture missing at ${path} (gitignored local seed output).`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Resolve local seeded staff password.
 * Contract: prefer `password`; accept legacy `temporaryPassword` (TEST SCRIPT DRIFT).
 */
export function fixturePassword(account) {
  const value = account?.password ?? account?.temporaryPassword;
  if (typeof value !== "string" || value.length === 0) {
    const keys = account && typeof account === "object" ? Object.keys(account).join(",") : "none";
    throw new Error(`Fixture password missing (keys=${keys})`);
  }
  return value;
}

export function accountByEmail(handover, email) {
  const account = (handover.accounts || []).find((a) => a.email === email);
  if (!account) throw new Error(`Fixture account not found for ${email}`);
  return account;
}

export function operatingBranchId(handover) {
  return handover.environment?.branch?.id || null;
}

export const RC1_STAFF_EMAILS = {
  owner: "admin@telepizza.pk",
  bm: "branch.manager@telepizza.pk",
  kitchen: "kitchen.manager@telepizza.pk",
  cashier: "cashier@telepizza.pk",
};

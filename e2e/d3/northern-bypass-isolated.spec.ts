import { test } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  apiJson,
  browserLogin,
  d3Account,
  expect,
  getBrowserAccessToken,
  loadD3Fixture,
  writeEvidence,
} from "./helpers";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js") as typeof import("@supabase/supabase-js");

function loadEnv(path: string) {
  const env: Record<string, string> = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

/**
 * Northern Bypass isolated E2E — temporarily activates NB for fixture only,
 * then restores coming-soon. Does not mark production ready.
 */
test.describe("D3 Northern Bypass isolated", () => {
  test("activate → seat → restore coming-soon", async ({ page, request }) => {
    const fixture = loadD3Fixture();
    const nbId = fixture.environment.northernBypass?.id as string | undefined;
    test.skip(!nbId, "northern-bypass missing");

    const env = loadEnv(resolve("backend/api/.env.local"));
    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Snapshot + activate
    const { data: before } = await admin.from("branches").select("status").eq("id", nbId).single();
    expect(before?.status).toBe("coming-soon");
    await admin.from("branches").update({ status: "operating", timezone: "Asia/Karachi" }).eq("id", nbId);

    try {
      // Minimal NB floor/table
      let floorId: string;
      const { data: fl } = await admin
        .from("restaurant_floors")
        .select("id")
        .eq("branch_id", nbId)
        .eq("code", "nb-e2e")
        .maybeSingle();
      if (fl) floorId = fl.id;
      else {
        const { data, error } = await admin
          .from("restaurant_floors")
          .insert({ branch_id: nbId, code: "nb-e2e", display_name: "NB E2E", is_active: true })
          .select("id")
          .single();
        if (error) throw error;
        floorId = data.id;
      }
      let tableId: string;
      const { data: tb } = await admin
        .from("restaurant_tables")
        .select("id")
        .eq("branch_id", nbId)
        .eq("table_number", "NB-1")
        .maybeSingle();
      if (tb) {
        tableId = tb.id;
        await admin
          .from("restaurant_tables")
          .update({ operational_status: "available", status: "available", is_active: true, floor_id: floorId })
          .eq("id", tableId);
      } else {
        const { data, error } = await admin
          .from("restaurant_tables")
          .insert({
            branch_id: nbId,
            floor_id: floorId,
            table_number: "NB-1",
            capacity_min: 2,
            capacity_max: 4,
            capacity: 4,
            is_active: true,
            operational_status: "available",
            status: "available",
          })
          .select("id")
          .single();
        if (error) throw error;
        tableId = data.id;
      }

      // Super admin can operate NB when operating
      const envAccounts = JSON.parse(readFileSync(resolve("scripts/.tmp_pw/staff-handover.local.json"), "utf8"));
      const adminAcct = (envAccounts.accounts || []).find((a: { email: string }) => a.email === "admin@telepizza.pk");
      test.skip(!adminAcct, "admin fixture missing");
      const password = adminAcct.password ?? adminAcct.temporaryPassword;

      await browserLogin(page, adminAcct.email, password);
      const token = await getBrowserAccessToken(page);
      const seat = await apiJson(request, "POST", "/api/v1/admin/table-service/sessions/walk-in", {
        token,
        expectStatus: 201,
        body: { branchId: nbId, tableIds: [tableId], partySize: 2, guestName: "NB Isolated" },
      });
      const sessionId = String((seat.json.data as Record<string, unknown>).sessionId ?? (seat.json.data as Record<string, unknown>).id);
      await apiJson(request, "POST", `/api/v1/admin/table-service/sessions/${sessionId}/close`, {
        token,
        expectStatus: 200,
        body: { overrideOpenBill: true, note: "NB isolated cleanup" },
      });

      // RO host still denied while NB temporarily operating (no membership)
      const host = d3Account("host");
      await page.evaluate(() => localStorage.clear());
      await browserLogin(page, host.email, host.password);
      const hostToken = await getBrowserAccessToken(page);
      const denied = await apiJson(request, "GET", `/api/v1/admin/table-service/floor-state?branchId=${nbId}`, {
        token: hostToken,
      });
      expect(denied.status).toBe(403);

      writeEvidence("d3-northern-bypass-isolated.json", {
        result: "PASS",
        activatedTemporarily: true,
        restoredTo: "coming-soon",
        sessionId,
        hostDeniedStatus: denied.status,
        productionReady: false,
      });
    } finally {
      await admin.from("branches").update({ status: "coming-soon" }).eq("id", nbId);
      const { data: after } = await admin.from("branches").select("status").eq("id", nbId).single();
      expect(after?.status).toBe("coming-soon");
    }
  });
});

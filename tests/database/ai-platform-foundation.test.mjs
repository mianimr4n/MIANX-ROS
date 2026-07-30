import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260730120000_ai_platform_foundation.sql"),
  "utf8",
);

describe("Phase 4 — AI platform foundation migration", () => {
  it("creates the four foundation tables", () => {
    for (const table of ["ai_teams", "ai_agents", "ai_tasks", "ai_approvals"]) {
      assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    }
  });

  it("seeds the six core AI teams from the SRS", () => {
    for (const name of [
      "Executive AI Team",
      "Customer Experience Team",
      "Marketing Team",
      "Restaurant Operations Team",
      "Finance Team",
      "Analytics Team",
    ]) {
      assert.match(migration, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("enables RLS and grants service_role write + authenticated read", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /grant all on public\.ai_teams to service_role/);
    assert.match(migration, /grant select on public\.ai_teams to authenticated/);
  });
});

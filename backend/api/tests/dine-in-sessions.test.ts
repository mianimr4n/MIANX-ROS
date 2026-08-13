import { createHash } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

import { createApp } from "../src/app.js";
import type { DineInSessionsService, SafePublicDineInSession } from "../src/services/dine-in/sessions.js";
import {
  generateSecurePublicSessionToken,
  hashPublicSessionToken,
} from "../src/services/dine-in/sessions.js";
import { resetDineInResolveRateLimitBuckets } from "../src/services/dine-in/resolve-rate-limit.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const B1 = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";

function safeSession(over: Partial<SafePublicDineInSession> = {}): SafePublicDineInSession {
  return {
    publicToken: "fresh-public-token-abcdefghijklmnopqrstuvwxyz",
    status: "open",
    guestCount: 2,
    openedAt: new Date().toISOString(),
    closedAt: null,
    table: {
      tableNumber: "12",
      displayName: "Patio 12",
      capacity: 4,
      floorOrZone: "patio",
    },
    branch: {
      id: B1,
      code: "MUL-01",
      name: "Telepizza Multan",
      city: "Multan",
    },
    ...over,
  };
}

function buildApp(sessions: Partial<DineInSessionsService> = {}) {
  const dineInSessions: DineInSessionsService = {
    resolveSession: vi.fn(async () => safeSession()),
    getSessionByPublicToken: vi.fn(async () => safeSession({ publicToken: "caller-token-abcdefghijklmnopqrstuvwxyz" })),
    ...sessions,
  };

  const { app } = createApp(readyEnv, { dineInSessions });
  return { app, dineInSessions };
}

beforeEach(() => {
  resetDineInResolveRateLimitBuckets();
});

describe("public session token helpers", () => {
  it("generateSecurePublicSessionToken returns raw once and SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateSecurePublicSessionToken();
    expect(rawToken.length).toBeGreaterThanOrEqual(32);
    expect(tokenHash).toBe(hashPublicSessionToken(rawToken));
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).toBe(createHash("sha256").update(rawToken, "utf8").digest("hex"));
  });

  it("hash never equals raw and is deterministic", () => {
    const { rawToken, tokenHash } = generateSecurePublicSessionToken();
    expect(hashPublicSessionToken(rawToken)).toBe(tokenHash);
    expect(hashPublicSessionToken(rawToken)).not.toBe(rawToken);
  });
});

describe("POST /api/v1/dine-in/sessions/resolve", () => {
  it("resolves valid QR into safe session without hashes or internal session id", async () => {
    const { app, dineInSessions } = buildApp();
    const res = await request(app)
      .post("/api/v1/dine-in/sessions/resolve")
      .send({ qrToken: "valid-table-qr-token-abcdefgh", guestCount: 3 });

    expect(res.status).toBe(200);
    expect(dineInSessions.resolveSession).toHaveBeenCalledWith({
      qrToken: "valid-table-qr-token-abcdefgh",
      guestCount: 3,
    });
    expect(res.body.data.publicToken).toBeTruthy();
    expect(res.body.data.branch.code).toBe("MUL-01");
    expect(res.body.data.table.tableNumber).toBe("12");
    expect(res.body.data).not.toHaveProperty("id");
    expect(res.body.data).not.toHaveProperty("public_token_hash");
    expect(JSON.stringify(res.body)).not.toMatch(/public_token_hash|tokenHash|qr_token_hash/i);
  });

  it("rejects short qrToken", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/api/v1/dine-in/sessions/resolve").send({ qrToken: "short" });
    expect(res.status).toBe(400);
  });

  it("maps invalid QR to 404", async () => {
    const { app } = buildApp({
      resolveSession: vi.fn(async () => {
        const { ApiError } = await import("../src/common/http.js");
        throw new ApiError(404, "QR_TOKEN_INVALID", "Table QR token is invalid or inactive.");
      }),
    });
    const res = await request(app)
      .post("/api/v1/dine-in/sessions/resolve")
      .send({ qrToken: "unknown-table-qr-token-abcdef" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("QR_TOKEN_INVALID");
  });

  it("rate limits repeated resolve for same IP+token", async () => {
    const { app } = buildApp();
    const body = { qrToken: "rate-limit-table-qr-token-xyz" };
    let lastStatus = 200;
    for (let i = 0; i < 35; i += 1) {
      const res = await request(app).post("/api/v1/dine-in/sessions/resolve").send(body);
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("GET /api/v1/dine-in/sessions/:publicToken", () => {
  it("returns safe session state and never exposes hashes", async () => {
    const token = "caller-held-public-token-abcdefghij";
    const { app, dineInSessions } = buildApp({
      getSessionByPublicToken: vi.fn(async () => safeSession({ publicToken: token })),
    });
    const res = await request(app).get(`/api/v1/dine-in/sessions/${token}`);
    expect(res.status).toBe(200);
    expect(dineInSessions.getSessionByPublicToken).toHaveBeenCalledWith(token);
    expect(res.body.data.publicToken).toBe(token);
    expect(res.body.data).not.toHaveProperty("id");
    expect(JSON.stringify(res.body)).not.toMatch(/public_token_hash|tokenHash/i);
  });

  it("maps miss to 404", async () => {
    const { app } = buildApp({
      getSessionByPublicToken: vi.fn(async () => {
        const { ApiError } = await import("../src/common/http.js");
        throw new ApiError(404, "SESSION_NOT_FOUND", "Dine-in session not found.");
      }),
    });
    const res = await request(app).get("/api/v1/dine-in/sessions/missing-public-token-zzzz");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SESSION_NOT_FOUND");
  });
});

describe("dine-in module registration", () => {
  it("lists dine-in in /api/v1/meta/modules", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/meta/modules");
    expect(res.status).toBe(200);
    const names = res.body.data.map((m: { name: string }) => m.name);
    expect(names).toContain("dine-in");
  });
});

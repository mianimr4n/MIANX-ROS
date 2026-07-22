import { describe, expect, it } from "vitest";

import { evaluateLocalSafety, getEnvironmentStatus } from "../src/config/env.js";

const localBase = {
  PORT: "4100",
  CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  TELEPIZZA_ENV: "local",
};

describe("getEnvironmentStatus", () => {
  it("returns ready for local loopback Supabase", () => {
    const status = getEnvironmentStatus({
      ...localBase,
      SUPABASE_URL: "http://127.0.0.1:54321",
    });

    expect(status.isReady).toBe(true);
    expect(status.safetyBlockers).toEqual([]);
    expect(status.config.envClass).toBe("local");
    expect(status.config.paymentMode).toBe("mock");
  });

  it("reports missing and invalid variables", () => {
    const status = getEnvironmentStatus({
      PORT: "99999",
      API_CORS_ORIGIN: "not-a-url",
      API_JWT_SECRET: "short",
      SUPABASE_URL: "bad-url",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      TELEPIZZA_ENV: "local",
    });

    expect(status.isReady).toBe(false);
    expect(status.issues.map((issue) => issue.key)).toEqual(
      expect.arrayContaining([
        "PORT",
        "API_CORS_ORIGIN",
        "API_JWT_SECRET",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]),
    );
  });

  it("blocks cloud Supabase in local mode", () => {
    const status = getEnvironmentStatus({
      ...localBase,
      SUPABASE_URL: "https://example.supabase.co",
    });

    expect(status.isReady).toBe(false);
    expect(status.safetyBlockers.some((b) => b.key === "SUPABASE_URL")).toBe(true);
  });

  it("blocks live payment mode in local", () => {
    const status = getEnvironmentStatus({
      ...localBase,
      SUPABASE_URL: "http://127.0.0.1:54321",
      TELEPIZZA_PAYMENT_MODE: "live",
    });

    expect(status.safetyBlockers.some((b) => b.key === "TELEPIZZA_PAYMENT_MODE")).toBe(true);
  });

  it("allows cloud Supabase for staging with explicit override", () => {
    const status = getEnvironmentStatus({
      ...localBase,
      TELEPIZZA_ENV: "staging",
      TELEPIZZA_ALLOW_REMOTE_SUPABASE: "1",
      SUPABASE_URL: "https://example.supabase.co",
      TELEPIZZA_EMAIL_MODE: "live",
      TELEPIZZA_WHATSAPP_MODE: "sandbox",
      TELEPIZZA_PAYMENT_MODE: "sandbox",
      TELEPIZZA_WEBHOOK_MODE: "disabled",
    });

    expect(status.safetyBlockers).toEqual([]);
    expect(status.isReady).toBe(true);
  });

  it("refuses remote override while TELEPIZZA_ENV=local", () => {
    const status = getEnvironmentStatus({
      ...localBase,
      TELEPIZZA_ALLOW_REMOTE_SUPABASE: "1",
      SUPABASE_URL: "https://example.supabase.co",
    });

    expect(status.safetyBlockers.length).toBeGreaterThan(0);
  });
});

describe("evaluateLocalSafety", () => {
  it("blocks remote DATABASE_URL in local mode", () => {
    const status = getEnvironmentStatus({
      ...localBase,
      SUPABASE_URL: "http://127.0.0.1:54321",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/postgres",
    });
    const blockers = evaluateLocalSafety(
      {
        ...localBase,
        SUPABASE_URL: "http://127.0.0.1:54321",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/postgres",
      },
      status.config,
    );
    expect(blockers.some((b) => b.key === "DATABASE_URL")).toBe(true);
  });
});

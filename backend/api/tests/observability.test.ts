import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";

import { createApp } from "../src/app.js";
import { ApiError } from "../src/common/http.js";
import {
  buildErrorBody,
  createLogger,
  createObservabilityErrorHandler,
  createRequestLoggingMiddleware,
  isSlowRequest,
  redactForLogs,
  resolveRequestId,
  REQUEST_ID_HEADER,
} from "../src/observability/index.js";

const readyEnv = {
  TELEPIZZA_ENV: "local",
  API_JWT_SECRET: "telepizza-local-jwt-secret-min-16",
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  TELEPIZZA_REQUIRE_LOCAL_SUPABASE: "1",
  TELEPIZZA_EMAIL_MODE: "mock",
  TELEPIZZA_WHATSAPP_MODE: "disabled",
  TELEPIZZA_PAYMENT_MODE: "mock",
  TELEPIZZA_WEBHOOK_MODE: "disabled",
  TELEPIZZA_GIT_SHA: "abc1234observability",
  TELEPIZZA_API_VERSION: "0.1.0-test",
  NODE_ENV: "test",
};

describe("RC4 observability", () => {
  it("generates and returns X-Request-ID", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
  });

  it("propagates inbound X-Request-ID", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/api/v1/meta/version").set(REQUEST_ID_HEADER, "client-corr-id-001");
    expect(response.status).toBe(200);
    expect(response.headers[REQUEST_ID_HEADER]).toBe("client-corr-id-001");
    expect(response.body.gitSha).toBe("abc1234observability");
    expect(response.body.version).toBe("0.1.0-test");
  });

  it("rejects malformed inbound request ids and issues a new one", () => {
    expect(resolveRequestId("bad id with spaces")).not.toBe("bad id with spaces");
    expect(resolveRequestId("ok-request-id-01")).toBe("ok-request-id-01");
  });

  it("extends /healthz with diagnostics without removing modules", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("telepizza-api");
    expect(response.body.version).toBeTruthy();
    expect(response.body.nodeVersion).toBeTruthy();
    expect(response.body.environment.envClass).toBe("local");
    expect(response.body.memory.heapUsed).toBeGreaterThan(0);
    expect(response.body.modules.length).toBeGreaterThan(0);
    expect(response.body.migrations.status).toBe("unavailable");
    expect(response.body.database).toBeTruthy();
  });

  it("extends /readyz with runtime metadata", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/readyz");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.runtime.version).toBe("0.1.0-test");
    expect(response.body.runtime.gitSha).toBe("abc1234observability");
    expect(response.body.database.connectivity).toBeTruthy();
  });

  it("formats errors with requestId, status, and errorClass", async () => {
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));
    const app = express();
    app.use(createRequestLoggingMiddleware({ logger }));
    app.get("/boom", () => {
      throw new ApiError(418, "TEAPOT", "I am a teapot.");
    });
    app.use(createObservabilityErrorHandler({ logger }));

    const response = await request(app).get("/boom").set(REQUEST_ID_HEADER, "err-corr-99");
    expect(response.status).toBe(418);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("TEAPOT");
    expect(response.body.error.requestId).toBe("err-corr-99");
    expect(response.body.error.status).toBe(418);
    expect(response.body.error.errorClass).toBe("ApiError");
    expect(response.body.error.timestamp).toBeTruthy();
    expect(response.body.error.route).toBe("/boom");
    expect(response.headers[REQUEST_ID_HEADER]).toBe("err-corr-99");
  });

  it("buildErrorBody matches the standard error contract", () => {
    const body = buildErrorBody({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
      status: 500,
      errorClass: "Error",
      requestId: "r1",
      route: "/x",
      includeDetails: false,
    });
    expect(body.error.requestId).toBe("r1");
    expect(body.error.status).toBe(500);
    expect(body.error.details).toBeUndefined();
  });

  it("detects slow requests at the 500ms threshold", () => {
    expect(isSlowRequest(499)).toBe(false);
    expect(isSlowRequest(500)).toBe(true);
    expect(isSlowRequest(1200, 500)).toBe(true);
  });

  it("logs slow requests with warn level", async () => {
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));
    let clock = 1_000;
    const app = express();
    app.use(
      createRequestLoggingMiddleware({
        logger,
        slowRequestMs: 500,
        now: () => {
          const value = clock;
          clock += 600;
          return value;
        },
      }),
    );
    app.get("/slow", (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get("/slow");
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[lines.length - 1]!);
    expect(parsed.msg).toBe("slow_request");
    expect(parsed.level).toBe("warn");
    expect(parsed.durationMs).toBeGreaterThanOrEqual(500);
  });

  it("redacts secret-looking keys from log payloads", () => {
    const redacted = redactForLogs({
      password: "super-secret",
      authorization: "Bearer abc",
      nested: { apiKey: "x", ok: true },
    }) as Record<string, unknown>;
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.authorization).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).ok).toBe(true);
  });

  it("hides internal 500 messages in production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const app = express();
      app.use(createRequestLoggingMiddleware({ logger: createLogger(() => undefined) }));
      app.get("/fail", () => {
        throw new Error("SELECT * FROM secrets WHERE password = 'nope'");
      });
      app.use(createObservabilityErrorHandler({ logger: createLogger(() => undefined) }));
      const response = await request(app).get("/fail");
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe("An unexpected error occurred.");
      expect(JSON.stringify(response.body)).not.toMatch(/SELECT|password/i);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

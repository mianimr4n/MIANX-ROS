import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("Telepizza API app", () => {
  it("returns the registered modules on /healthz", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.modules).toHaveLength(6);
  });

  it("returns readiness issues when required variables are missing", async () => {
    const { app } = createApp({
      API_PORT: "4000",
      API_CORS_ORIGIN: "http://localhost:3000",
    });

    const response = await request(app).get("/readyz");

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
    expect(response.body.issues.length).toBeGreaterThan(0);
  });

  it("validates order creation payloads", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).post("/api/v1/orders").send({
      branchId: "bad-id",
      orderType: "delivery",
      orderSource: "website",
      contactName: "A",
      contactPhone: "",
      items: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("guards admin routes with role checks", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/api/v1/admin/controls");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});

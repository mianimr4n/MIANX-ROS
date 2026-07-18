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

describe("Sprint 4.6 riders routes auth gate", () => {
  it("GET /api/v1/riders/assignments requires authentication (no legacy 501)", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app).get("/api/v1/riders/assignments");
    expect(response.status).toBe(401);
    expect(response.body.error.code).not.toBe("NOT_IMPLEMENTED");
  });

  it("POST /api/v1/riders/deliveries/:id/status requires authentication", async () => {
    const { app } = createApp(readyEnv);
    const response = await request(app)
      .post("/api/v1/riders/deliveries/00000000-0000-4000-8000-000000000001/status")
      .send({ status: "picked-up" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).not.toBe("NOT_IMPLEMENTED");
  });
});

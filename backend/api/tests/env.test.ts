import { describe, expect, it } from "vitest";

import { getEnvironmentStatus } from "../src/config/env.js";

describe("getEnvironmentStatus", () => {
  it("returns ready when all required variables are present", () => {
    const status = getEnvironmentStatus({
      PORT: "4100",
      CORS_ORIGIN: "http://localhost:3000",
      API_JWT_SECRET: "super-secret-token-123",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(status.isReady).toBe(true);
    expect(status.issues).toEqual([]);
    expect(status.config.port).toBe(4100);
    expect(status.config.corsOrigin).toBe("http://localhost:3000");
  });

  it("reports missing and invalid variables", () => {
    const status = getEnvironmentStatus({
      PORT: "99999",
      API_CORS_ORIGIN: "not-a-url",
      API_JWT_SECRET: "short",
      SUPABASE_URL: "bad-url",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
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
});

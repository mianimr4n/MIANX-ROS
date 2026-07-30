import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  AiPlatformService,
  AiTaskRecord,
  AiTeamRecord,
} from "../src/services/ai/platform.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

function mockUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: "user-founder",
    authUserId: "auth-founder",
    email: "founder@example.com",
    userType: "staff",
    status: "active",
    roles: ["super-admin"],
    permissions: ["*"],
    branchIds: [],
    isSuperAdmin: true,
    ...overrides,
  };
}

function authRepo(p: AuthPrincipal): AuthPrincipalRepository {
  return {
    async resolvePrincipal() {
      return p;
    },
    async getMe() {
      throw new Error("unused");
    },
  };
}

function verifier(authUserId: string, email: string): AuthTokenVerifier {
  return {
    async getUser() {
      return { user: mockUser(authUserId, email) };
    },
  };
}

const teams: AiTeamRecord[] = [
  {
    id: "team-1",
    code: "executive",
    name: "Executive AI Team",
    description: "Executive assistants",
    createdAt: new Date().toISOString(),
    agents: [
      {
        id: "agent-1",
        teamId: "team-1",
        name: "CEO AI",
        role: "CEO",
        modelId: null,
        status: "inactive",
        configuration: {},
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

const pendingTasks: AiTaskRecord[] = [
  {
    id: "task-1",
    agentId: "agent-1",
    taskType: "briefing",
    status: "pending",
    inputPayload: { topic: "opening" },
    outputPayload: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentName: "CEO AI",
    teamId: "team-1",
    teamName: "Executive AI Team",
  },
];

const aiPlatform: AiPlatformService = {
  async listTeamsWithAgents() {
    return teams;
  },
  async listPendingTasks() {
    return pendingTasks;
  },
};

describe("Phase 4 — AI Platform foundation APIs", () => {
  it("GET /api/v1/ai/teams requires auth", async () => {
    const { app } = createApp(readyEnv, { aiPlatform });
    const res = await request(app).get("/api/v1/ai/teams");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/ai/teams requires admin.access", async () => {
    const { app } = createApp(readyEnv, {
      aiPlatform,
      authTokenVerifier: verifier("auth-staff", "staff@example.com"),
      authProfileRepository: authRepo(
        principal({
          isSuperAdmin: false,
          roles: ["cashier"],
          permissions: ["pos.access"],
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/ai/teams")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(403);
  });

  it("GET /api/v1/ai/teams returns teams with agents for admin.access", async () => {
    const { app } = createApp(readyEnv, {
      aiPlatform,
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal({ permissions: ["admin.access"] })),
    });
    const res = await request(app)
      .get("/api/v1/ai/teams")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Executive AI Team");
    expect(res.body.data[0].agents[0].name).toBe("CEO AI");
    expect(res.body.meta.agentCount).toBe(1);
  });

  it("GET /api/v1/ai/tasks returns pending tasks for admin.access", async () => {
    const { app } = createApp(readyEnv, {
      aiPlatform,
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal({ permissions: ["admin.access"] })),
    });
    const res = await request(app)
      .get("/api/v1/ai/tasks")
      .set("Authorization", "Bearer test-token");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("pending");
    expect(res.body.meta.status).toBe("pending");
  });
});

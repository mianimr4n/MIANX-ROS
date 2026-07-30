import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";

export interface AiAgentRecord {
  id: string;
  teamId: string;
  name: string;
  role: string;
  modelId: string | null;
  status: string;
  configuration: Record<string, unknown>;
  createdAt: string;
}

export interface AiTeamRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  agents: AiAgentRecord[];
}

export interface AiTaskRecord {
  id: string;
  agentId: string;
  taskType: string;
  status: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  agentName: string | null;
  teamId: string | null;
  teamName: string | null;
}

export interface AiPlatformService {
  listTeamsWithAgents(): Promise<AiTeamRecord[]>;
  listPendingTasks(limit?: number): Promise<AiTaskRecord[]>;
}

type TeamRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
};

type AgentRow = {
  id: string;
  team_id: string;
  name: string;
  role: string;
  model_id: string | null;
  status: string;
  configuration: Record<string, unknown> | null;
  created_at: string;
};

type TaskRow = {
  id: string;
  agent_id: string;
  task_type: string;
  status: string;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  agent: { id: string; name: string; team_id: string; team: { id: string; name: string } | null } | null;
};

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mapAgent(row: AgentRow): AiAgentRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    role: row.role,
    modelId: row.model_id,
    status: row.status,
    configuration: asObject(row.configuration),
    createdAt: row.created_at,
  };
}

export function createAiPlatformService(envStatus: EnvironmentStatus): AiPlatformService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async listTeamsWithAgents() {
      const client = supabase();
      const { data: teams, error: teamsError } = await client
        .from("ai_teams")
        .select("id, code, name, description, created_at")
        .order("name", { ascending: true });
      if (teamsError) {
        throw new ApiError(500, "AI_TEAMS_READ_FAILED", teamsError.message);
      }

      const teamRows = (teams ?? []) as TeamRow[];
      if (teamRows.length === 0) return [];

      const teamIds = teamRows.map((row) => row.id);
      const { data: agents, error: agentsError } = await client
        .from("ai_agents")
        .select("id, team_id, name, role, model_id, status, configuration, created_at")
        .in("team_id", teamIds)
        .order("name", { ascending: true });
      if (agentsError) {
        throw new ApiError(500, "AI_AGENTS_READ_FAILED", agentsError.message);
      }

      const byTeam = new Map<string, AiAgentRecord[]>();
      for (const agent of (agents ?? []) as AgentRow[]) {
        const list = byTeam.get(agent.team_id) ?? [];
        list.push(mapAgent(agent));
        byTeam.set(agent.team_id, list);
      }

      return teamRows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        agents: byTeam.get(row.id) ?? [],
      }));
    },

    async listPendingTasks(limit = 50) {
      const client = supabase();
      const capped = Math.min(Math.max(limit, 1), 100);
      const { data, error } = await client
        .from("ai_tasks")
        .select(
          "id, agent_id, task_type, status, input_payload, output_payload, created_at, updated_at, agent:ai_agents(id, name, team_id, team:ai_teams(id, name))",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(capped);
      if (error) {
        throw new ApiError(500, "AI_TASKS_READ_FAILED", error.message);
      }

      const rows = (data ?? []) as unknown as TaskRow[];
      return rows.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        taskType: row.task_type,
        status: row.status,
        inputPayload: asObject(row.input_payload),
        outputPayload: row.output_payload == null ? null : asObject(row.output_payload),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        agentName: row.agent?.name ?? null,
        teamId: row.agent?.team_id ?? row.agent?.team?.id ?? null,
        teamName: row.agent?.team?.name ?? null,
      }));
    },
  };
}

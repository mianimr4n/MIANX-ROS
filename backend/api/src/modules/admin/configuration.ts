import { Router } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAuthorizationHelpers, type AuthorizedRequest } from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { EnvironmentStatus } from "../../config/env.js";

export interface AdminConfigurationRouterDeps {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  envStatus: EnvironmentStatus;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAdminConfigurationRouter(deps: AdminConfigurationRouterDeps) {
  const router = Router();
  const { requireAuthenticatedUser, requireSuperAdmin, requirePermission } = createAuthorizationHelpers(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get("/schemas", requireAuthenticatedUser, requirePermission(["admin.access"]), async (req, res, next) => {
    try {
      const client = createServiceClient(deps.envStatus);
      const { data, error } = await client.from("configuration_schemas").select("*").order("key", { ascending: true });
      if (error) throw error;
      return res.json({ ok: true, data: data ?? [] });
    } catch (err) {
      return next(err);
    }
  });

  const keyParam = z.object({ key: z.string().min(1) });
  router.get(
    "/branches/:branchId/configuration/:key/effective",
    requireAuthenticatedUser,
    requirePermission(["admin.access"]),
    async (req, res, next) => {
      try {
        const parse = keyParam.safeParse({ key: req.params.key });
        if (!parse.success) return res.status(400).json({ ok: false, error: "INVALID_KEY" });
        const key = parse.data.key;
        const branchId = req.params.branchId;
        const client = createServiceClient(deps.envStatus);

        // Find schema by key
        const { data: schemas, error: schemaErr } = await client
          .from("configuration_schemas")
          .select("*")
          .eq("key", key)
          .limit(1);
        if (schemaErr) throw schemaErr;
        const schema = schemas && schemas[0];
        if (!schema) return res.status(404).json({ ok: false, error: "SCHEMA_NOT_FOUND" });

        // Helper to find active version for a scope
        async function findActive(scopeType: string, scopeId: string | null) {
          const q = client
            .from("configuration_versions")
            .select("*")
            .eq("schema_id", schema.id)
            .eq("status", "active")
            .eq("scope_type", scopeType);
          if (scopeId) q.eq("scope_id", scopeId);
          else q.is("scope_id", null);
          const { data, error } = await q.order("activated_at", { ascending: false }).limit(1);
          if (error) throw error;
          return data && data[0];
        }

        // 1) branch override
        const branchActive = await findActive("branch", branchId);
        if (branchActive) return res.json({ ok: true, data: { source: "branch", value: branchActive.value } });

        // 2) organization default — fetch single org settings id (organization_settings singleton)
        const { data: orgs, error: orgErr } = await client.from("organization_settings").select("id").limit(1);
        if (orgErr) throw orgErr;
        const orgId = orgs && orgs[0] ? orgs[0].id : null;
        const orgActive = await findActive("organization", orgId);
        if (orgActive) return res.json({ ok: true, data: { source: "organization", value: orgActive.value } });

        // 3) fallback to schema default_value
        return res.json({ ok: true, data: { source: "default", value: schema.default_value } });
      } catch (err) {
        return next(err);
      }
    },
  );

  return router;
}

import { Router, type Request } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { ApiError } from "../../common/http.js";
import { createAuthorizationHelpers, type AuthorizedRequest } from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipal, AuthPrincipal as Principal } from "../../services/auth/principal.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { EnvironmentStatus } from "../../config/env.js";

export interface AdminConfigurationRouterDeps {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  envStatus: EnvironmentStatus;
  clientFactory?: () => SupabaseClient;
}

type ConfigurationSchema = {
  id: string;
  scope_type: "organization" | "branch";
  key: string;
  label: string;
  data_type: "string" | "number" | "boolean" | "jsonb" | "secret_ref";
  default_value: unknown;
  validation_rules: Record<string, unknown> | null;
  is_required: boolean;
};

type PersistResult = {
  version_id: string;
  change_id: string | null;
  outcome: "create" | "update" | "unchanged" | "replayed";
  persisted_value: unknown;
  persisted_at: string;
};

type ConfigurationVersion = {
  id: string;
  schema_id: string;
  scope_type: "organization" | "branch";
  scope_id: string;
  value: unknown;
  status: string;
  created_by: string | null;
  approved_by: string | null;
  activated_at: string | null;
  created_at: string;
};

type ActivePointer = {
  version_id: string;
  revision: number;
  activated_by: string | null;
  activated_at: string;
};

const uuidParam = z.string().uuid();
const keyParam = z.string().trim().min(1).max(100).regex(/^[a-z][a-z0-9_.-]*$/);
const writeBody = z.object({
  value: z.unknown(),
  reason: z.string().trim().min(1).max(1000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
}).strict();
const versionBody = z.object({
  scopeType: z.enum(["organization", "branch"]),
  scopeId: z.string().uuid(),
  key: keyParam,
  value: z.unknown(),
  reason: z.string().trim().min(1).max(1000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
}).strict();
const lifecycleBody = z.object({
  expectedRevision: z.number().int().nonnegative().optional(),
  reason: z.string().trim().min(1).max(1000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
}).strict();
const versionsQuery = z.object({
  scopeType: z.enum(["organization", "branch"]),
  scopeId: z.string().uuid(),
  key: keyParam.optional(),
}).strict();
const historyQuery = z.object({
  key: keyParam.optional(),
  action: z.enum(["create", "update", "activate", "rollback", "delete"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
const SECRET_REFERENCE = /^[A-Z][A-Z0-9_]{2,127}$/;

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requestContext(req: Request) {
  const requestId = typeof resLocal(req, "requestId") === "string" ? String(resLocal(req, "requestId")) : null;
  const correlationHeader = req.header("x-correlation-id")?.trim();
  return { requestId, correlationId: correlationHeader || requestId };
}

function resLocal(req: Request, key: string): unknown {
  return req.res?.locals?.[key];
}

function maskValue(schema: ConfigurationSchema, value: unknown, principal: Principal): unknown {
  void principal;
  return schema.data_type === "secret_ref" ? "<REDACTED>" : value;
}

function numberRule(rules: Record<string, unknown>, key: string): number | undefined {
  return typeof rules[key] === "number" && Number.isFinite(rules[key]) ? rules[key] as number : undefined;
}

function validateValue(schema: ConfigurationSchema, value: unknown): unknown {
  if (value === null && !schema.is_required) return null;
  const rules = schema.validation_rules ?? {};
  const invalid = (message: string): never => {
    throw new ApiError(400, "INVALID_CONFIGURATION_VALUE", message);
  };

  if (schema.data_type === "string" || schema.data_type === "secret_ref") {
    const stringValue = typeof value === "string" ? value : invalid(`${schema.key} must be a string.`);
    const normalized = stringValue.trim();
    if (!normalized && schema.is_required) invalid(`${schema.key} is required.`);
    const minLength = numberRule(rules, "minLength");
    const maxLength = numberRule(rules, "maxLength");
    if (minLength !== undefined && normalized.length < minLength) invalid(`${schema.key} is shorter than minLength.`);
    if (maxLength !== undefined && normalized.length > maxLength) invalid(`${schema.key} exceeds maxLength.`);
    if (typeof rules.pattern === "string") {
      let pattern: RegExp;
      try { pattern = new RegExp(rules.pattern); } catch { throw new ApiError(500, "INVALID_CONFIGURATION_SCHEMA", `${schema.key} has an invalid pattern.`); }
      if (!pattern.test(normalized)) invalid(`${schema.key} does not match its required pattern.`);
    }
    if (schema.data_type === "secret_ref" && !SECRET_REFERENCE.test(normalized)) {
      invalid(`${schema.key} must be an approved environment-variable reference, never a raw secret.`);
    }
    return normalized;
  }

  if (schema.data_type === "number") {
    const numberValue = typeof value === "number" && Number.isFinite(value)
      ? value
      : invalid(`${schema.key} must be a finite number.`);
    const minimum = numberRule(rules, "minimum") ?? numberRule(rules, "min");
    const maximum = numberRule(rules, "maximum") ?? numberRule(rules, "max");
    if (minimum !== undefined && numberValue < minimum) invalid(`${schema.key} is below its minimum.`);
    if (maximum !== undefined && numberValue > maximum) invalid(`${schema.key} exceeds its maximum.`);
    return numberValue;
  }

  if (schema.data_type === "boolean") {
    if (typeof value !== "boolean") invalid(`${schema.key} must be a boolean.`);
    return value;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(`${schema.key} must be a JSON object.`);
  }
  return value;
}

async function findSchema(client: SupabaseClient, scopeType: "organization" | "branch", key: string) {
  const { data, error } = await client.from("configuration_schemas").select("*")
    .eq("scope_type", scopeType).eq("key", key).maybeSingle();
  if (error) throw new ApiError(500, "CONFIGURATION_SCHEMA_READ_FAILED", error.message);
  return data as ConfigurationSchema | null;
}

async function findActive(client: SupabaseClient, schemaId: string, scopeType: string, scopeId: string) {
  const { data: pointer, error: pointerError } = await client.from("configuration_active_versions")
    .select("version_id, revision, activated_at").eq("schema_id", schemaId)
    .eq("scope_type", scopeType).eq("scope_id", scopeId).maybeSingle();
  if (pointerError) throw new ApiError(500, "CONFIGURATION_VALUE_READ_FAILED", pointerError.message);
  if (!pointer) return null;
  const { data, error } = await client.from("configuration_versions").select("id, value, activated_at, created_at")
    .eq("id", (pointer as ActivePointer).version_id).maybeSingle();
  if (error) throw new ApiError(500, "CONFIGURATION_VALUE_READ_FAILED", error.message);
  return data as { id: string; value: unknown; activated_at: string | null; created_at: string } | null;
}

async function findVersion(client: SupabaseClient, versionId: string) {
  const { data, error } = await client.from("configuration_versions").select("*").eq("id", versionId).maybeSingle();
  if (error) throw new ApiError(500, "CONFIGURATION_VERSION_READ_FAILED", error.message);
  if (!data) throw new ApiError(404, "CONFIGURATION_VERSION_NOT_FOUND", "Configuration version was not found.");
  return data as ConfigurationVersion;
}

async function findPointer(client: SupabaseClient, version: ConfigurationVersion) {
  const { data, error } = await client.from("configuration_active_versions").select("version_id, revision, activated_by, activated_at")
    .eq("schema_id", version.schema_id).eq("scope_type", version.scope_type)
    .eq("scope_id", version.scope_id).maybeSingle();
  if (error) throw new ApiError(500, "CONFIGURATION_ACTIVE_READ_FAILED", error.message);
  return data as ActivePointer | null;
}

function rpcError(error: { message: string; code?: string }, operation: string): never {
  if (error.code === "40001") throw new ApiError(409, "STALE_CONFIGURATION_REVISION", "Configuration activation revision is stale.");
  if (error.code === "P0002") throw new ApiError(404, "CONFIGURATION_VERSION_NOT_FOUND", "Configuration version was not found.");
  if (error.code === "22023") throw new ApiError(400, "INVALID_CONFIGURATION_TRANSITION", error.message);
  if (error.code === "55000") throw new ApiError(409, "CONFIGURATION_TRANSITION_CONFLICT", error.message);
  if (error.code === "23503") throw new ApiError(403, "CONFIGURATION_SCOPE_DENIED", "Configuration scope access denied.");
  throw new ApiError(500, `${operation}_FAILED`, error.message);
}

async function loadBranchOrganization(client: SupabaseClient, branchId: string) {
  const { data, error } = await client.from("branches").select("id, organization_id")
    .eq("id", branchId).maybeSingle();
  if (error) throw new ApiError(500, "BRANCH_READ_FAILED", error.message);
  if (!data) throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
  return (data as { organization_id: string }).organization_id;
}

async function assertOrganization(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client.from("organization_settings").select("organization_id")
    .eq("organization_id", organizationId).maybeSingle();
  if (error) throw new ApiError(500, "ORGANIZATION_READ_FAILED", error.message);
  if (!data) throw new ApiError(403, "ORGANIZATION_ACCESS_DENIED", "Organization access denied.");
}

async function persist(client: SupabaseClient, input: {
  schema: ConfigurationSchema; scopeType: "organization" | "branch"; scopeId: string;
  value: unknown; actor: AuthPrincipal; reason?: string; idempotencyKey?: string;
  requestId: string | null; correlationId: string | null;
}) {
  const { data, error } = await client.rpc("persist_configuration_value", {
    p_schema_id: input.schema.id, p_scope_type: input.scopeType, p_scope_id: input.scopeId,
    p_value: input.value, p_actor: input.actor.userId, p_reason: input.reason ?? null,
    p_request_id: input.requestId, p_correlation_id: input.correlationId,
    p_idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) throw new ApiError(500, "CONFIGURATION_PERSIST_FAILED", error.message);
  const result = (data as PersistResult[] | null)?.[0];
  if (!result) throw new ApiError(500, "CONFIGURATION_PERSIST_FAILED", "Persistence returned no result.");
  return result;
}

export function createAdminConfigurationRouter(deps: AdminConfigurationRouterDeps) {
  const router = Router();
  const serviceClient = () => deps.clientFactory?.() ?? createServiceClient(deps.envStatus);
  const { requireAuthenticatedUser, requireSuperAdmin, requireAnyPermission, requirePermission } =
    createAuthorizationHelpers(deps.authTokenVerifier, deps.authProfileRepository);

  const assertScopeAccess = async (client: SupabaseClient, principal: AuthPrincipal,
    scopeType: "organization" | "branch", scopeId: string, write = false) => {
    if (scopeType === "organization") {
      await assertOrganization(client, scopeId);
      if (!principal.isSuperAdmin && !(principal.organizationIds ?? []).includes(scopeId)) {
        throw new ApiError(403, "ORGANIZATION_ACCESS_DENIED", "Organization access denied.");
      }
      if (!principal.isSuperAdmin && write) throw new ApiError(403, "ORGANIZATION_ACCESS_DENIED", "Organization access denied.");
      return;
    }
    const organizationId = await loadBranchOrganization(client, scopeId);
    await assertOrganization(client, organizationId);
    if (!principal.isSuperAdmin && !principal.branchIds.includes(scopeId) &&
      !(principal.ownedOrganizationIds ?? []).includes(organizationId)) {
      throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
    }
  };

  const serializeVersion = async (client: SupabaseClient, version: ConfigurationVersion,
    principal: AuthPrincipal) => {
    const { data: schemaData, error } = await client.from("configuration_schemas").select("*")
      .eq("id", version.schema_id).maybeSingle();
    if (error || !schemaData) throw new ApiError(500, "CONFIGURATION_SCHEMA_READ_FAILED", error?.message ?? "Schema missing.");
    const schema = schemaData as ConfigurationSchema;
    const pointer = await findPointer(client, version);
    return {
      ...version,
      key: schema.key,
      value: maskValue(schema, version.value, principal),
      isActive: pointer?.version_id === version.id,
      activeRevision: pointer?.revision ?? 0,
    };
  };

  router.get("/schemas", requireAuthenticatedUser, requirePermission("admin.access"), async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const { data, error } = await serviceClient()
        .from("configuration_schemas").select("*").order("key", { ascending: true });
      if (error) throw new ApiError(500, "CONFIGURATION_SCHEMA_READ_FAILED", error.message);
      const schemas = (data ?? []) as ConfigurationSchema[];
      return res.json({ ok: true, data: schemas.map((schema) => ({
        ...schema, default_value: maskValue(schema, schema.default_value, principal),
      })) });
    } catch (error) { return next(error); }
  });

  router.post("/configuration/versions", requireAuthenticatedUser,
    requireAnyPermission(["branch.manage", "admin.access"]), async (req, res, next) => {
      try {
        const body = versionBody.safeParse(req.body);
        if (!body.success) throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", body.error.flatten());
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        await assertScopeAccess(client, principal, body.data.scopeType, body.data.scopeId, true);
        const schema = await findSchema(client, body.data.scopeType, body.data.key);
        if (!schema) throw new ApiError(404, "SCHEMA_NOT_FOUND", "Configuration key was not found for this scope.");
        const value = validateValue(schema, body.data.value);
        const context = requestContext(req);
        const { data, error } = await client.rpc("create_configuration_version", {
          p_schema_id: schema.id, p_scope_type: body.data.scopeType, p_scope_id: body.data.scopeId,
          p_value: value, p_actor: principal.userId, p_reason: body.data.reason ?? null,
          p_request_id: context.requestId, p_correlation_id: context.correlationId,
          p_idempotency_key: body.data.idempotencyKey ?? null,
        });
        if (error) rpcError(error, "CONFIGURATION_VERSION_CREATE");
        const result = (data as Array<{ version_id: string; outcome: string; created_at: string }> | null)?.[0];
        if (!result) throw new ApiError(500, "CONFIGURATION_VERSION_CREATE_FAILED", "Version creation returned no result.");
        const version = await findVersion(client, result.version_id);
        return res.status(result.outcome === "created" ? 201 : 200)
          .json({ ok: true, data: { ...(await serializeVersion(client, version, principal)), outcome: result.outcome } });
      } catch (error) { return next(error); }
    });

  router.get("/configuration/versions", requireAuthenticatedUser, requirePermission("admin.access"),
    async (req, res, next) => {
      try {
        const query = versionsQuery.safeParse(req.query);
        if (!query.success) throw new ApiError(400, "VALIDATION_ERROR", "Query validation failed.", query.error.flatten());
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        await assertScopeAccess(client, principal, query.data.scopeType, query.data.scopeId);
        let schemaId: string | undefined;
        if (query.data.key) {
          const schema = await findSchema(client, query.data.scopeType, query.data.key);
          if (!schema) throw new ApiError(404, "SCHEMA_NOT_FOUND", "Configuration key was not found for this scope.");
          schemaId = schema.id;
        }
        let builder = client.from("configuration_versions").select("*")
          .eq("scope_type", query.data.scopeType).eq("scope_id", query.data.scopeId);
        if (schemaId) builder = builder.eq("schema_id", schemaId);
        const { data, error } = await builder.order("created_at", { ascending: false });
        if (error) throw new ApiError(500, "CONFIGURATION_VERSION_READ_FAILED", error.message);
        const versions = await Promise.all(((data ?? []) as ConfigurationVersion[])
          .map((version) => serializeVersion(client, version, principal)));
        return res.json({ ok: true, data: versions });
      } catch (error) { return next(error); }
    });

  router.get("/configuration/versions/:versionId", requireAuthenticatedUser,
    requirePermission("admin.access"), async (req, res, next) => {
      try {
        const id = uuidParam.safeParse(req.params.versionId);
        if (!id.success) throw new ApiError(400, "INVALID_VERSION_ID", "Version ID must be a UUID.");
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        const version = await findVersion(client, id.data);
        await assertScopeAccess(client, principal, version.scope_type, version.scope_id);
        return res.json({ ok: true, data: await serializeVersion(client, version, principal) });
      } catch (error) { return next(error); }
    });

  const lifecycle = (operation: "activate" | "rollback") => async (req: Request,
    res: import("express").Response, next: import("express").NextFunction) => {
      try {
        const id = uuidParam.safeParse(req.params.versionId);
        const body = lifecycleBody.safeParse(req.body);
        if (!id.success) throw new ApiError(400, "INVALID_VERSION_ID", "Version ID must be a UUID.");
        if (!body.success) throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", body.error.flatten());
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        const target = await findVersion(client, id.data);
        await assertScopeAccess(client, principal, target.scope_type, target.scope_id, true);
        const context = requestContext(req);
        const functionName = operation === "activate" ? "activate_configuration_version" : "rollback_configuration_version";
        const args = operation === "activate"
          ? { p_version_id: id.data, p_actor: principal.userId, p_expected_revision: body.data.expectedRevision ?? null,
              p_reason: body.data.reason ?? null, p_request_id: context.requestId,
              p_correlation_id: context.correlationId, p_idempotency_key: body.data.idempotencyKey ?? null }
          : { p_target_version_id: id.data, p_actor: principal.userId, p_expected_revision: body.data.expectedRevision ?? null,
              p_reason: body.data.reason ?? null, p_request_id: context.requestId,
              p_correlation_id: context.correlationId, p_idempotency_key: body.data.idempotencyKey ?? null };
        const { data, error } = await client.rpc(functionName, args);
        if (error) rpcError(error, operation === "activate" ? "CONFIGURATION_ACTIVATE" : "CONFIGURATION_ROLLBACK");
        const result = (data as Array<Record<string, unknown>> | null)?.[0];
        if (!result) throw new ApiError(500, "CONFIGURATION_TRANSITION_FAILED", "Lifecycle transition returned no result.");
        const resultVersion = await findVersion(client, String(result.version_id));
        return res.json({ ok: true, data: { ...(await serializeVersion(client, resultVersion, principal)),
          outcome: result.outcome, previousVersionId: result.previous_version_id ?? null,
          sourceVersionId: result.source_version_id ?? null, revision: result.revision,
          activatedAt: result.activated_at } });
      } catch (error) { return next(error); }
    };

  router.post("/configuration/versions/:versionId/activate", requireAuthenticatedUser,
    requireSuperAdmin, lifecycle("activate"));
  router.post("/configuration/versions/:versionId/rollback", requireAuthenticatedUser,
    requireSuperAdmin, lifecycle("rollback"));

  router.get("/branches/:branchId/configuration/effective", requireAuthenticatedUser,
    requirePermission("admin.access"), async (req, res, next) => {
      try {
        const branch = uuidParam.safeParse(req.params.branchId);
        if (!branch.success) throw new ApiError(400, "INVALID_BRANCH_ID", "Branch ID must be a UUID.");
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        const organizationId = await loadBranchOrganization(client, branch.data);
        await assertScopeAccess(client, principal, "branch", branch.data);
        const { data: schemaRows, error: schemaError } = await client.from("configuration_schemas")
          .select("*").order("key", { ascending: true });
        if (schemaError) throw new ApiError(500, "CONFIGURATION_SCHEMA_READ_FAILED", schemaError.message);
        const schemas = (schemaRows ?? []) as ConfigurationSchema[];
        const keys = [...new Set(schemas.map((schema) => schema.key))];
        const values = await Promise.all(keys.map(async (configurationKey) => {
          const branchSchema = schemas.find((schema) => schema.key === configurationKey && schema.scope_type === "branch") ?? null;
          const organizationSchema = schemas.find((schema) => schema.key === configurationKey && schema.scope_type === "organization") ?? null;
          const branchValue = branchSchema
            ? await findActive(client, branchSchema.id, "branch", branch.data) : null;
          const organizationValue = !branchValue && organizationSchema
            ? await findActive(client, organizationSchema.id, "organization", organizationId) : null;
          const active = branchValue ?? organizationValue;
          const source = branchValue ? "BRANCH_OVERRIDE" : organizationValue ? "ORGANIZATION" : "SCHEMA_DEFAULT";
          const schema = branchValue ? branchSchema! : organizationValue ? organizationSchema! : branchSchema ?? organizationSchema!;
          return {
            key: schema.key, label: schema.label, category: schema.key.split(/[._-]/)[0] || "general",
            dataType: schema.data_type, required: schema.is_required, source,
            value: maskValue(schema, active?.value ?? schema.default_value, principal),
            masked: schema.data_type === "secret_ref", active: Boolean(active),
            versionId: active?.id ?? null, activatedAt: active?.activated_at ?? null,
            lastChangedAt: active?.activated_at ?? active?.created_at ?? null,
          };
        }));
        return res.json({ ok: true, data: { branchId: branch.data, organizationId, values } });
      } catch (error) { return next(error); }
    });

  router.get("/branches/:branchId/configuration/history", requireAuthenticatedUser,
    requirePermission("admin.access"), async (req, res, next) => {
      try {
        const branch = uuidParam.safeParse(req.params.branchId);
        const parsed = historyQuery.safeParse(req.query);
        if (!branch.success) throw new ApiError(400, "INVALID_BRANCH_ID", "Branch ID must be a UUID.");
        if (!parsed.success) throw new ApiError(400, "VALIDATION_ERROR", "Query validation failed.", parsed.error.flatten());
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        const organizationId = await loadBranchOrganization(client, branch.data);
        await assertScopeAccess(client, principal, "branch", branch.data);
        const { data: schemaRows, error: schemaError } = await client.from("configuration_schemas").select("id,key,label,data_type");
        if (schemaError) throw new ApiError(500, "CONFIGURATION_SCHEMA_READ_FAILED", schemaError.message);
        const schemaById = new Map((schemaRows ?? []).map((row) => [row.id, row as ConfigurationSchema]));
        const canReadOrganizationHistory = principal.isSuperAdmin ||
          (principal.ownedOrganizationIds ?? []).includes(organizationId);
        let query = client.from("configuration_change_log").select("*", { count: "exact" })
          .in("scope_id", canReadOrganizationHistory ? [branch.data, organizationId] : [branch.data])
          .order("changed_at", { ascending: false })
          .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);
        if (parsed.data.key) query = query.eq("configuration_key", parsed.data.key);
        if (parsed.data.action) query = query.eq("change_type", parsed.data.action);
        const { data, error, count } = await query;
        if (error) throw new ApiError(500, "CONFIGURATION_HISTORY_READ_FAILED", error.message);
        const entries = (data ?? []).map((row) => {
          const schema = schemaById.get(row.schema_id);
          const secret = schema?.data_type === "secret_ref";
          return {
            id: row.id, timestamp: row.changed_at, actorId: row.changed_by,
            action: row.change_type, organizationId, branchId: row.scope_type === "branch" ? row.scope_id : null,
            scopeType: row.scope_type, configurationKey: row.configuration_key ?? schema?.key ?? null,
            label: schema?.label ?? row.configuration_key ?? "Configuration change",
            previousStateMetadata: secret ? { redacted: true } : row.previous_value_metadata,
            newStateMetadata: secret ? { redacted: true } : row.new_value_metadata,
            fromVersionId: row.from_version_id, toVersionId: row.to_version_id,
            reason: row.reason, correlationId: row.correlation_id,
          };
        });
        return res.json({ ok: true, data: { entries, pagination: { limit: parsed.data.limit,
          offset: parsed.data.offset, total: count ?? entries.length, returned: entries.length } } });
      } catch (error) { return next(error); }
    });

  router.get("/branches/:branchId/configuration/:key/effective", requireAuthenticatedUser,
    requirePermission("admin.access"), async (req, res, next) => {
      try {
        const branch = uuidParam.safeParse(req.params.branchId);
        const key = keyParam.safeParse(req.params.key);
        if (!branch.success) throw new ApiError(400, "INVALID_BRANCH_ID", "Branch ID must be a UUID.");
        if (!key.success) throw new ApiError(400, "INVALID_CONFIGURATION_KEY", "Configuration key is invalid.");
        const principal = (req as AuthorizedRequest).principal!;
        const client = serviceClient();
        const organizationId = await loadBranchOrganization(client, branch.data);
        await assertScopeAccess(client, principal, "branch", branch.data);
        const branchSchema = await findSchema(client, "branch", key.data);
        const organizationSchema = await findSchema(client, "organization", key.data);
        if (!branchSchema && !organizationSchema) throw new ApiError(404, "SCHEMA_NOT_FOUND", "Configuration key was not found.");
        if (branchSchema) {
          const value = await findActive(client, branchSchema.id, "branch", branch.data);
          if (value) return res.json({ ok: true, data: { key: key.data, source: "branch", value: maskValue(branchSchema, value.value, principal), versionId: value.id } });
        }
        if (organizationSchema) {
          const value = await findActive(client, organizationSchema.id, "organization", organizationId);
          if (value) return res.json({ ok: true, data: { key: key.data, source: "organization", value: maskValue(organizationSchema, value.value, principal), versionId: value.id } });
        }
        const fallback = branchSchema ?? organizationSchema!;
        return res.json({ ok: true, data: { key: key.data, source: "default", value: maskValue(fallback, fallback.default_value, principal), versionId: null } });
      } catch (error) { return next(error); }
    });

  const handleWrite = (scopeType: "organization" | "branch") => async (req: Request, res: import("express").Response, next: import("express").NextFunction) => {
    try {
      const idName = scopeType === "organization" ? "organizationId" : "branchId";
      const id = uuidParam.safeParse(req.params[idName]);
      const key = keyParam.safeParse(req.params.key);
      const body = writeBody.safeParse(req.body);
      if (!id.success) throw new ApiError(400, scopeType === "organization" ? "INVALID_ORGANIZATION_ID" : "INVALID_BRANCH_ID", `${idName} must be a UUID.`);
      if (!key.success) throw new ApiError(400, "INVALID_CONFIGURATION_KEY", "Configuration key is invalid.");
      if (!body.success) throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", body.error.flatten());
      const principal = (req as AuthorizedRequest).principal!;
      const client = serviceClient();
      if (scopeType === "organization") await assertOrganization(client, id.data);
      else {
        const organizationId = await loadBranchOrganization(client, id.data);
        if (!principal.isSuperAdmin && !principal.branchIds.includes(id.data)) throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
        if (!organizationId) throw new ApiError(403, "ORGANIZATION_ACCESS_DENIED", "Branch has no organization ownership.");
      }
      const schema = await findSchema(client, scopeType, key.data);
      if (!schema) throw new ApiError(404, "SCHEMA_NOT_FOUND", "Configuration key was not found for this scope.");
      const value = validateValue(schema, body.data.value);
      const context = requestContext(req);
      const result = await persist(client, { schema, scopeType, scopeId: id.data, value, actor: principal,
        reason: body.data.reason, idempotencyKey: body.data.idempotencyKey, ...context });
      const status = result.outcome === "create" ? 201 : 200;
      return res.status(status).json({ ok: true, data: { scopeType, scopeId: id.data, key: schema.key,
        value: maskValue(schema, result.persisted_value, principal), versionId: result.version_id,
        changeId: result.change_id, outcome: result.outcome, persistedAt: result.persisted_at } });
    } catch (error) { return next(error); }
  };

  router.put("/organizations/:organizationId/configuration/:key", requireAuthenticatedUser,
    requireSuperAdmin, handleWrite("organization"));
  router.put("/branches/:branchId/configuration/:key", requireAuthenticatedUser,
    requireSuperAdmin, handleWrite("branch"));

  return router;
}

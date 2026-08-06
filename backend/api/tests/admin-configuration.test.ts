import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { ApiError } from "../src/common/http.js";
import { createAdminConfigurationRouter } from "../src/modules/admin/configuration.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000099";
const BRANCH_ID = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";
const FOREIGN_BRANCH_ID = "00000000-0000-4000-8000-000000000099";

const schemas = [
  { id: "10000000-0000-4000-8000-000000000001", scope_type: "organization", key: "delivery_radius", label: "Delivery radius", data_type: "number", default_value: 5, validation_rules: { min: 0, max: 500 }, is_required: true },
  { id: "10000000-0000-4000-8000-000000000002", scope_type: "branch", key: "delivery_radius", label: "Delivery radius", data_type: "number", default_value: 5, validation_rules: { min: 0, max: 500 }, is_required: true },
  { id: "10000000-0000-4000-8000-000000000003", scope_type: "organization", key: "provider_key", label: "Provider key", data_type: "secret_ref", default_value: "DEFAULT_PROVIDER_KEY", validation_rules: null, is_required: true },
  { id: "10000000-0000-4000-8000-000000000004", scope_type: "branch", key: "provider_key", label: "Provider key", data_type: "secret_ref", default_value: "DEFAULT_PROVIDER_KEY", validation_rules: null, is_required: true },
];

type Version = { id: string; schema_id: string; scope_type: "organization" | "branch"; scope_id: string; status: string; value: unknown; activated_at: string | null; created_at: string; created_by?: string | null; approved_by?: string | null };
type Change = { id: string; scope_type: string; scope_id: string; configuration_key: string; idempotency_key: string | null; to_version_id: string; value: unknown };
type Pointer = { schema_id: string; scope_type: string; scope_id: string; version_id: string; revision: number; activated_by: string | null; activated_at: string };

class FakeQuery {
  private filters: Array<[string, unknown]> = [];
  constructor(private table: string, private db: FakeDatabase) {}
  select() { return this; }
  eq(key: string, value: unknown) { this.filters.push([key, value]); return this; }
  order() { return this; }
  private rows() {
    const source = this.table === "configuration_schemas" ? schemas
      : this.table === "configuration_versions" ? this.db.versions
      : this.table === "configuration_active_versions" ? this.db.activePointers
      : this.table === "branches" ? [{ id: BRANCH_ID, organization_id: ORGANIZATION_ID }, { id: FOREIGN_BRANCH_ID, organization_id: FOREIGN_ORGANIZATION_ID }]
      : this.table === "organization_settings" ? [{ organization_id: ORGANIZATION_ID }]
      : [];
    return source.filter((row) => this.filters.every(([key, value]) => (row as Record<string, unknown>)[key] === value));
  }
  async maybeSingle() { const rows = this.rows(); return { data: rows[0] ?? null, error: rows.length > 1 ? { message: "multiple rows" } : null }; }
  async limit(count: number) { return { data: this.rows().slice(0, count), error: null }; }
  then(resolve: (value: { data: unknown[]; error: null }) => unknown) { return Promise.resolve(resolve({ data: this.rows(), error: null })); }
}

class FakeDatabase {
  versions: Version[] = [];
  changes: Change[] = [];
  activePointers: Pointer[] = [];
  from = (table: string) => new FakeQuery(table, this);
  rpc = async (name: string, args: Record<string, unknown>) => {
    if (name === "create_configuration_version") return this.createVersion(args);
    if (name === "activate_configuration_version") return this.activate(args);
    if (name === "rollback_configuration_version") return this.rollback(args);
    const schema = schemas.find((row) => row.id === args.p_schema_id)!;
    const replay = typeof args.p_idempotency_key === "string"
      ? this.changes.find((row) => row.scope_type === args.p_scope_type && row.scope_id === args.p_scope_id && row.configuration_key === schema.key && row.idempotency_key === args.p_idempotency_key)
      : undefined;
    if (replay) {
      const version = this.versions.find((row) => row.id === replay.to_version_id)!;
      return { data: [{ version_id: version.id, change_id: replay.id, outcome: "replayed", persisted_value: version.value, persisted_at: version.created_at }], error: null };
    }
    const pointer = this.activePointers.find((row) => row.schema_id === args.p_schema_id && row.scope_id === args.p_scope_id);
    const active = this.versions.find((row) => row.id === pointer?.version_id);
    if (active && JSON.stringify(active.value) === JSON.stringify(args.p_value)) {
      return { data: [{ version_id: active.id, change_id: null, outcome: "unchanged", persisted_value: active.value, persisted_at: active.created_at }], error: null };
    }
    const now = "2026-08-06T12:00:00.000Z";
    const version: Version = { id: this.nextVersionId(), schema_id: String(args.p_schema_id), scope_type: args.p_scope_type as "organization" | "branch", scope_id: String(args.p_scope_id), status: "active", value: args.p_value, activated_at: now, created_at: now };
    this.versions.push(version);
    if (pointer) { pointer.version_id = version.id; pointer.revision += 1; }
    else this.activePointers.push({ schema_id: version.schema_id, scope_type: version.scope_type, scope_id: version.scope_id, version_id: version.id, revision: 1, activated_by: String(args.p_actor), activated_at: now });
    const change: Change = { id: `30000000-0000-4000-8000-${String(this.changes.length + 1).padStart(12, "0")}`, scope_type: version.scope_type, scope_id: version.scope_id, configuration_key: schema.key, idempotency_key: args.p_idempotency_key as string | null, to_version_id: version.id, value: schema.data_type === "secret_ref" ? "<not-logged>" : args.p_value };
    this.changes.push(change);
    return { data: [{ version_id: version.id, change_id: change.id, outcome: active ? "update" : "create", persisted_value: version.value, persisted_at: now }], error: null };
  };

  private nextVersionId() { return `20000000-0000-4000-8000-${String(this.versions.length + 1).padStart(12, "0")}`; }
  private schemaForVersion(version: Version) { return schemas.find((row) => row.id === version.schema_id)!; }
  private addChange(version: Version, args: Record<string, unknown>) {
    const change: Change = { id: `30000000-0000-4000-8000-${String(this.changes.length + 1).padStart(12, "0")}`,
      scope_type: version.scope_type, scope_id: version.scope_id, configuration_key: this.schemaForVersion(version).key,
      idempotency_key: args.p_idempotency_key as string | null, to_version_id: version.id, value: "<not-logged>" };
    this.changes.push(change); return change;
  }
  private async createVersion(args: Record<string, unknown>) {
    const replay = this.changes.find((row) => row.idempotency_key && row.idempotency_key === args.p_idempotency_key);
    if (replay) return { data: [{ version_id: replay.to_version_id, outcome: "replayed", created_at: "2026-08-06T12:00:00.000Z" }], error: null };
    const version: Version = { id: this.nextVersionId(), schema_id: String(args.p_schema_id), scope_type: args.p_scope_type as "organization" | "branch",
      scope_id: String(args.p_scope_id), value: args.p_value, status: "draft", created_by: String(args.p_actor), approved_by: null,
      activated_at: null, created_at: "2026-08-06T12:00:00.000Z" };
    this.versions.push(version); this.addChange(version, args);
    return { data: [{ version_id: version.id, outcome: "created", created_at: version.created_at }], error: null };
  }
  private async activate(args: Record<string, unknown>) {
    const target = this.versions.find((row) => row.id === args.p_version_id);
    if (!target) return { data: null, error: { code: "P0002", message: "not found" } };
    let pointer = this.activePointers.find((row) => row.schema_id === target.schema_id && row.scope_id === target.scope_id);
    if (args.p_expected_revision !== null && Number(args.p_expected_revision) !== (pointer?.revision ?? 0)) return { data: null, error: { code: "40001", message: "stale" } };
    if (pointer?.version_id === target.id) return { data: [{ version_id: target.id, previous_version_id: target.id, outcome: "unchanged", revision: pointer.revision, activated_at: pointer.activated_at }], error: null };
    const previous = pointer?.version_id ?? null; const now = "2026-08-06T12:01:00.000Z";
    if (pointer) { pointer.version_id = target.id; pointer.revision += 1; pointer.activated_at = now; }
    else { pointer = { schema_id: target.schema_id, scope_type: target.scope_type, scope_id: target.scope_id, version_id: target.id, revision: 1, activated_by: String(args.p_actor), activated_at: now }; this.activePointers.push(pointer); }
    this.addChange(target, args);
    return { data: [{ version_id: target.id, previous_version_id: previous, outcome: "activated", revision: pointer.revision, activated_at: now }], error: null };
  }
  private async rollback(args: Record<string, unknown>) {
    const target = this.versions.find((row) => row.id === args.p_target_version_id);
    if (!target) return { data: null, error: { code: "P0002", message: "not found" } };
    const pointer = this.activePointers.find((row) => row.schema_id === target.schema_id && row.scope_id === target.scope_id);
    if (!pointer) return { data: null, error: { code: "55000", message: "no active version" } };
    if (pointer.version_id === target.id) return { data: null, error: { code: "22023", message: "already active" } };
    if (args.p_expected_revision !== null && Number(args.p_expected_revision) !== pointer.revision) return { data: null, error: { code: "40001", message: "stale" } };
    const previous = pointer.version_id; const now = "2026-08-06T12:02:00.000Z";
    const copy: Version = { ...target, id: this.nextVersionId(), status: "rolled_back", created_by: String(args.p_actor), approved_by: String(args.p_actor), activated_at: now, created_at: now };
    this.versions.push(copy); pointer.version_id = copy.id; pointer.revision += 1; pointer.activated_at = now; this.addChange(copy, args);
    return { data: [{ version_id: copy.id, source_version_id: target.id, previous_version_id: previous, outcome: "rolled_back", revision: pointer.revision, activated_at: now }], error: null };
  }
}

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return { authUserId: "auth-founder", userId: "00000000-0000-4000-8000-000000000010", email: "founder@example.com", userType: "staff", status: "active", roles: ["super-admin"], permissions: ["admin.access", "branch.manage"], branchIds: [], isSuperAdmin: true, ...overrides };
}

function authRepo(user: AuthPrincipal): AuthPrincipalRepository {
  return { async resolvePrincipal() { return user; }, async getMe() { throw new Error("unused"); } };
}
function verifier(): AuthTokenVerifier {
  return { async getUser() { return { user: { id: "auth-founder", email: "founder@example.com" } } as never; } };
}

let db: FakeDatabase;
function createApp(user: AuthPrincipal) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", createAdminConfigurationRouter({ authTokenVerifier: verifier(), authProfileRepository: authRepo(user), envStatus: { isReady: true, issues: [], config: {} } as never, clientFactory: () => db as never }));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ApiError) return res.status(error.statusCode).json({ ok: false, error: { code: error.code, message: error.message } });
    return res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  });
  return app;
}

const bearer = { Authorization: "Bearer token" };
beforeEach(() => { db = new FakeDatabase(); });

describe("PHASE2-02 configuration persistence", () => {
  it("returns 401 unauthenticated and 403 without configuration permission", async () => {
    expect((await request(createApp(principal())).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).send({ value: 8 })).status).toBe(401);
    const denied = createApp(principal({ isSuperAdmin: false, permissions: ["order.manage"], roles: ["cashier"], branchIds: [BRANCH_ID] }));
    expect((await request(denied).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 8 })).status).toBe(403);
  });

  it("creates and updates an organization value with immutable version references", async () => {
    const app = createApp(principal());
    const create = await request(app).put(`/api/v1/admin/organizations/${ORGANIZATION_ID}/configuration/delivery_radius`).set(bearer).send({ value: 7, reason: "baseline" });
    const update = await request(app).put(`/api/v1/admin/organizations/${ORGANIZATION_ID}/configuration/delivery_radius`).set(bearer).send({ value: 9, reason: "approved correction" });
    expect([create.status, create.body.data.outcome, update.status, update.body.data.outcome]).toEqual([201, "create", 200, "update"]);
    expect(db.activePointers).toHaveLength(1);
    expect(db.activePointers[0]?.version_id).toBe(db.versions[1]?.id);
    expect(db.changes).toHaveLength(2);
  });

  it("creates and updates a branch override", async () => {
    const app = createApp(principal());
    expect((await request(app).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 10 })).status).toBe(201);
    const update = await request(app).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 11 });
    expect(update.body.data.outcome).toBe("update");
  });

  it("resolves branch, organization, then schema-default precedence", async () => {
    const app = createApp(principal());
    await request(app).put(`/api/v1/admin/organizations/${ORGANIZATION_ID}/configuration/delivery_radius`).set(bearer).send({ value: 7 });
    expect((await request(app).get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`).set(bearer)).body.data).toMatchObject({ source: "organization", value: 7 });
    await request(app).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 10 });
    expect((await request(app).get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`).set(bearer)).body.data).toMatchObject({ source: "branch", value: 10 });
    db = new FakeDatabase();
    expect((await request(createApp(principal())).get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`).set(bearer)).body.data).toMatchObject({ source: "default", value: 5 });
  });

  it("rejects unknown keys, malformed UUIDs, invalid types, and failed constraints", async () => {
    const app = createApp(principal());
    expect((await request(app).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/unknown`).set(bearer).send({ value: 1 })).status).toBe(404);
    expect((await request(app).put("/api/v1/admin/branches/not-a-uuid/configuration/delivery_radius").set(bearer).send({ value: 1 })).status).toBe(400);
    expect((await request(app).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: "ten" })).body.error.code).toBe("INVALID_CONFIGURATION_VALUE");
    expect((await request(app).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 501 })).status).toBe(400);
  });

  it("rejects foreign branches, foreign organizations, and non-super-admin organization writes", async () => {
    const manager = createApp(principal({ isSuperAdmin: false, roles: ["branch-manager"], permissions: ["branch.manage"], branchIds: [BRANCH_ID] }));
    expect((await request(manager).put(`/api/v1/admin/branches/${FOREIGN_BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 8 })).status).toBe(403);
    expect((await request(manager).put(`/api/v1/admin/organizations/${ORGANIZATION_ID}/configuration/delivery_radius`).set(bearer).send({ value: 8 })).status).toBe(403);
    expect((await request(createApp(principal())).put(`/api/v1/admin/organizations/${FOREIGN_ORGANIZATION_ID}/configuration/delivery_radius`).set(bearer).send({ value: 8 })).status).toBe(403);
  });

  it("never stores a raw secret and masks secret references from unauthorized readers", async () => {
    const owner = createApp(principal());
    const raw = await request(owner).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/provider_key`).set(bearer).send({ value: "raw-provider-credential" });
    expect(raw.status).toBe(400);
    await request(owner).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/provider_key`).set(bearer).send({ value: "WHATSAPP_API_KEY" });
    const manager = createApp(principal({ isSuperAdmin: false, roles: ["branch-manager"], permissions: ["admin.access"], branchIds: [BRANCH_ID] }));
    const read = await request(manager).get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/provider_key/effective`).set(bearer);
    expect(read.body.data.value).toBe("<REDACTED>");
    expect(JSON.stringify(db.changes)).not.toContain("WHATSAPP_API_KEY");
  });

  it("makes same-value and idempotency-key retries safe", async () => {
    const app = createApp(principal());
    const url = `/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`;
    await request(app).put(url).set(bearer).send({ value: 12, idempotencyKey: "request-1" });
    const replay = await request(app).put(url).set(bearer).send({ value: 99, idempotencyKey: "request-1" });
    const unchanged = await request(app).put(url).set(bearer).send({ value: 12 });
    expect(replay.body.data).toMatchObject({ outcome: "replayed", value: 12 });
    expect(unchanged.body.data.outcome).toBe("unchanged");
    expect(db.changes).toHaveLength(1);
  });
});

describe("PHASE2-03 configuration versioning, activation and rollback", () => {
  const versionsUrl = "/api/v1/admin/configuration/versions";
  const branchDraft = { scopeType: "branch", scopeId: BRANCH_ID, key: "delivery_radius", value: 14 };

  it("creates immutable drafts and lists/reads them with active state", async () => {
    const app = createApp(principal());
    const created = await request(app).post(versionsUrl).set(bearer).send({ ...branchDraft, idempotencyKey: "draft-1" });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: "draft", isActive: false, activeRevision: 0, outcome: "created" });
    const replay = await request(app).post(versionsUrl).set(bearer).send({ ...branchDraft, value: 99, idempotencyKey: "draft-1" });
    expect(replay.body.data).toMatchObject({ id: created.body.data.id, outcome: "replayed" });
    const listed = await request(app).get(`${versionsUrl}?scopeType=branch&scopeId=${BRANCH_ID}&key=delivery_radius`).set(bearer);
    expect(listed.body.data).toHaveLength(1);
    const detail = await request(app).get(`${versionsUrl}/${created.body.data.id}`).set(bearer);
    expect(detail.body.data.value).toBe(14);
  });

  it("denies branch managers the legacy direct-active write path", async () => {
    const manager = createApp(principal({ isSuperAdmin: false, roles: ["branch-manager"], permissions: ["branch.manage"], branchIds: [BRANCH_ID] }));
    expect((await request(manager).put(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius`).set(bearer).send({ value: 10 })).status).toBe(403);
  });

  it("allows only super-admin activation and switches the effective value", async () => {
    const owner = createApp(principal());
    const draft = await request(owner).post(versionsUrl).set(bearer).send(branchDraft);
    const manager = createApp(principal({ isSuperAdmin: false, roles: ["branch-manager"], permissions: ["admin.access", "branch.manage"], branchIds: [BRANCH_ID] }));
    expect((await request(manager).post(`${versionsUrl}/${draft.body.data.id}/activate`).set(bearer).send({ expectedRevision: 0 })).status).toBe(403);
    const activated = await request(owner).post(`${versionsUrl}/${draft.body.data.id}/activate`).set(bearer).send({ expectedRevision: 0, reason: "approved" });
    expect(activated.body.data).toMatchObject({ outcome: "activated", isActive: true, revision: 1 });
    const effective = await request(owner).get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`).set(bearer);
    expect(effective.body.data).toMatchObject({ source: "branch", value: 14, versionId: draft.body.data.id });
  });

  it("makes duplicate activation safe and rejects stale activation", async () => {
    const app = createApp(principal());
    const first = await request(app).post(versionsUrl).set(bearer).send(branchDraft);
    await request(app).post(`${versionsUrl}/${first.body.data.id}/activate`).set(bearer).send({ expectedRevision: 0 });
    const duplicate = await request(app).post(`${versionsUrl}/${first.body.data.id}/activate`).set(bearer).send({ expectedRevision: 1 });
    expect(duplicate.body.data).toMatchObject({ outcome: "unchanged", revision: 1 });
    const second = await request(app).post(versionsUrl).set(bearer).send({ ...branchDraft, value: 18 });
    const stale = await request(app).post(`${versionsUrl}/${second.body.data.id}/activate`).set(bearer).send({ expectedRevision: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_CONFIGURATION_REVISION");
  });

  it("rolls back by creating a new active copy and appends rollback audit", async () => {
    const app = createApp(principal());
    const first = await request(app).post(versionsUrl).set(bearer).send(branchDraft);
    await request(app).post(`${versionsUrl}/${first.body.data.id}/activate`).set(bearer).send({ expectedRevision: 0 });
    const second = await request(app).post(versionsUrl).set(bearer).send({ ...branchDraft, value: 21 });
    await request(app).post(`${versionsUrl}/${second.body.data.id}/activate`).set(bearer).send({ expectedRevision: 1 });
    const rollback = await request(app).post(`${versionsUrl}/${first.body.data.id}/rollback`).set(bearer).send({ expectedRevision: 2, reason: "restore prior state" });
    expect(rollback.body.data).toMatchObject({ outcome: "rolled_back", sourceVersionId: first.body.data.id, value: 14, isActive: true, revision: 3 });
    expect(rollback.body.data.id).not.toBe(first.body.data.id);
    expect(db.versions.find((row) => row.id === first.body.data.id)?.value).toBe(14);
    expect(db.changes).toHaveLength(5);
  });

  it("enforces scope isolation, deterministic IDs and unknown-version errors", async () => {
    const manager = createApp(principal({ isSuperAdmin: false, roles: ["branch-manager"], permissions: ["admin.access", "branch.manage"], branchIds: [BRANCH_ID] }));
    expect((await request(manager).post(versionsUrl).set(bearer).send({ ...branchDraft, scopeId: FOREIGN_BRANCH_ID })).status).toBe(403);
    expect((await request(manager).get(`${versionsUrl}?scopeType=branch&scopeId=${FOREIGN_BRANCH_ID}`).set(bearer)).status).toBe(403);
    expect((await request(manager).get(`${versionsUrl}/not-a-uuid`).set(bearer)).body.error.code).toBe("INVALID_VERSION_ID");
    expect((await request(createApp(principal())).get(`${versionsUrl}/00000000-0000-4000-8000-000000000088`).set(bearer)).status).toBe(404);
  });

  it("never exposes secret references to non-super-admin readers", async () => {
    const owner = createApp(principal());
    const secret = await request(owner).post(versionsUrl).set(bearer).send({ scopeType: "branch", scopeId: BRANCH_ID, key: "provider_key", value: "WHATSAPP_API_KEY" });
    const manager = createApp(principal({ isSuperAdmin: false, roles: ["branch-manager"], permissions: ["admin.access"], branchIds: [BRANCH_ID] }));
    const detail = await request(manager).get(`${versionsUrl}/${secret.body.data.id}`).set(bearer);
    expect(detail.body.data.value).toBe("<REDACTED>");
    expect(JSON.stringify(db.changes)).not.toContain("WHATSAPP_API_KEY");
  });
});

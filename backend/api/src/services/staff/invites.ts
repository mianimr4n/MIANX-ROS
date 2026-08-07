import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import { createStaffInviteDelivery, type StaffInviteDelivery } from "./invite-delivery.js";

export type StaffInviteStatus = "draft" | "pending" | "accepted" | "revoked" | "expired";
export type CanonicalInviteRole =
  | "organization_owner" | "finance" | "hr" | "auditor"
  | "branch_manager" | "kitchen_manager" | "cashier" | "rider" | "support";

export interface StaffInviteRecord {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleId: string;
  roleCode: string;
  organizationId: string;
  branchIds: string[];
  /** Legacy compatibility alias; new code must use branchIds. */
  branchId: string | null;
  status: StaffInviteStatus;
  deliveryStatus: "not_requested" | "queued" | "sent" | "failed";
  expiresAt: string | null;
  invitedBy: string | null;
  acceptedUserId: string | null;
  acceptedRoleAssignmentId?: string | null;
  sendCount: number;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInvitePreview {
  email: string;
  fullName: string;
  roleCode: string;
  organizationId: string;
  branchIds: string[];
  branchNames: string[];
  branchId: string | null;
  branchName: string | null;
  status: StaffInviteStatus;
  expiresAt: string | null;
}

export interface CreateStaffInviteInput {
  email: string;
  fullName: string;
  phone?: string | null;
  roleCode: string;
  organizationId: string;
  branchIds?: string[];
  /** Legacy input accepted temporarily and normalized into branchIds. */
  branchId?: string;
  sendNow?: boolean;
  expiresInHours?: number;
  correlationId?: string;
}

export interface AcceptStaffInviteInput { token: string; password: string; fullName?: string }
export interface InviteAuditContext { ip?: string | null; userAgent?: string | null }

export interface StaffAssignmentUpdateInput {
  roleCode: string;
  branchIds: string[];
}

export interface StaffInviteRepository {
  bootstrapOwner(input: Omit<CreateStaffInviteInput, "roleCode" | "branchIds" | "branchId">, actor: AuthPrincipal, inviteAppOrigin: string, audit?: InviteAuditContext): Promise<{ invite: StaffInviteRecord }>;
  createInvite(input: CreateStaffInviteInput, actor: AuthPrincipal, inviteAppOrigin: string, audit?: InviteAuditContext): Promise<{ invite: StaffInviteRecord }>;
  listInvites(actor: AuthPrincipal, filters?: { status?: StaffInviteStatus; organizationId?: string }): Promise<StaffInviteRecord[]>;
  getInvite(id: string, actor?: AuthPrincipal): Promise<StaffInviteRecord | null>;
  sendInvite(id: string, actor: AuthPrincipal, inviteAppOrigin: string, audit?: InviteAuditContext): Promise<{ invite: StaffInviteRecord }>;
  resendInvite(id: string, actor: AuthPrincipal, inviteAppOrigin: string, audit?: InviteAuditContext): Promise<{ invite: StaffInviteRecord }>;
  revokeInvite(id: string, actor: AuthPrincipal, audit?: InviteAuditContext): Promise<StaffInviteRecord>;
  updateAcceptedStaff(userRoleId: string, input: StaffAssignmentUpdateInput, actor: AuthPrincipal, audit?: InviteAuditContext): Promise<{ userRoleId: string; roleCode: string; branchIds: string[] }>;
  previewInvite(token: string): Promise<StaffInvitePreview>;
  acceptInvite(input: AcceptStaffInviteInput, audit?: InviteAuditContext): Promise<{ authUserId: string; email: string; profileReady: boolean }>;
}

const DEFAULT_EXPIRY_HOURS = 72;
const MIN_EXPIRY_HOURS = 1;
const MAX_EXPIRY_HOURS = 168;
const MAX_SENDS_PER_24H = 3;
const CANONICAL_ROLES = new Set<string>(["organization_owner", "finance", "hr", "auditor", "branch_manager", "kitchen_manager", "cashier", "rider", "support"]);
const BRANCH_ROLES = new Set<string>(["branch_manager", "kitchen_manager", "cashier", "rider", "support"]);
const OWNER_GRANTABLE = new Set<string>(["finance", "hr", "auditor", "branch_manager", "kitchen_manager", "cashier", "rider", "support"]);
const MANAGER_GRANTABLE = new Set<string>(["kitchen_manager", "cashier", "rider", "support"]);

export function isInviteableRoleCode(roleCode: string): boolean { return CANONICAL_ROLES.has(roleCode); }
export function normalizeInviteEmail(email: string): string { return email.trim().toLowerCase(); }
export function hashInviteToken(rawToken: string): string { return createHash("sha256").update(rawToken, "utf8").digest("hex"); }
export function generateInviteToken() { const rawToken = randomBytes(32).toString("base64url"); return { rawToken, tokenHash: hashInviteToken(rawToken) }; }
export function resolveExpiryHours(value: number | undefined): number {
  const hours = value ?? DEFAULT_EXPIRY_HOURS;
  if (!Number.isFinite(hours) || hours < MIN_EXPIRY_HOURS || hours > MAX_EXPIRY_HOURS) throw new ApiError(422, "VALIDATION_ERROR", `expiresInHours must be between ${MIN_EXPIRY_HOURS} and ${MAX_EXPIRY_HOURS}.`);
  return hours;
}
export function buildInviteUrl(appOrigin: string, rawToken: string): string { return `${appOrigin.replace(/\/$/, "")}/staff/accept?token=${encodeURIComponent(rawToken)}`; }
export function sanitizeIp(ip: string | null | undefined): string | null { if (!ip) return null; const value = ip.trim().slice(0, 64); return !value || /[\x00-\x1f]/.test(value) ? null : value; }
export function sanitizeUserAgent(value: string | null | undefined): string | null { if (!value) return null; return value.replace(/[\x00-\x1f]/g, " ").trim().slice(0, 300) || null; }

type InviteRow = {
  id: string; email: string; full_name: string; phone: string | null; role_id: string;
  branch_id: string | null; organization_id: string | null; status: StaffInviteStatus;
  delivery_status: StaffInviteRecord["deliveryStatus"]; token_hash: string | null;
  token_expires_at: string | null; invited_by: string | null; accepted_user_id: string | null;
  send_count: number; correlation_id: string | null; created_at: string; updated_at: string;
  roles?: { code: string } | Array<{ code: string }> | null;
  staff_invite_branches?: Array<{ branch_id: string }> | null;
};

const INVITE_SELECT = "id,email,full_name,phone,role_id,branch_id,organization_id,status,delivery_status,token_hash,token_expires_at,invited_by,accepted_user_id,send_count,correlation_id,created_at,updated_at,roles:role_id(code),staff_invite_branches(branch_id)";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
function roleCode(row: InviteRow) { return Array.isArray(row.roles) ? row.roles[0]?.code ?? "" : row.roles?.code ?? ""; }
function mapInvite(row: InviteRow): StaffInviteRecord {
  if (!row.organization_id) throw new ApiError(500, "IDENTITY_SCOPE_INVALID", "Invite is missing organization scope.");
  const branchIds = [...new Set([...(row.staff_invite_branches ?? []).map((x) => x.branch_id), ...(row.branch_id ? [row.branch_id] : [])])].sort();
  return { id: row.id, email: row.email, fullName: row.full_name, phone: row.phone, roleId: row.role_id, roleCode: roleCode(row), organizationId: row.organization_id, branchIds, branchId: branchIds[0] ?? null, status: row.status, deliveryStatus: row.delivery_status, expiresAt: row.token_expires_at, invitedBy: row.invited_by, acceptedUserId: row.accepted_user_id, sendCount: row.send_count, correlationId: row.correlation_id ?? row.id, createdAt: row.created_at, updatedAt: row.updated_at };
}
function rethrowSafe(error: unknown, message = "Unable to process staff invite."): never { if (error instanceof ApiError) throw error; throw new ApiError(503, "SERVICE_UNAVAILABLE", message); }
function genericNotAcceptable(): never { throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted."); }
function tokensEqual(a: string, b: string) { const l = Buffer.from(a); const r = Buffer.from(b); return l.length === r.length && timingSafeEqual(l, r); }
function isPlatform(actor: AuthPrincipal) { return actor.isPlatformSuperAdmin === true || actor.isSuperAdmin || actor.roles.includes("platform_super_admin") || actor.roles.includes("super-admin"); }
function ownedOrganizations(actor: AuthPrincipal) { return new Set(actor.ownedOrganizationIds ?? []); }
function isBranchManager(actor: AuthPrincipal) { return actor.roles.includes("branch_manager") || actor.roles.includes("branch-manager"); }

export function assertPlatformSuperAdmin(actor: AuthPrincipal) {
  if (!isPlatform(actor)) throw new ApiError(403, "FORBIDDEN", "Platform super-admin access is required.");
}
export function assertInvitationAuthority(actor: AuthPrincipal, organizationId: string, targetRole: string, branchIds: string[]) {
  if (isPlatform(actor)) throw new ApiError(403, "FORBIDDEN", "Platform administrators may only bootstrap the first organization owner.");
  if (ownedOrganizations(actor).has(organizationId)) {
    if (!OWNER_GRANTABLE.has(targetRole)) throw new ApiError(403, "ROLE_ESCALATION_DENIED", "This role cannot be granted by an organization owner.");
    return;
  }
  if (isBranchManager(actor) && (actor.organizationIds ?? []).includes(organizationId)) {
    if (!MANAGER_GRANTABLE.has(targetRole) || branchIds.some((id) => !actor.branchIds.includes(id))) throw new ApiError(403, "ROLE_ESCALATION_DENIED", "Branch manager invitation scope exceeds assigned authority.");
    return;
  }
  throw new ApiError(403, "FOREIGN_ORGANIZATION_DENIED", "Organization access denied.");
}
function assertCanSee(actor: AuthPrincipal, organizationId: string) {
  if (isPlatform(actor) || ownedOrganizations(actor).has(organizationId) || ((actor.organizationIds ?? []).includes(organizationId) && isBranchManager(actor))) return;
  throw new ApiError(403, "FOREIGN_ORGANIZATION_DENIED", "Organization access denied.");
}
function assertInviteVisible(actor: AuthPrincipal, invite: StaffInviteRecord) {
  if (isPlatform(actor) || ownedOrganizations(actor).has(invite.organizationId)) return;
  if (isBranchManager(actor) && (actor.organizationIds ?? []).includes(invite.organizationId)
      && MANAGER_GRANTABLE.has(invite.roleCode)
      && invite.branchIds.length > 0
      && invite.branchIds.every((id) => actor.branchIds.includes(id))) return;
  throw new ApiError(403, "FOREIGN_SCOPE_DENIED", "Invitation scope access denied.");
}
async function recordEvent(admin: SupabaseClient, inviteId: string, eventType: string, actorUserId: string | null, payload: Record<string, unknown>, audit?: InviteAuditContext) {
  const forbidden = ["token", "inviteUrl", "password", "tokenHash"];
  if (forbidden.some((key) => key in payload)) throw new ApiError(500, "AUDIT_SECRET_REJECTED", "Secret-bearing audit payload rejected.");
  const { error } = await admin.from("staff_invite_events").insert({ invite_id: inviteId, actor_user_id: actorUserId, event_type: eventType, payload, ip: sanitizeIp(audit?.ip), user_agent: sanitizeUserAgent(audit?.userAgent) });
  if (error) rethrowSafe(error, "Unable to record invitation audit event.");
}
async function resolveRole(admin: SupabaseClient, code: string) {
  if (!CANONICAL_ROLES.has(code)) throw new ApiError(422, "VALIDATION_ERROR", "roleCode is not inviteable.");
  const { data, error } = await admin.from("roles").select("id,code").eq("code", code).maybeSingle();
  if (error || !data) throw new ApiError(422, "VALIDATION_ERROR", "roleCode does not exist.");
  return data as { id: string; code: string };
}
async function assertOrganization(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("organization_settings").select("organization_id").eq("organization_id", id).maybeSingle();
  if (error) rethrowSafe(error); if (!data) throw new ApiError(404, "ORGANIZATION_NOT_FOUND", "Organization not found.");
}
async function assertBranches(admin: SupabaseClient, organizationId: string, ids: string[], role: string) {
  const unique = [...new Set(ids)];
  if (BRANCH_ROLES.has(role) && unique.length === 0) throw new ApiError(422, "BRANCH_SCOPE_REQUIRED", "At least one branch is required for this role.");
  if (!BRANCH_ROLES.has(role) && unique.length > 0) throw new ApiError(422, "BRANCH_SCOPE_NOT_ALLOWED", "This role is organization scoped.");
  if (unique.length === 0) return unique;
  const { data, error } = await admin.from("branches").select("id,organization_id,status").in("id", unique);
  if (error) rethrowSafe(error);
  const valid = (data ?? []) as Array<{ id: string; organization_id: string; status: string }>;
  if (valid.length !== unique.length || valid.some((b) => b.organization_id !== organizationId || b.status !== "operating")) throw new ApiError(403, "FOREIGN_BRANCH_DENIED", "One or more branches are outside the organization or inactive.");
  return unique.sort();
}
async function assertNoConflict(admin: SupabaseClient, organizationId: string, email: string) {
  const normalized = normalizeInviteEmail(email);
  const { data: pending, error } = await admin.from("staff_invites").select("id").eq("organization_id", organizationId).eq("status", "pending").ilike("email", normalized).limit(1);
  if (error) rethrowSafe(error); if ((pending ?? []).length) throw new ApiError(409, "INVITE_CONFLICT", "Unable to create an invitation for this address.");
  const { data: existing } = await admin.from("users").select("id").ilike("email", normalized).limit(1);
  const { data: authExists } = await admin.rpc("auth_user_email_exists", { p_email: normalized });
  if ((existing ?? []).length || authExists === true) throw new ApiError(409, "INVITE_CONFLICT", "Unable to create an invitation for this address.");
}
async function assertSendRateLimit(admin: SupabaseClient, organizationId: string, email: string) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: invites, error } = await admin.from("staff_invites").select("id").eq("organization_id", organizationId).ilike("email", normalizeInviteEmail(email));
  if (error) rethrowSafe(error); const ids = (invites ?? []).map((x: { id: string }) => x.id); if (!ids.length) return;
  const { count, error: eventError } = await admin.from("staff_invite_events").select("id", { count: "exact", head: true }).in("invite_id", ids).in("event_type", ["sent", "resent"]).gte("created_at", since);
  if (eventError) rethrowSafe(eventError); if ((count ?? 0) >= MAX_SENDS_PER_24H) throw new ApiError(429, "RATE_LIMITED", "Invitation delivery limit reached. Try again later.");
}
async function durableAcceptLimit(admin: SupabaseClient, tokenHash: string, ip: string | null | undefined) {
  const ipFingerprint = hashInviteToken(sanitizeIp(ip) ?? "unknown");
  const { data, error } = await admin.rpc("check_staff_invite_attempt", { p_token_fingerprint: hashInviteToken(tokenHash), p_ip_fingerprint: ipFingerprint, p_limit: 10, p_window_minutes: 15 });
  if (error) rethrowSafe(error); const result = Array.isArray(data) ? data[0] : data;
  if (!result?.allowed) throw new ApiError(429, "RATE_LIMITED", `Too many attempts. Retry after ${Number(result?.retry_after_seconds ?? 900)} seconds.`);
}

export function createSupabaseStaffInviteRepository(envStatus: EnvironmentStatus, delivery: StaffInviteDelivery = createStaffInviteDelivery(envStatus)): StaffInviteRepository {
  const admin = () => createServiceClient(envStatus);
  async function getRaw(client: SupabaseClient, id: string) {
    const { data, error } = await client.from("staff_invites").select(INVITE_SELECT).eq("id", id).maybeSingle();
    if (error) rethrowSafe(error);
    if (!data) return null;
    const invite = mapInvite(data as InviteRow);
    if (invite.status === "accepted") {
      const { data: assignment } = await client.from("user_roles").select("id").eq("invitation_id", invite.id).maybeSingle();
      invite.acceptedRoleAssignmentId = (assignment as { id?: string } | null)?.id ?? null;
    }
    return invite;
  }
  async function deliver(client: SupabaseClient, invite: StaffInviteRecord, rawToken: string, origin: string, actor: AuthPrincipal, event: "sent" | "resent", audit?: InviteAuditContext) {
    try {
      const result = await delivery.send({ recipient: invite.email, recipientName: invite.fullName, acceptanceUrl: buildInviteUrl(origin, rawToken), expiresAt: invite.expiresAt! });
      const { data, error } = await client.from("staff_invites").update({ delivery_status: "sent", delivered_at: new Date().toISOString(), delivery_error_code: null }).eq("id", invite.id).select(INVITE_SELECT).single();
      if (error || !data) rethrowSafe(error);
      await recordEvent(client, invite.id, event, actor.userId, { provider: result.provider, providerMessageId: result.messageId, correlationId: invite.correlationId }, audit);
      return mapInvite(data as InviteRow);
    } catch (error) {
      await client.from("staff_invites").update({ delivery_status: "failed", delivery_error_code: "provider_unavailable" }).eq("id", invite.id);
      await recordEvent(client, invite.id, "delivery_failed", actor.userId, { reason: "provider_unavailable", correlationId: invite.correlationId }, audit);
      rethrowSafe(error, "Invitation was recorded but email delivery failed safely.");
    }
  }
  async function create(input: CreateStaffInviteInput, actor: AuthPrincipal, origin: string, audit: InviteAuditContext | undefined, bootstrap: boolean) {
    const client = admin(); const organizationId = input.organizationId; const branchIds = [...(input.branchIds ?? []), ...(input.branchId ? [input.branchId] : [])];
    if (bootstrap) { assertPlatformSuperAdmin(actor); if (input.roleCode !== "organization_owner") throw new ApiError(403, "ROLE_ESCALATION_DENIED", "Bootstrap may create only an organization owner invitation."); }
    else assertInvitationAuthority(actor, organizationId, input.roleCode, branchIds);
    await assertOrganization(client, organizationId);
    if (bootstrap) {
      if (input.correlationId) {
        const { data: prior, error: priorError } = await client.from("staff_invites").select(INVITE_SELECT).eq("organization_id", organizationId).eq("correlation_id", input.correlationId).maybeSingle();
        if (priorError) rethrowSafe(priorError);
        if (prior) return { invite: mapInvite(prior as InviteRow) };
      }
      const { count: ownerCount } = await client.from("user_roles").select("id,roles!inner(code)", { count: "exact", head: true }).eq("organization_id", organizationId).eq("assignment_status", "ACTIVE").eq("roles.code", "organization_owner");
      const { count: inviteCount } = await client.from("staff_invites").select("id,roles!inner(code)", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "pending").eq("roles.code", "organization_owner");
      if ((ownerCount ?? 0) > 0 || (inviteCount ?? 0) > 0) throw new ApiError(409, "OWNER_BOOTSTRAP_ALREADY_EXISTS", "Organization owner bootstrap is already complete or pending.");
    }
    const email = normalizeInviteEmail(input.email); await assertNoConflict(client, organizationId, email); await assertSendRateLimit(client, organizationId, email);
    const role = await resolveRole(client, input.roleCode); const checkedBranches = await assertBranches(client, organizationId, branchIds, role.code);
    const expiryHours = resolveExpiryHours(input.expiresInHours); const generated = generateInviteToken(); const now = new Date().toISOString(); const expiresAt = new Date(Date.now() + expiryHours * 3_600_000).toISOString(); const correlationId = input.correlationId ?? randomUUID();
    const { data, error } = await client.from("staff_invites").insert({ email, full_name: input.fullName.trim(), phone: input.phone ?? null, role_id: role.id, branch_id: null, organization_id: organizationId, is_owner_bootstrap: bootstrap, status: "pending", delivery_status: "queued", token_hash: generated.tokenHash, token_expires_at: expiresAt, sent_at: now, last_sent_at: now, invited_by: actor.userId, send_count: 1, correlation_id: correlationId }).select(INVITE_SELECT).single();
    if (error || !data) {
      if (bootstrap && error?.code === "23505") throw new ApiError(409, "OWNER_BOOTSTRAP_ALREADY_EXISTS", "Organization owner bootstrap is already complete or pending.");
      rethrowSafe(error);
    }
    const created = mapInvite(data as InviteRow);
    if (checkedBranches.length) {
      const { error: linkError } = await client.from("staff_invite_branches").insert(checkedBranches.map((branchId) => ({ invite_id: created.id, branch_id: branchId })));
      if (linkError) { await client.from("staff_invites").delete().eq("id", created.id); rethrowSafe(linkError); }
    }
    await recordEvent(client, created.id, bootstrap ? "owner_bootstrap_created" : "created", actor.userId, { roleCode: role.code, organizationId, branchCount: checkedBranches.length, correlationId }, audit);
    const hydrated = (await getRaw(client, created.id))!;
    return { invite: await deliver(client, hydrated, generated.rawToken, origin, actor, "sent", audit) };
  }

  return {
    bootstrapOwner(input, actor, origin, audit) { return create({ ...input, roleCode: "organization_owner", branchIds: [] }, actor, origin, audit, true); },
    createInvite(input, actor, origin, audit) { return create(input, actor, origin, audit, false); },
    async listInvites(actor, filters) {
      const client = admin(); let query = client.from("staff_invites").select(INVITE_SELECT).order("created_at", { ascending: false });
      if (filters?.status) query = query.eq("status", filters.status); if (filters?.organizationId) query = query.eq("organization_id", filters.organizationId);
      const { data, error } = await query; if (error) rethrowSafe(error);
      const rows = ((data ?? []) as InviteRow[]).map(mapInvite).filter((invite) => { try { assertInviteVisible(actor, invite); return true; } catch { return false; } });
      const acceptedIds = rows.filter((row) => row.status === "accepted").map((row) => row.id);
      if (acceptedIds.length) {
        const { data: assignments, error: assignmentError } = await client.from("user_roles").select("id,invitation_id").in("invitation_id", acceptedIds);
        if (assignmentError) rethrowSafe(assignmentError);
        const byInvite = new Map((assignments ?? []).map((row: { id: string; invitation_id: string }) => [row.invitation_id, row.id]));
        for (const row of rows) row.acceptedRoleAssignmentId = byInvite.get(row.id) ?? null;
      }
      if (filters?.organizationId) assertCanSee(actor, filters.organizationId); return rows;
    },
    async getInvite(id, actor) { const invite = await getRaw(admin(), id); if (invite && actor) assertInviteVisible(actor, invite); return invite; },
    async sendInvite(id, actor, origin, audit) {
      const client = admin(); const existing = await getRaw(client, id); if (!existing) throw new ApiError(404, "NOT_FOUND", "Invite not found."); assertInviteVisible(actor, existing);
      if (existing.status !== "draft") throw new ApiError(422, "VALIDATION_ERROR", "Only legacy draft invitations can be sent."); await assertSendRateLimit(client, existing.organizationId, existing.email);
      const generated = generateInviteToken(); const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3_600_000).toISOString();
      const { data, error } = await client.from("staff_invites").update({ status: "pending", delivery_status: "queued", token_hash: generated.tokenHash, token_expires_at: expiresAt, last_sent_at: new Date().toISOString(), send_count: existing.sendCount + 1 }).eq("id", id).select(INVITE_SELECT).single();
      if (error || !data) rethrowSafe(error); return { invite: await deliver(client, mapInvite(data as InviteRow), generated.rawToken, origin, actor, "sent", audit) };
    },
    async resendInvite(id, actor, origin, audit) {
      const client = admin(); const existing = await getRaw(client, id); if (!existing) throw new ApiError(404, "NOT_FOUND", "Invite not found."); assertInviteVisible(actor, existing);
      if (existing.status !== "pending") throw new ApiError(422, "VALIDATION_ERROR", "Only pending invitations can be resent."); await assertSendRateLimit(client, existing.organizationId, existing.email);
      const generated = generateInviteToken(); const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 3_600_000).toISOString();
      const { data, error } = await client.from("staff_invites").update({ delivery_status: "queued", token_hash: generated.tokenHash, token_expires_at: expiresAt, last_sent_at: new Date().toISOString(), send_count: existing.sendCount + 1 }).eq("id", id).select(INVITE_SELECT).single();
      if (error || !data) rethrowSafe(error); return { invite: await deliver(client, mapInvite(data as InviteRow), generated.rawToken, origin, actor, "resent", audit) };
    },
    async revokeInvite(id, actor, audit) {
      const client = admin(); const existing = await getRaw(client, id); if (!existing) throw new ApiError(404, "NOT_FOUND", "Invite not found."); assertInviteVisible(actor, existing);
      if (!["draft", "pending"].includes(existing.status)) throw new ApiError(422, "VALIDATION_ERROR", "Only active invitations can be revoked.");
      const { data, error } = await client.from("staff_invites").update({ status: "revoked", token_hash: null, revoked_at: new Date().toISOString() }).eq("id", id).select(INVITE_SELECT).single();
      if (error || !data) rethrowSafe(error); await recordEvent(client, id, "revoked", actor.userId, { correlationId: existing.correlationId }, audit); return mapInvite(data as InviteRow);
    },
    async updateAcceptedStaff(userRoleId, input, actor, audit) {
      const client = admin(); const { data: link, error } = await client.from("user_roles").select("id,user_id,organization_id,role_id,invitation_id,roles:role_id(code)").eq("id", userRoleId).maybeSingle(); if (error) rethrowSafe(error); if (!link) throw new ApiError(404, "NOT_FOUND", "Staff role assignment not found.");
      const organizationId = String(link.organization_id ?? ""); assertInvitationAuthority(actor, organizationId, input.roleCode, input.branchIds); const role = await resolveRole(client, input.roleCode); const branches = await assertBranches(client, organizationId, input.branchIds, role.code);
      const currentCode = Array.isArray(link.roles) ? link.roles[0]?.code : (link.roles as { code?: string } | null)?.code;
      if (currentCode === "organization_owner") throw new ApiError(403, "FINAL_OWNER_PROTECTED", "Owner changes require a dedicated ownership transfer flow.");
      const { error: updateError } = await client.rpc("update_identity_user_role_scope", { p_user_role_id: userRoleId, p_role_id: role.id, p_branch_ids: branches }); if (updateError) rethrowSafe(updateError);
      if (link.invitation_id) await recordEvent(client, String(link.invitation_id), "assignment_scope_updated", actor.userId, { userRoleId, roleCode: role.code, branchCount: branches.length, organizationId }, audit);
      return { userRoleId, roleCode: role.code, branchIds: branches };
    },
    async previewInvite(token) {
      const client = admin(); const tokenHash = hashInviteToken(token); const { data, error } = await client.from("staff_invites").select(INVITE_SELECT).eq("token_hash", tokenHash).maybeSingle(); if (error) rethrowSafe(error); if (!data) genericNotAcceptable();
      const row = data as InviteRow; const invite = mapInvite(row); if (!row.token_hash || !tokensEqual(row.token_hash, tokenHash) || invite.status !== "pending" || !invite.expiresAt || Date.parse(invite.expiresAt) <= Date.now()) genericNotAcceptable();
      const { data: branches } = invite.branchIds.length ? await client.from("branches").select("id,name").in("id", invite.branchIds) : { data: [] };
      const names = ((branches ?? []) as Array<{ id: string; name: string }>).sort((a,b) => invite.branchIds.indexOf(a.id)-invite.branchIds.indexOf(b.id)).map((b) => b.name);
      return { email: invite.email, fullName: invite.fullName, roleCode: invite.roleCode, organizationId: invite.organizationId, branchIds: invite.branchIds, branchNames: names, branchId: invite.branchId, branchName: names[0] ?? null, status: invite.status, expiresAt: invite.expiresAt };
    },
    async acceptInvite(input, audit) {
      const client = admin(); const tokenHash = hashInviteToken(input.token); await durableAcceptLimit(client, tokenHash, audit?.ip);
      if (input.password.length < 8 || input.password.length > 128) throw new ApiError(422, "VALIDATION_ERROR", "Password must be between 8 and 128 characters.");
      const { data, error } = await client.from("staff_invites").select(INVITE_SELECT).eq("token_hash", tokenHash).maybeSingle(); if (error) rethrowSafe(error); if (!data) genericNotAcceptable();
      const row = data as InviteRow; const invite = mapInvite(row); if (!row.token_hash || !tokensEqual(row.token_hash, tokenHash) || invite.status !== "pending") genericNotAcceptable();
      if (!invite.expiresAt || Date.parse(invite.expiresAt) <= Date.now()) { await client.from("staff_invites").update({ status: "expired", token_hash: null }).eq("id", invite.id); await recordEvent(client, invite.id, "expired_marked", null, { correlationId: invite.correlationId }, audit); genericNotAcceptable(); }
      const { data: authExists } = await client.rpc("auth_user_email_exists", { p_email: invite.email }); if (authExists === true) throw new ApiError(409, "INVITE_ACCOUNT_CONFLICT", "An account already exists for this email.");
      const { data: created, error: createError } = await client.auth.admin.createUser({ email: invite.email, password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName?.trim() || invite.fullName } });
      if (createError || !created.user) { await recordEvent(client, invite.id, "accept_failed", null, { reason: "auth_create_failed", correlationId: invite.correlationId }, audit); throw new ApiError(503, "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE", "Unable to activate invite."); }
      const { error: finalizeError } = await client.rpc("finalize_staff_invite_acceptance", { p_invite_id: invite.id, p_auth_user_id: created.user.id, p_full_name: input.fullName?.trim() || invite.fullName });
      if (finalizeError) { await client.auth.admin.deleteUser(created.user.id); await recordEvent(client, invite.id, "accept_failed", null, { reason: "finalize_failed", correlationId: invite.correlationId }, audit); throw new ApiError(503, "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE", "Unable to activate invite."); }
      return { authUserId: created.user.id, email: invite.email, profileReady: true };
    },
  };
}

export { assertPlatformSuperAdmin as assertCanManageInvites };
export function assertCanReadInvites(actor: AuthPrincipal) {
  if (isPlatform(actor) || ownedOrganizations(actor).size > 0 || isBranchManager(actor)) return;
  throw new ApiError(403, "FORBIDDEN", "Invitation access denied.");
}

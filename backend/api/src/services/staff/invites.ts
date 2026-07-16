import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";

export type StaffInviteStatus = "draft" | "pending" | "accepted" | "revoked" | "expired";

export interface StaffInviteRecord {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleId: string;
  roleCode: string;
  branchId: string;
  status: StaffInviteStatus;
  expiresAt: string | null;
  invitedBy: string | null;
  acceptedUserId: string | null;
  sendCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInvitePreview {
  email: string;
  fullName: string;
  roleCode: string;
  branchId: string;
  branchName: string | null;
  status: StaffInviteStatus;
  expiresAt: string | null;
}

export interface CreateStaffInviteInput {
  email: string;
  fullName: string;
  phone?: string | null;
  roleCode: string;
  branchId: string;
  sendNow?: boolean;
  expiresInHours?: number;
}

export interface AcceptStaffInviteInput {
  token: string;
  password: string;
  fullName?: string;
}

export interface InviteAuditContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface StaffInviteRepository {
  createInvite(
    input: CreateStaffInviteInput,
    actor: AuthPrincipal,
    inviteAppOrigin: string,
    audit?: InviteAuditContext,
  ): Promise<{ invite: StaffInviteRecord; inviteUrl: string | null }>;
  listInvites(filters?: { status?: StaffInviteStatus }): Promise<StaffInviteRecord[]>;
  getInvite(id: string): Promise<StaffInviteRecord | null>;
  sendInvite(
    id: string,
    actor: AuthPrincipal,
    inviteAppOrigin: string,
    audit?: InviteAuditContext,
  ): Promise<{ invite: StaffInviteRecord; inviteUrl: string }>;
  resendInvite(
    id: string,
    actor: AuthPrincipal,
    inviteAppOrigin: string,
    audit?: InviteAuditContext,
  ): Promise<{ invite: StaffInviteRecord; inviteUrl: string }>;
  revokeInvite(
    id: string,
    actor: AuthPrincipal,
    audit?: InviteAuditContext,
  ): Promise<StaffInviteRecord>;
  previewInvite(token: string): Promise<StaffInvitePreview>;
  acceptInvite(
    input: AcceptStaffInviteInput,
    audit?: InviteAuditContext,
  ): Promise<{ authUserId: string; email: string; profileReady: boolean }>;
}

const DEFAULT_EXPIRY_HOURS = 72;
const MIN_EXPIRY_HOURS = 1;
const MAX_EXPIRY_HOURS = 168;
const MAX_SENDS_PER_24H = 3;
const MAX_ACCEPT_ATTEMPTS_PER_15M = 10;
const INVITABLE_ROLES = new Set([
  "branch-manager",
  "cashier",
  "kitchen",
  "customer-support",
  "rider",
]);

export function isInviteableRoleCode(roleCode: string): boolean {
  return INVITABLE_ROLES.has(roleCode);
}

type InviteRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_id: string;
  branch_id: string | null;
  status: StaffInviteStatus;
  token_hash: string | null;
  token_expires_at: string | null;
  invited_by: string | null;
  accepted_user_id: string | null;
  send_count: number;
  created_at: string;
  updated_at: string;
  roles?: { code: string } | { code: string }[] | null;
};

const acceptAttemptBuckets = new Map<string, number[]>();

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashInviteToken(rawToken) };
}

export function resolveExpiryHours(value: number | undefined): number {
  const hours = value ?? DEFAULT_EXPIRY_HOURS;
  if (!Number.isFinite(hours) || hours < MIN_EXPIRY_HOURS || hours > MAX_EXPIRY_HOURS) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      `expiresInHours must be between ${MIN_EXPIRY_HOURS} and ${MAX_EXPIRY_HOURS}.`,
    );
  }
  return hours;
}

export function buildInviteUrl(appOrigin: string, rawToken: string): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}/staff/accept?token=${encodeURIComponent(rawToken)}`;
}

export function sanitizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const cleaned = ip.trim().slice(0, 64);
  if (!cleaned || /[\x00-\x1f]/.test(cleaned)) return null;
  return cleaned;
}

export function sanitizeUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const cleaned = ua.replace(/[\x00-\x1f]/g, " ").trim().slice(0, 300);
  return cleaned || null;
}

function roleCodeFromRow(row: InviteRow): string {
  const roles = row.roles;
  if (Array.isArray(roles)) return roles[0]?.code ?? "";
  return roles?.code ?? "";
}

function mapInvite(row: InviteRow): StaffInviteRecord {
  if (!row.branch_id) {
    throw new ApiError(500, "INTERNAL_ERROR", "Invite is missing branch assignment.");
  }
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    roleId: row.role_id,
    roleCode: roleCodeFromRow(row),
    branchId: row.branch_id,
    status: row.status,
    expiresAt: row.token_expires_at,
    invitedBy: row.invited_by,
    acceptedUserId: row.accepted_user_id,
    sendCount: row.send_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const INVITE_SELECT =
  "id, email, full_name, phone, role_id, branch_id, status, token_hash, token_expires_at, invited_by, accepted_user_id, send_count, created_at, updated_at, roles:role_id(code)";

async function recordEvent(
  admin: SupabaseClient,
  inviteId: string,
  eventType: string,
  actorUserId: string | null,
  payload: Record<string, unknown> = {},
  audit?: InviteAuditContext,
) {
  // Never include token / inviteUrl / hash in audit payloads.
  await admin.from("staff_invite_events").insert({
    invite_id: inviteId,
    actor_user_id: actorUserId,
    event_type: eventType,
    payload,
    ip: sanitizeIp(audit?.ip),
    user_agent: sanitizeUserAgent(audit?.userAgent),
  });
}

function assertSuperAdminOnly(actor: AuthPrincipal) {
  if (!actor.isSuperAdmin) {
    throw new ApiError(403, "FORBIDDEN", "Super-admin access is required.");
  }
}

async function assertNoConflict(admin: SupabaseClient, email: string) {
  const normalized = normalizeInviteEmail(email);

  const { data: pending, error: pendingError } = await admin
    .from("staff_invites")
    .select("id")
    .eq("status", "pending")
    .ilike("email", normalized)
    .maybeSingle();

  if (pendingError) throw pendingError;
  if (pending) {
    throw new ApiError(409, "INVITE_CONFLICT", "A pending invite already exists for this email.");
  }

  const { data: existingUser, error: userError } = await admin
    .from("users")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (userError) throw userError;
  if (existingUser) {
    throw new ApiError(
      409,
      "INVITE_ACCOUNT_CONFLICT",
      "An account already exists for this email. Linking requires a future approved flow.",
    );
  }

  const { data: authExists, error: authExistsError } = await admin.rpc("auth_user_email_exists", {
    p_email: normalized,
  });

  if (authExistsError) throw authExistsError;
  if (authExists === true) {
    throw new ApiError(
      409,
      "INVITE_ACCOUNT_CONFLICT",
      "An account already exists for this email. Linking requires a future approved flow.",
    );
  }
}

async function resolveRole(
  admin: SupabaseClient,
  roleCode: string,
): Promise<{ id: string; code: string }> {
  if (!INVITABLE_ROLES.has(roleCode)) {
    throw new ApiError(422, "VALIDATION_ERROR", "roleCode is not inviteable.");
  }

  const { data, error } = await admin.from("roles").select("id, code").eq("code", roleCode).maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ApiError(422, "VALIDATION_ERROR", "roleCode does not exist.");
  }
  return data as { id: string; code: string };
}

async function assertOperatingBranch(admin: SupabaseClient, branchId: string): Promise<string> {
  if (!branchId) {
    throw new ApiError(422, "VALIDATION_ERROR", "branchId is required.");
  }

  const { data, error } = await admin
    .from("branches")
    .select("id, status")
    .eq("id", branchId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new ApiError(422, "VALIDATION_ERROR", "branchId does not exist.");
  }
  if ((data as { status: string }).status !== "operating") {
    throw new ApiError(422, "VALIDATION_ERROR", "branch must be operating.");
  }

  return branchId;
}

async function assertSendRateLimit(admin: SupabaseClient, email: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const normalized = normalizeInviteEmail(email);

  const { data: invites, error: inviteError } = await admin
    .from("staff_invites")
    .select("id")
    .ilike("email", normalized);

  if (inviteError) throw inviteError;
  const inviteIds = ((invites ?? []) as { id: string }[]).map((row) => row.id);
  if (inviteIds.length === 0) return;

  const { data: events, error: eventError } = await admin
    .from("staff_invite_events")
    .select("id, event_type, created_at")
    .in("invite_id", inviteIds)
    .in("event_type", ["sent", "resent"])
    .gte("created_at", since);

  if (eventError) throw eventError;
  if ((events ?? []).length >= MAX_SENDS_PER_24H) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Maximum of 3 send/resend actions per 24 hours for this email.",
    );
  }
}

function assertAcceptRateLimit(tokenHash: string) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const prior = (acceptAttemptBuckets.get(tokenHash) ?? []).filter((ts) => now - ts < windowMs);
  if (prior.length >= MAX_ACCEPT_ATTEMPTS_PER_15M) {
    throw new ApiError(429, "RATE_LIMITED", "Too many accept attempts. Please try again later.");
  }
  prior.push(now);
  acceptAttemptBuckets.set(tokenHash, prior);
}

function tokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function genericNotAcceptable(): never {
  throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted.");
}

export function createSupabaseStaffInviteRepository(
  envStatus: EnvironmentStatus,
): StaffInviteRepository {
  return {
    async createInvite(input, actor, inviteAppOrigin, audit) {
      assertSuperAdminOnly(actor);
      const admin = createServiceClient(envStatus);
      const email = normalizeInviteEmail(input.email);
      const fullName = input.fullName.trim();
      if (!fullName) {
        throw new ApiError(422, "VALIDATION_ERROR", "fullName is required.");
      }

      await assertNoConflict(admin, email);
      const role = await resolveRole(admin, input.roleCode);
      const branchId = await assertOperatingBranch(admin, input.branchId);
      const sendNow = input.sendNow !== false;
      const expiryHours = resolveExpiryHours(input.expiresInHours);

      if (sendNow) {
        await assertSendRateLimit(admin, email);
      }

      let status: StaffInviteStatus = "draft";
      let tokenHash: string | null = null;
      let rawToken: string | null = null;
      let expiresAt: string | null = null;
      let sentAt: string | null = null;
      let sendCount = 0;

      if (sendNow) {
        const generated = generateInviteToken();
        rawToken = generated.rawToken;
        tokenHash = generated.tokenHash;
        status = "pending";
        expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
        sentAt = new Date().toISOString();
        sendCount = 1;
      }

      const { data, error } = await admin
        .from("staff_invites")
        .insert({
          email,
          full_name: fullName,
          phone: input.phone ?? null,
          role_id: role.id,
          branch_id: branchId,
          status,
          token_hash: tokenHash,
          token_expires_at: expiresAt,
          sent_at: sentAt,
          last_sent_at: sentAt,
          invited_by: actor.userId,
          send_count: sendCount,
        })
        .select(INVITE_SELECT)
        .single();

      if (error || !data) {
        throw error ?? new Error("invite create failed");
      }

      const invite = mapInvite(data as InviteRow);
      await recordEvent(
        admin,
        invite.id,
        "created",
        actor.userId,
        { roleCode: role.code, sendNow },
        audit,
      );
      if (sendNow) {
        await recordEvent(admin, invite.id, "sent", actor.userId, {}, audit);
      }

      return {
        invite,
        inviteUrl: rawToken ? buildInviteUrl(inviteAppOrigin, rawToken) : null,
      };
    },

    async listInvites(filters) {
      const admin = createServiceClient(envStatus);
      let query = admin.from("staff_invites").select(INVITE_SELECT).order("created_at", {
        ascending: false,
      });
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as InviteRow[]).map(mapInvite);
    },

    async getInvite(id) {
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("staff_invites")
        .select(INVITE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapInvite(data as InviteRow) : null;
    },

    async sendInvite(id, actor, inviteAppOrigin, audit) {
      assertSuperAdminOnly(actor);
      const admin = createServiceClient(envStatus);
      const existing = await this.getInvite(id);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Invite not found.");
      }
      if (existing.status !== "draft") {
        throw new ApiError(422, "VALIDATION_ERROR", "Only draft invites can be sent.");
      }

      await assertSendRateLimit(admin, existing.email);

      const generated = generateInviteToken();
      const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      const sentAt = new Date().toISOString();

      const { data, error } = await admin
        .from("staff_invites")
        .update({
          status: "pending",
          token_hash: generated.tokenHash,
          token_expires_at: expiresAt,
          sent_at: sentAt,
          last_sent_at: sentAt,
          send_count: 1,
        })
        .eq("id", id)
        .select(INVITE_SELECT)
        .single();

      if (error || !data) throw error ?? new Error("send failed");
      await recordEvent(admin, id, "sent", actor.userId, {}, audit);
      return {
        invite: mapInvite(data as InviteRow),
        inviteUrl: buildInviteUrl(inviteAppOrigin, generated.rawToken),
      };
    },

    async resendInvite(id, actor, inviteAppOrigin, audit) {
      assertSuperAdminOnly(actor);
      const admin = createServiceClient(envStatus);
      const existing = await this.getInvite(id);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Invite not found.");
      }
      if (existing.status === "revoked") {
        throw new ApiError(
          422,
          "VALIDATION_ERROR",
          "Revoked invites cannot be resent. Create a new invite.",
        );
      }
      if (existing.status !== "pending") {
        throw new ApiError(422, "VALIDATION_ERROR", "Only pending invites can be resent.");
      }

      await assertSendRateLimit(admin, existing.email);

      const generated = generateInviteToken();
      const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      const sentAt = new Date().toISOString();

      const { data, error } = await admin
        .from("staff_invites")
        .update({
          token_hash: generated.tokenHash,
          token_expires_at: expiresAt,
          last_sent_at: sentAt,
          send_count: existing.sendCount + 1,
        })
        .eq("id", id)
        .select(INVITE_SELECT)
        .single();

      if (error || !data) throw error ?? new Error("resend failed");
      await recordEvent(admin, id, "resent", actor.userId, {}, audit);
      return {
        invite: mapInvite(data as InviteRow),
        inviteUrl: buildInviteUrl(inviteAppOrigin, generated.rawToken),
      };
    },

    async revokeInvite(id, actor, audit) {
      assertSuperAdminOnly(actor);
      const admin = createServiceClient(envStatus);
      const existing = await this.getInvite(id);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Invite not found.");
      }
      if (existing.status !== "draft" && existing.status !== "pending") {
        throw new ApiError(422, "VALIDATION_ERROR", "Only draft or pending invites can be revoked.");
      }

      const { data, error } = await admin
        .from("staff_invites")
        .update({
          status: "revoked",
          token_hash: null,
          revoked_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(INVITE_SELECT)
        .single();

      if (error || !data) throw error ?? new Error("revoke failed");
      await recordEvent(admin, id, "revoked", actor.userId, {}, audit);
      return mapInvite(data as InviteRow);
    },

    async previewInvite(token) {
      const admin = createServiceClient(envStatus);
      const tokenHash = hashInviteToken(token);
      const { data: inviteRow, error } = await admin
        .from("staff_invites")
        .select(INVITE_SELECT)
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (error) throw error;
      if (!inviteRow) genericNotAcceptable();

      const invite = mapInvite(inviteRow as InviteRow);
      const storedHash = (inviteRow as InviteRow).token_hash;
      if (!storedHash || !tokensEqual(storedHash, tokenHash)) {
        genericNotAcceptable();
      }
      if (invite.status !== "pending") {
        genericNotAcceptable();
      }
      if (!invite.expiresAt || Date.parse(invite.expiresAt) <= Date.now()) {
        genericNotAcceptable();
      }

      const { data: branch } = await admin
        .from("branches")
        .select("name")
        .eq("id", invite.branchId)
        .maybeSingle();

      return {
        email: invite.email,
        fullName: invite.fullName,
        roleCode: invite.roleCode,
        branchId: invite.branchId,
        branchName: (branch as { name?: string } | null)?.name ?? null,
        status: invite.status,
        expiresAt: invite.expiresAt,
      };
    },

    async acceptInvite(input, audit) {
      const admin = createServiceClient(envStatus);
      const tokenHash = hashInviteToken(input.token);
      assertAcceptRateLimit(tokenHash);

      const password = input.password;
      if (password.length < 8 || password.length > 128) {
        throw new ApiError(422, "VALIDATION_ERROR", "Password must be between 8 and 128 characters.");
      }

      const { data: inviteRow, error: inviteError } = await admin
        .from("staff_invites")
        .select(INVITE_SELECT)
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (inviteError) throw inviteError;
      if (!inviteRow) genericNotAcceptable();

      const invite = mapInvite(inviteRow as InviteRow);
      const storedHash = (inviteRow as InviteRow).token_hash;
      if (!storedHash || !tokensEqual(storedHash, tokenHash)) {
        genericNotAcceptable();
      }

      if (invite.status !== "pending") {
        genericNotAcceptable();
      }

      if (!invite.expiresAt || Date.parse(invite.expiresAt) <= Date.now()) {
        await admin
          .from("staff_invites")
          .update({ status: "expired", token_hash: null })
          .eq("id", invite.id);
        await recordEvent(admin, invite.id, "expired_marked", null, {}, audit);
        genericNotAcceptable();
      }

      // Existing auth account must never be silently converted.
      const { data: authExists, error: authExistsError } = await admin.rpc("auth_user_email_exists", {
        p_email: invite.email,
      });
      if (authExistsError) throw authExistsError;
      if (authExists === true) {
        await recordEvent(
          admin,
          invite.id,
          "accept_failed",
          null,
          { reason: "account_conflict" },
          audit,
        );
        throw new ApiError(
          409,
          "INVITE_ACCOUNT_CONFLICT",
          "An account already exists for this email. Linking requires a future approved flow.",
        );
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName?.trim() || invite.fullName,
        },
      });

      if (createError || !created.user) {
        await recordEvent(
          admin,
          invite.id,
          "accept_failed",
          null,
          { reason: "auth_create_failed" },
          audit,
        );
        const message = createError?.message?.toLowerCase() ?? "";
        if (message.includes("already") || message.includes("registered")) {
          throw new ApiError(
            409,
            "INVITE_ACCOUNT_CONFLICT",
            "An account already exists for this email. Linking requires a future approved flow.",
          );
        }
        throw new ApiError(503, "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE", "Unable to activate invite.");
      }

      const { error: finalizeError } = await admin.rpc("finalize_staff_invite_acceptance", {
        p_invite_id: invite.id,
        p_auth_user_id: created.user.id,
        p_full_name: input.fullName?.trim() || invite.fullName,
      });

      if (finalizeError) {
        await admin.auth.admin.deleteUser(created.user.id);
        const reason = finalizeError.message?.toLowerCase().includes("conflict")
          ? "account_conflict"
          : "finalize_failed";
        await recordEvent(admin, invite.id, "accept_failed", null, { reason }, audit);
        if (reason === "account_conflict") {
          throw new ApiError(
            409,
            "INVITE_ACCOUNT_CONFLICT",
            "An account already exists for this email. Linking requires a future approved flow.",
          );
        }
        throw new ApiError(503, "AUTH_PROFILE_TEMPORARILY_UNAVAILABLE", "Unable to activate invite.");
      }

      return {
        authUserId: created.user.id,
        email: invite.email,
        profileReady: true,
      };
    },
  };
}

export { assertSuperAdminOnly as assertCanManageInvites };
export function assertCanReadInvites(actor: AuthPrincipal) {
  assertSuperAdminOnly(actor);
}

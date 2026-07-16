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
  branchId: string | null;
  status: StaffInviteStatus;
  expiresAt: string | null;
  invitedBy: string | null;
  acceptedUserId: string | null;
  sendCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInviteInput {
  email: string;
  fullName: string;
  phone?: string | null;
  roleCode: string;
  branchId?: string | null;
  sendNow?: boolean;
  expiresInHours?: number;
}

export interface AcceptStaffInviteInput {
  token: string;
  password: string;
  fullName?: string;
}

export interface StaffInviteRepository {
  createInvite(
    input: CreateStaffInviteInput,
    actor: AuthPrincipal,
    inviteAppOrigin: string,
  ): Promise<{ invite: StaffInviteRecord; inviteUrl: string | null; rawToken: string | null }>;
  listInvites(filters?: { status?: StaffInviteStatus }): Promise<StaffInviteRecord[]>;
  getInvite(id: string): Promise<StaffInviteRecord | null>;
  sendInvite(
    id: string,
    actor: AuthPrincipal,
    inviteAppOrigin: string,
  ): Promise<{ invite: StaffInviteRecord; inviteUrl: string; rawToken: string }>;
  resendInvite(
    id: string,
    actor: AuthPrincipal,
    inviteAppOrigin: string,
  ): Promise<{ invite: StaffInviteRecord; inviteUrl: string; rawToken: string }>;
  revokeInvite(id: string, actor: AuthPrincipal): Promise<StaffInviteRecord>;
  acceptInvite(
    input: AcceptStaffInviteInput,
  ): Promise<{ authUserId: string; email: string; profileReady: boolean }>;
}

const DEFAULT_EXPIRY_HOURS = 72;
const MIN_EXPIRY_HOURS = 1;
const MAX_EXPIRY_HOURS = 168;
const INVITABLE_ROLES = new Set([
  "super-admin",
  "branch-manager",
  "cashier",
  "kitchen",
  "customer-support",
  "rider",
]);

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

function roleCodeFromRow(row: InviteRow): string {
  const roles = row.roles;
  if (Array.isArray(roles)) return roles[0]?.code ?? "";
  return roles?.code ?? "";
}

function mapInvite(row: InviteRow): StaffInviteRecord {
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
) {
  await admin.from("staff_invite_events").insert({
    invite_id: inviteId,
    actor_user_id: actorUserId,
    event_type: eventType,
    payload,
  });
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
    .select("id, user_type, status")
    .ilike("email", normalized)
    .maybeSingle();

  if (userError) throw userError;
  if (existingUser) {
    throw new ApiError(
      409,
      "INVITE_CONFLICT",
      "An account already exists for this email. Customer-to-staff upgrade is not supported in Slice 2B.",
    );
  }
}

async function resolveRole(
  admin: SupabaseClient,
  roleCode: string,
): Promise<{ id: string; code: string }> {
  if (!INVITABLE_ROLES.has(roleCode) || roleCode === "customer") {
    throw new ApiError(422, "VALIDATION_ERROR", "roleCode is not inviteable.");
  }

  const { data, error } = await admin.from("roles").select("id, code").eq("code", roleCode).maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ApiError(422, "VALIDATION_ERROR", "roleCode does not exist.");
  }
  return data as { id: string; code: string };
}

async function assertBranch(
  admin: SupabaseClient,
  roleCode: string,
  branchId: string | null | undefined,
): Promise<string | null> {
  if (roleCode === "super-admin") {
    if (branchId) {
      throw new ApiError(422, "VALIDATION_ERROR", "super-admin invites must not include branchId.");
    }
    return null;
  }

  if (!branchId) {
    throw new ApiError(422, "VALIDATION_ERROR", "branchId is required for this role.");
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

function assertCanManageInvites(actor: AuthPrincipal) {
  if (actor.isSuperAdmin) return;
  if (actor.permissions.includes("staff.create") && actor.permissions.includes("staff.assign_role")) {
    return;
  }
  throw new ApiError(403, "FORBIDDEN", "You do not have permission to manage staff invites.");
}

function assertCanReadInvites(actor: AuthPrincipal) {
  if (actor.isSuperAdmin || actor.permissions.includes("staff.read")) return;
  throw new ApiError(403, "FORBIDDEN", "You do not have permission to read staff invites.");
}

function tokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSupabaseStaffInviteRepository(
  envStatus: EnvironmentStatus,
): StaffInviteRepository {
  return {
    async createInvite(input, actor, inviteAppOrigin) {
      assertCanManageInvites(actor);
      const admin = createServiceClient(envStatus);
      const email = normalizeInviteEmail(input.email);
      const fullName = input.fullName.trim();
      if (!fullName) {
        throw new ApiError(422, "VALIDATION_ERROR", "fullName is required.");
      }

      await assertNoConflict(admin, email);
      const role = await resolveRole(admin, input.roleCode);
      const branchId = await assertBranch(admin, role.code, input.branchId);
      const sendNow = input.sendNow !== false;
      const expiryHours = resolveExpiryHours(input.expiresInHours);

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
      await recordEvent(admin, invite.id, "created", actor.userId, {
        roleCode: role.code,
        sendNow,
      });
      if (sendNow) {
        await recordEvent(admin, invite.id, "sent", actor.userId, {});
      }

      return {
        invite,
        rawToken,
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

    async sendInvite(id, actor, inviteAppOrigin) {
      assertCanManageInvites(actor);
      const admin = createServiceClient(envStatus);
      const existing = await this.getInvite(id);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Invite not found.");
      }
      if (existing.status !== "draft") {
        throw new ApiError(422, "VALIDATION_ERROR", "Only draft invites can be sent.");
      }

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
      await recordEvent(admin, id, "sent", actor.userId, {});
      return {
        invite: mapInvite(data as InviteRow),
        rawToken: generated.rawToken,
        inviteUrl: buildInviteUrl(inviteAppOrigin, generated.rawToken),
      };
    },

    async resendInvite(id, actor, inviteAppOrigin) {
      assertCanManageInvites(actor);
      const admin = createServiceClient(envStatus);
      const existing = await this.getInvite(id);
      if (!existing) {
        throw new ApiError(404, "NOT_FOUND", "Invite not found.");
      }
      if (existing.status !== "pending") {
        throw new ApiError(422, "VALIDATION_ERROR", "Only pending invites can be resent.");
      }

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
      await recordEvent(admin, id, "resent", actor.userId, {});
      return {
        invite: mapInvite(data as InviteRow),
        rawToken: generated.rawToken,
        inviteUrl: buildInviteUrl(inviteAppOrigin, generated.rawToken),
      };
    },

    async revokeInvite(id, actor) {
      assertCanManageInvites(actor);
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
      await recordEvent(admin, id, "revoked", actor.userId, {});
      return mapInvite(data as InviteRow);
    },

    async acceptInvite(input) {
      const admin = createServiceClient(envStatus);
      const tokenHash = hashInviteToken(input.token);
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
      if (!inviteRow) {
        throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted.");
      }

      const invite = mapInvite(inviteRow as InviteRow);
      const storedHash = (inviteRow as InviteRow).token_hash;
      if (!storedHash || !tokensEqual(storedHash, tokenHash)) {
        throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted.");
      }

      if (invite.status !== "pending") {
        throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted.");
      }

      if (!invite.expiresAt || Date.parse(invite.expiresAt) <= Date.now()) {
        await admin
          .from("staff_invites")
          .update({ status: "expired", token_hash: null })
          .eq("id", invite.id);
        await recordEvent(admin, invite.id, "expired_marked", null, {});
        throw new ApiError(410, "INVITE_NOT_ACCEPTABLE", "This invite cannot be accepted.");
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
        await recordEvent(admin, invite.id, "accept_failed", null, {
          reason: "auth_create_failed",
        });
        const message = createError?.message?.toLowerCase() ?? "";
        if (message.includes("already") || message.includes("registered")) {
          throw new ApiError(409, "INVITE_CONFLICT", "An account already exists for this email.");
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
        await recordEvent(admin, invite.id, "accept_failed", null, {
          reason: "finalize_failed",
        });
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

export { assertCanReadInvites };

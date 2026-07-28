import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";
import { loadBranchRow } from "../branches/lookup.js";

/** Canonical staff roles assignable to a branch (never super-admin via this API). */
export const ASSIGNABLE_STAFF_ROLES = [
  "branch-manager",
  "cashier",
  "kitchen",
  "rider",
  "customer-support",
  "host",
  "waiter",
] as const;

export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number];

export const ASSIGNMENT_STATUSES = [
  "INVITED",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "REVOKED",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

const FORBIDDEN_ROLE_CODES = new Set([
  "owner",
  "founder",
  "admin",
  "delivery",
  "general-staff",
  "staff",
  "customer",
  "super-admin",
]);

const REACTIVATABLE = new Set<AssignmentStatus>(["INACTIVE", "SUSPENDED"]);

export interface StaffAssignmentRecord {
  id: string;
  branchId: string | null;
  userId: string;
  roleId: string;
  roleCode: string;
  assignmentStatus: AssignmentStatus;
  invitationId: string | null;
  assignedBy: string | null;
  assignedAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
  userFullName: string | null;
  branchCode: string | null;
  branchName: string | null;
}

export interface StaffAssignmentEventRecord {
  id: string;
  userRoleId: string;
  branchId: string | null;
  userId: string;
  roleId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StaffAssignmentService {
  listBranchStaff(
    scope: BranchActorScope,
    branchId: string,
  ): Promise<StaffAssignmentRecord[]>;
  listAvailableUsers(
    scope: BranchActorScope,
    branchId: string,
  ): Promise<Array<{ userId: string; email: string | null; fullName: string | null }>>;
  createAssignment(
    actor: AuthPrincipal,
    input: {
      branchId: string;
      userId: string;
      roleCode: string;
      notes?: string | null;
    },
  ): Promise<StaffAssignmentRecord>;
  updateStatus(
    actor: AuthPrincipal,
    assignmentId: string,
    nextStatus: AssignmentStatus,
    notes?: string | null,
  ): Promise<StaffAssignmentRecord>;
  deactivate(
    actor: AuthPrincipal,
    assignmentId: string,
    notes?: string | null,
  ): Promise<StaffAssignmentRecord>;
  reactivate(
    actor: AuthPrincipal,
    assignmentId: string,
    notes?: string | null,
  ): Promise<StaffAssignmentRecord>;
  listHistory(
    scope: BranchActorScope,
    assignmentId: string,
  ): Promise<StaffAssignmentEventRecord[]>;
}

type UserRoleRow = {
  id: string;
  user_id: string;
  role_id: string;
  branch_id: string | null;
  assignment_status: AssignmentStatus;
  invitation_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  verified_by: string | null;
  verified_at: string | null;
  deactivated_by: string | null;
  deactivated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  roles?: { code: string } | { code: string }[] | null;
  users?: {
    email: string | null;
    full_name: string | null;
  } | { email: string | null; full_name: string | null }[] | null;
  branches?: {
    branch_code: string;
    name: string;
  } | { branch_code: string; name: string }[] | null;
};

const SELECT =
  "id, user_id, role_id, branch_id, assignment_status, invitation_id, assigned_by, assigned_at, verified_by, verified_at, deactivated_by, deactivated_at, notes, created_at, updated_at, roles(code), users(email, full_name), branches(branch_code, name)";

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapRow(row: UserRoleRow): StaffAssignmentRecord {
  const role = one(row.roles);
  const user = one(row.users);
  const branch = one(row.branches);
  return {
    id: row.id,
    branchId: row.branch_id,
    userId: row.user_id,
    roleId: row.role_id,
    roleCode: role?.code ?? "",
    assignmentStatus: row.assignment_status,
    invitationId: row.invitation_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    deactivatedBy: row.deactivated_by,
    deactivatedAt: row.deactivated_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userEmail: user?.email ?? null,
    userFullName: user?.full_name ?? null,
    branchCode: branch?.branch_code ?? null,
    branchName: branch?.name ?? null,
  };
}

function assertCanManageBranch(actor: AuthPrincipal, branchId: string): void {
  if (actor.isSuperAdmin) return;
  const isBm = actor.roles.some((r) => r === "branch-manager");
  if (!isBm) {
    throw new ApiError(403, "FORBIDDEN", "Staff management requires super-admin or branch-manager.");
  }
  if (!actor.branchIds.includes(branchId)) {
    throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Branch-manager may only manage their assigned branch.");
  }
}

function assertCanReadBranch(scope: BranchActorScope, branchId: string): void {
  assertBranchMembership(scope, branchId);
}

async function loadAssignment(
  admin: SupabaseClient,
  assignmentId: string,
): Promise<UserRoleRow> {
  const { data, error } = await admin
    .from("user_roles")
    .select(SELECT)
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw new ApiError(500, "ASSIGNMENT_LOOKUP_FAILED", error.message);
  if (!data) throw new ApiError(404, "ASSIGNMENT_NOT_FOUND", "Staff assignment not found.");
  return data as UserRoleRow;
}

async function recordEvent(
  admin: SupabaseClient,
  input: {
    userRoleId: string;
    branchId: string | null;
    userId: string;
    roleId: string;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorUserId: string;
    notes?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("staff_assignment_events").insert({
    user_role_id: input.userRoleId,
    branch_id: input.branchId,
    user_id: input.userId,
    role_id: input.roleId,
    event_type: input.eventType,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    actor_user_id: input.actorUserId,
    notes: input.notes ?? null,
  });
  if (error) throw new ApiError(500, "ASSIGNMENT_EVENT_FAILED", error.message);
}

export function createStaffAssignmentService(
  envStatus: EnvironmentStatus,
): StaffAssignmentService {
  return {
    async listBranchStaff(scope, branchId) {
      assertCanReadBranch(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("user_roles")
        .select(SELECT)
        .eq("branch_id", branchId)
        .order("assigned_at", { ascending: false });
      if (error) throw new ApiError(500, "STAFF_LIST_FAILED", error.message);
      return ((data ?? []) as UserRoleRow[]).map(mapRow);
    },

    async listAvailableUsers(scope, branchId) {
      assertCanReadBranch(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("users")
        .select("id, email, full_name, status")
        .neq("user_type", "customer")
        .order("full_name", { ascending: true })
        .limit(200);
      if (error) throw new ApiError(500, "USER_LIST_FAILED", error.message);
      return ((data ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>).map(
        (u) => ({
          userId: u.id,
          email: u.email,
          fullName: u.full_name,
        }),
      );
    },

    async createAssignment(actor, input) {
      assertCanManageBranch(actor, input.branchId);
      const roleCode = input.roleCode.trim().toLowerCase();

      if (FORBIDDEN_ROLE_CODES.has(roleCode) || roleCode === "super-admin") {
        throw new ApiError(400, "FORBIDDEN_ROLE", `Role code '${roleCode}' cannot be assigned.`);
      }
      if (!(ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(roleCode)) {
        throw new ApiError(400, "ROLE_NOT_ASSIGNABLE", `Role '${roleCode}' is not an assignable staff role.`);
      }
      if (!actor.isSuperAdmin && roleCode === "branch-manager") {
        // branch-managers may assign operational roles but not elevate peers to BM without founder
        // Spec: BM may not grant super-admin (already blocked). BM creating BM is allowed only for super-admin.
        throw new ApiError(
          403,
          "ROLE_ELEVATION_FORBIDDEN",
          "Only super-admin may assign branch-manager.",
        );
      }

      const admin = createServiceClient(envStatus);
      const branch = await loadBranchRow(admin, input.branchId);
      if (String(branch.status).toLowerCase() !== "operating") {
        throw new ApiError(
          409,
          "BRANCH_NOT_OPERATING",
          "Cannot create operational staff assignments on a non-operating branch (Northern Bypass isolation).",
        );
      }

      const { data: role, error: roleError } = await admin
        .from("roles")
        .select("id, code")
        .eq("code", roleCode)
        .maybeSingle();
      if (roleError) throw new ApiError(500, "ROLE_LOOKUP_FAILED", roleError.message);
      if (!role) throw new ApiError(404, "ROLE_NOT_FOUND", `Role '${roleCode}' does not exist.`);

      const { data: user, error: userError } = await admin
        .from("users")
        .select("id, email, full_name")
        .eq("id", input.userId)
        .maybeSingle();
      if (userError) throw new ApiError(500, "USER_LOOKUP_FAILED", userError.message);
      if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");

      const { data: existing } = await admin
        .from("user_roles")
        .select("id, assignment_status")
        .eq("user_id", input.userId)
        .eq("role_id", (role as { id: string }).id)
        .eq("branch_id", input.branchId)
        .maybeSingle();

      if (existing) {
        const status = (existing as { assignment_status: AssignmentStatus }).assignment_status;
        if (status === "ACTIVE" || status === "INVITED") {
          throw new ApiError(
            409,
            "DUPLICATE_ACTIVE_ASSIGNMENT",
            "An active assignment already exists for this user, branch, and role.",
          );
        }
        // Reactivate existing historical row instead of inserting duplicate.
        const now = new Date().toISOString();
        const { data: updated, error: updateError } = await admin
          .from("user_roles")
          .update({
            assignment_status: "ACTIVE",
            assigned_by: actor.userId,
            assigned_at: now,
            deactivated_by: null,
            deactivated_at: null,
            notes: input.notes ?? null,
            updated_at: now,
          })
          .eq("id", (existing as { id: string }).id)
          .select(SELECT)
          .single();
        if (updateError || !updated) {
          throw new ApiError(500, "ASSIGNMENT_UPDATE_FAILED", updateError?.message ?? "update failed");
        }
        await recordEvent(admin, {
          userRoleId: (existing as { id: string }).id,
          branchId: input.branchId,
          userId: input.userId,
          roleId: (role as { id: string }).id,
          eventType: "REACTIVATED",
          fromStatus: status,
          toStatus: "ACTIVE",
          actorUserId: actor.userId,
          notes: input.notes,
        });
        return mapRow(updated as UserRoleRow);
      }

      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await admin
        .from("user_roles")
        .insert({
          user_id: input.userId,
          role_id: (role as { id: string }).id,
          branch_id: input.branchId,
          assignment_status: "ACTIVE",
          assigned_by: actor.userId,
          assigned_at: now,
          notes: input.notes ?? null,
        })
        .select(SELECT)
        .single();

      if (insertError || !inserted) {
        if (insertError?.code === "23505") {
          throw new ApiError(
            409,
            "DUPLICATE_ACTIVE_ASSIGNMENT",
            "An active assignment already exists for this user, branch, and role.",
          );
        }
        throw new ApiError(500, "ASSIGNMENT_CREATE_FAILED", insertError?.message ?? "insert failed");
      }

      const mapped = mapRow(inserted as UserRoleRow);
      await recordEvent(admin, {
        userRoleId: mapped.id,
        branchId: input.branchId,
        userId: input.userId,
        roleId: (role as { id: string }).id,
        eventType: "ASSIGNED",
        fromStatus: null,
        toStatus: "ACTIVE",
        actorUserId: actor.userId,
        notes: input.notes,
      });
      return mapped;
    },

    async updateStatus(actor, assignmentId, nextStatus, notes) {
      const admin = createServiceClient(envStatus);
      const row = await loadAssignment(admin, assignmentId);
      if (!row.branch_id) {
        throw new ApiError(400, "GLOBAL_ASSIGNMENT_IMMUTABLE", "Global assignments cannot be managed here.");
      }
      assertCanManageBranch(actor, row.branch_id);
      if (!(ASSIGNMENT_STATUSES as readonly string[]).includes(nextStatus)) {
        throw new ApiError(400, "INVALID_STATUS", `Invalid assignment status '${nextStatus}'.`);
      }

      const from = row.assignment_status;
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = {
        assignment_status: nextStatus,
        notes: notes ?? row.notes,
        updated_at: now,
      };
      if (nextStatus === "INACTIVE" || nextStatus === "REVOKED" || nextStatus === "SUSPENDED") {
        patch.deactivated_by = actor.userId;
        patch.deactivated_at = now;
      }
      if (nextStatus === "ACTIVE") {
        patch.deactivated_by = null;
        patch.deactivated_at = null;
        patch.assigned_by = actor.userId;
        patch.assigned_at = now;
      }

      const { data: updated, error } = await admin
        .from("user_roles")
        .update(patch)
        .eq("id", assignmentId)
        .select(SELECT)
        .single();
      if (error || !updated) {
        throw new ApiError(500, "ASSIGNMENT_UPDATE_FAILED", error?.message ?? "update failed");
      }

      await recordEvent(admin, {
        userRoleId: assignmentId,
        branchId: row.branch_id,
        userId: row.user_id,
        roleId: row.role_id,
        eventType: "STATUS_CHANGED",
        fromStatus: from,
        toStatus: nextStatus,
        actorUserId: actor.userId,
        notes,
      });
      return mapRow(updated as UserRoleRow);
    },

    async deactivate(actor, assignmentId, notes) {
      return this.updateStatus(actor, assignmentId, "INACTIVE", notes);
    },

    async reactivate(actor, assignmentId, notes) {
      const admin = createServiceClient(envStatus);
      const row = await loadAssignment(admin, assignmentId);
      if (!REACTIVATABLE.has(row.assignment_status)) {
        throw new ApiError(
          409,
          "REACTIVATION_NOT_ALLOWED",
          `Cannot reactivate assignment in status ${row.assignment_status}.`,
        );
      }
      return this.updateStatus(actor, assignmentId, "ACTIVE", notes);
    },

    async listHistory(scope, assignmentId) {
      const admin = createServiceClient(envStatus);
      const row = await loadAssignment(admin, assignmentId);
      if (row.branch_id) {
        assertCanReadBranch(scope, row.branch_id);
      } else if (!scope.isSuperAdmin) {
        throw new ApiError(403, "FORBIDDEN", "Global assignment history requires super-admin.");
      }

      const { data, error } = await admin
        .from("staff_assignment_events")
        .select(
          "id, user_role_id, branch_id, user_id, role_id, event_type, from_status, to_status, actor_user_id, notes, created_at",
        )
        .eq("user_role_id", assignmentId)
        .order("created_at", { ascending: false });
      if (error) throw new ApiError(500, "HISTORY_LOOKUP_FAILED", error.message);

      return ((data ?? []) as Array<{
        id: string;
        user_role_id: string;
        branch_id: string | null;
        user_id: string;
        role_id: string;
        event_type: string;
        from_status: string | null;
        to_status: string | null;
        actor_user_id: string | null;
        notes: string | null;
        created_at: string;
      }>).map((e) => ({
        id: e.id,
        userRoleId: e.user_role_id,
        branchId: e.branch_id,
        userId: e.user_id,
        roleId: e.role_id,
        eventType: e.event_type,
        fromStatus: e.from_status,
        toStatus: e.to_status,
        actorUserId: e.actor_user_id,
        notes: e.notes,
        createdAt: e.created_at,
      }));
    },
  };
}

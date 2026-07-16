import { Router } from "express";
import { z } from "zod";

import { ApiError, requireRole, sendNotImplemented, validateBody } from "../../common/http.js";
import {
  createAuthorizationHelpers,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import {
  assertCanReadInvites,
  type StaffInviteRepository,
  type StaffInviteStatus,
} from "../../services/staff/invites.js";

const createInviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(30).optional().nullable(),
  roleCode: z.string().trim().min(1).max(100),
  branchId: z.string().uuid().optional().nullable(),
  sendNow: z.boolean().optional(),
  expiresInHours: z.number().int().optional(),
});

export interface AdminRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffInviteRepository: StaffInviteRepository;
  inviteAppOrigin: string;
}

function toSafeInvite(invite: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleCode: string;
  branchId: string | null;
  status: string;
  expiresAt: string | null;
  invitedBy: string | null;
  acceptedUserId: string | null;
  sendCount: number;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: invite.id,
    email: invite.email,
    fullName: invite.fullName,
    phone: invite.phone,
    roleCode: invite.roleCode,
    branchId: invite.branchId,
    status: invite.status,
    expiresAt: invite.expiresAt,
    invitedBy: invite.invitedBy,
    acceptedUserId: invite.acceptedUserId,
    sendCount: invite.sendCount,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt,
  };
}

export function createAdminRouter(dependencies: AdminRouterDependencies) {
  const router = Router();
  const { requireAuthenticatedUser, requirePermission } = createAuthorizationHelpers(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );

  // Legacy stub — still header-gated 501; must not unlock real admin features.
  router.get("/controls", requireRole(["admin", "super-admin"]), (_req, res) =>
    sendNotImplemented(res, "Admin controls", ["admin.access"]),
  );

  router.post(
    "/staff/invites",
    requireAuthenticatedUser,
    requirePermission("staff.create"),
    validateBody(createInviteSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        if (!principal.isSuperAdmin && !principal.permissions.includes("staff.assign_role")) {
          throw new ApiError(403, "FORBIDDEN", "staff.assign_role is required to choose a role.");
        }

        const result = await dependencies.staffInviteRepository.createInvite(
          req.body,
          principal,
          dependencies.inviteAppOrigin,
        );

        return res.status(201).json({
          ok: true,
          data: {
            ...toSafeInvite(result.invite),
            inviteUrl: result.inviteUrl,
            // raw token only on create/send/resend — never persisted in responses later
            token: result.rawToken,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/staff/invites",
    requireAuthenticatedUser,
    requirePermission("staff.read"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        assertCanReadInvites(principal);
        const status = typeof req.query.status === "string" ? (req.query.status as StaffInviteStatus) : undefined;
        const invites = await dependencies.staffInviteRepository.listInvites(
          status ? { status } : undefined,
        );
        return res.json({
          ok: true,
          data: invites.map(toSafeInvite),
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/staff/invites/:id",
    requireAuthenticatedUser,
    requirePermission("staff.read"),
    async (req, res, next) => {
      try {
        const invite = await dependencies.staffInviteRepository.getInvite(req.params.id);
        if (!invite) {
          throw new ApiError(404, "NOT_FOUND", "Invite not found.");
        }
        return res.json({ ok: true, data: toSafeInvite(invite) });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/staff/invites/:id/send",
    requireAuthenticatedUser,
    requirePermission("staff.create"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await dependencies.staffInviteRepository.sendInvite(
          req.params.id,
          principal,
          dependencies.inviteAppOrigin,
        );
        return res.json({
          ok: true,
          data: {
            ...toSafeInvite(result.invite),
            inviteUrl: result.inviteUrl,
            token: result.rawToken,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/staff/invites/:id/resend",
    requireAuthenticatedUser,
    requirePermission("staff.create"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await dependencies.staffInviteRepository.resendInvite(
          req.params.id,
          principal,
          dependencies.inviteAppOrigin,
        );
        return res.json({
          ok: true,
          data: {
            ...toSafeInvite(result.invite),
            inviteUrl: result.inviteUrl,
            token: result.rawToken,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/staff/invites/:id/revoke",
    requireAuthenticatedUser,
    requirePermission("staff.create"),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const invite = await dependencies.staffInviteRepository.revokeInvite(
          req.params.id,
          principal,
        );
        return res.json({ ok: true, data: toSafeInvite(invite) });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

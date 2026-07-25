import { Router } from "express";
import { z } from "zod";

import { ApiError, requireRole, sendNotImplemented, validateBody } from "../../common/http.js";
import {
  createAuthorizationHelpers,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { BranchOrderManagementDataSource } from "../../services/orders/management.js";
import type { RestaurantTablesDataSource } from "../../services/tables/management.js";
import type { RestaurantBillsService } from "../../services/bills/restaurant-bills.js";
import { createAdminOrdersRouter } from "./orders.js";
import { createAdminTablesRouter } from "./tables.js";
import { createAdminBillsRouter } from "./bills.js";
import { createAdminDashboardRouter } from "./dashboard.js";
import { createAdminPosRouter } from "./pos.js";
import type { OrdersDataSource } from "../../services/orders/types.js";
import type { EnvironmentStatus } from "../../config/env.js";
import {
  createBranchReadinessService,
  type BranchReadinessService,
} from "../../services/branches/readiness.js";
import {
  assertCanReadInvites,
  type InviteAuditContext,
  type StaffInviteRepository,
  type StaffInviteStatus,
} from "../../services/staff/invites.js";

const createInviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(30).optional().nullable(),
  roleCode: z.string().trim().min(1).max(100),
  branchId: z.string().uuid(),
  sendNow: z.boolean().optional(),
  expiresInHours: z.number().int().optional(),
});

export interface AdminRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffInviteRepository: StaffInviteRepository;
  branchOrderManagement: BranchOrderManagementDataSource;
  restaurantTables: RestaurantTablesDataSource;
  restaurantBills: RestaurantBillsService;
  ordersDataSource: OrdersDataSource;
  envStatus: EnvironmentStatus;
  branchReadiness?: BranchReadinessService;
  inviteAppOrigin: string;
}

function toSafeInvite(invite: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roleCode: string;
  branchId: string;
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

function auditFromRequest(req: { ip?: string; headers: Record<string, unknown> }): InviteAuditContext {
  const ua = req.headers["user-agent"];
  return {
    ip: typeof req.ip === "string" ? req.ip : null,
    userAgent: typeof ua === "string" ? ua : null,
  };
}

export function createAdminRouter(dependencies: AdminRouterDependencies) {
  const router = Router();
  const { requireAuthenticatedUser, requireSuperAdmin } = createAuthorizationHelpers(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );

  // Legacy stub — still header-gated 501; must not unlock real admin features.
  router.get("/controls", requireRole(["admin", "super-admin"]), (_req, res) =>
    sendNotImplemented(res, "Admin controls", ["admin.access"]),
  );

  // Sprint 4.5 — branch-scoped order management (Bearer + AuthPrincipal gated).
  router.use(
    "/orders",
    createAdminOrdersRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      branchOrderManagement: dependencies.branchOrderManagement,
    }),
  );

  // Admin ERP S1 — operations overview dashboard.
  router.use(
    "/dashboard",
    createAdminDashboardRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      branchOrderManagement: dependencies.branchOrderManagement,
    }),
  );

  // DB-R3 — branch-scoped restaurant tables (Bearer + AuthPrincipal gated).
  router.use(
    "/tables",
    createAdminTablesRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      restaurantTables: dependencies.restaurantTables,
    }),
  );

  // DB-R6 — dine-in restaurant bills (Bearer + AuthPrincipal gated).
  router.use(
    "/bills",
    createAdminBillsRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      restaurantBills: dependencies.restaurantBills,
    }),
  );

  router.post(
    "/staff/invites",
    requireAuthenticatedUser,
    requireSuperAdmin,
    validateBody(createInviteSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await dependencies.staffInviteRepository.createInvite(
          req.body,
          principal,
          dependencies.inviteAppOrigin,
          auditFromRequest(req),
        );

        return res.status(201).json({
          ok: true,
          data: {
            ...toSafeInvite(result.invite),
            inviteUrl: result.inviteUrl,
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
    requireSuperAdmin,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        assertCanReadInvites(principal);
        const status =
          typeof req.query.status === "string" ? (req.query.status as StaffInviteStatus) : undefined;
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
    requireSuperAdmin,
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
    requireSuperAdmin,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await dependencies.staffInviteRepository.sendInvite(
          req.params.id,
          principal,
          dependencies.inviteAppOrigin,
          auditFromRequest(req),
        );
        return res.json({
          ok: true,
          data: {
            ...toSafeInvite(result.invite),
            inviteUrl: result.inviteUrl,
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
    requireSuperAdmin,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await dependencies.staffInviteRepository.resendInvite(
          req.params.id,
          principal,
          dependencies.inviteAppOrigin,
          auditFromRequest(req),
        );
        return res.json({
          ok: true,
          data: {
            ...toSafeInvite(result.invite),
            inviteUrl: result.inviteUrl,
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
    requireSuperAdmin,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const invite = await dependencies.staffInviteRepository.revokeInvite(
          req.params.id,
          principal,
          auditFromRequest(req),
        );
        return res.json({ ok: true, data: toSafeInvite(invite) });
      } catch (error) {
        return next(error);
      }
    },
  );

  // D2 — authenticated POS order create (membership + operating branch required).
  router.use(
    "/pos",
    createAdminPosRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      ordersDataSource: dependencies.ordersDataSource,
      envStatus: dependencies.envStatus,
    }),
  );

  const readiness =
    dependencies.branchReadiness ?? createBranchReadinessService(dependencies.envStatus);

  router.get(
    "/branches/:branchId/readiness",
    requireAuthenticatedUser,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const report = await readiness.getBranchReadiness(
          {
            isSuperAdmin: principal.isSuperAdmin,
            branchIds: principal.branchIds,
          },
          req.params.branchId,
        );
        return res.json({ ok: true, data: report });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

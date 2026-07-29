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
import { createAdminFloorRouter } from "./floor.js";
import { createAdminMenuRouter } from "./menu.js";
import {
  createAdminReservationsRouter,
  createAdminWaitlistRouter,
} from "./reservations.js";
import { createAdminTableSessionsRouter } from "./table-sessions.js";
import { createAdminPaymentsRouter } from "./payments.js";
import type { FloorConfigurationService } from "../../services/floor/configuration.js";
import type { MenuManagementService } from "../../services/menu/management.js";
import type { ReservationsService } from "../../services/reservations/management.js";
import type { TableServiceOperations } from "../../services/dine-in/table-service.js";
import type { PaymentSettlementService } from "../../services/payments/settlement.js";
import type { DepositService } from "../../services/reservations/deposits.js";
import type { OrdersDataSource } from "../../services/orders/types.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { OutboxWorker } from "../../services/notifications/outbox-worker.js";
import type { ManualContactService } from "../../services/notifications/manual-contact.js";
import {
  createBranchReadinessService,
  type BranchReadinessService,
} from "../../services/branches/readiness.js";
import { createDashboardSummariesService } from "../../services/dashboard/summaries.js";
import {
  assertCanReadInvites,
  type InviteAuditContext,
  type StaffInviteRepository,
  type StaffInviteStatus,
} from "../../services/staff/invites.js";
import type { StaffAssignmentService } from "../../services/staff/assignments.js";
import type { BookingPolicyService } from "../../services/reservations/booking-policy.js";
import { createAdminStaffAssignmentsRouter } from "./staff-assignments.js";
import { createAdminBookingPolicyRouter } from "./booking-policy.js";
import { createAdminOpeningOperationsRouter } from "./opening-operations.js";
import { createAdminOpeningGovernanceRouter } from "./opening-governance.js";
import { createAdminOpeningDryRunRouter } from "./opening-dry-run.js";
import type { OpeningOperationsService } from "../../services/opening/operations.js";
import type { OpeningGovernanceService } from "../../services/opening/governance.js";
import type { OpeningDryRunService } from "../../services/opening/dry-run.js";

const createInviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(30).optional().nullable(),
  roleCode: z.string().trim().min(1).max(100),
  branchId: z.string().uuid(),
  sendNow: z.boolean().optional(),
  expiresInHours: z.number().int().optional(),
});

const processOutboxSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

const manualContactSchema = z
  .object({
    branchId: z.string().uuid(),
    reservationId: z.string().uuid().optional().nullable(),
    waitlistId: z.string().uuid().optional().nullable(),
    note: z.string().trim().max(1000).optional().nullable(),
    channel: z.enum(["manual", "whatsapp", "sms", "email"]).optional(),
  })
  .strict();

export interface AdminRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffInviteRepository: StaffInviteRepository;
  branchOrderManagement: BranchOrderManagementDataSource;
  restaurantTables: RestaurantTablesDataSource;
  restaurantBills: RestaurantBillsService;
  ordersDataSource: OrdersDataSource;
  floorConfiguration: FloorConfigurationService;
  menuManagement: MenuManagementService;
  reservations: ReservationsService;
  tableService: TableServiceOperations;
  paymentSettlement: PaymentSettlementService;
  deposits: DepositService;
  outboxWorker: OutboxWorker;
  manualContact: ManualContactService;
  envStatus: EnvironmentStatus;
  branchReadiness?: BranchReadinessService;
  inviteAppOrigin: string;
  staffAssignments: StaffAssignmentService;
  bookingPolicy: BookingPolicyService;
  openingOperations: OpeningOperationsService;
  openingGovernance: OpeningGovernanceService;
  openingDryRun: OpeningDryRunService;
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
  const { requireAuthenticatedUser, requireSuperAdmin, requirePermission } = createAuthorizationHelpers(
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

  // Admin ERP S1 + D4 — operations / table-service / system-health / opening-readiness.
  const readinessService =
    dependencies.branchReadiness ?? createBranchReadinessService(dependencies.envStatus);
  const dashboardSummaries = createDashboardSummariesService({
    envStatus: dependencies.envStatus,
    reservations: dependencies.reservations,
    tableService: dependencies.tableService,
    branchReadiness: readinessService,
    outboxWorker: dependencies.outboxWorker,
  });

  router.use(
    "/dashboard",
    createAdminDashboardRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      branchOrderManagement: dependencies.branchOrderManagement,
      dashboardSummaries,
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

  // D3 — floor plan configuration (floors, areas, table layout, combinations).
  router.use(
    "/floor",
    createAdminFloorRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      floorConfiguration: dependencies.floorConfiguration,
    }),
  );

  router.use(
    "/menu",
    createAdminMenuRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      menuManagement: dependencies.menuManagement,
    }),
  );

  // D3 — reservations lifecycle + availability engine.
  router.use(
    "/reservations",
    createAdminReservationsRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      reservations: dependencies.reservations,
    }),
  );

  // D3 — waitlist lifecycle.
  router.use(
    "/waitlist",
    createAdminWaitlistRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      reservations: dependencies.reservations,
    }),
  );

  // D3 — dining sessions (walk-in, transfer, bill request, close) + live floor state.
  router.use(
    "/table-service",
    createAdminTableSessionsRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      tableService: dependencies.tableService,
    }),
  );

  // D3 corrective — payment settlement, splits, deposits.
  router.use(
    "/payments",
    createAdminPaymentsRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      paymentSettlement: dependencies.paymentSettlement,
      depositService: dependencies.deposits,
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

  const readiness = readinessService;

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

  // D3 — notification outbox: manual process trigger (honest provider status).
  router.post(
    "/notifications/process-outbox",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(processOutboxSchema),
    async (req, res, next) => {
      try {
        const body = req.body as z.infer<typeof processOutboxSchema>;
        const result = await dependencies.outboxWorker.processOutboxBatch(body.limit ?? 25);
        return res.status(200).json({
          ok: true,
          data: {
            ...result,
            emailMode: dependencies.envStatus.config.emailMode,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/notifications/manual-contact",
    requireAuthenticatedUser,
    requirePermission("reservation.manage"),
    validateBody(manualContactSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof manualContactSchema>;
        const result = await dependencies.manualContact.markGuestContacted(
          {
            userId: principal.userId,
            isSuperAdmin: principal.isSuperAdmin,
            roles: principal.roles,
            branchIds: principal.branchIds,
          },
          body,
        );
        return res.status(201).json({ ok: true, data: result });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.use(
    createAdminStaffAssignmentsRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      staffAssignments: dependencies.staffAssignments,
    }),
  );

  router.use(
    createAdminBookingPolicyRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      bookingPolicy: dependencies.bookingPolicy,
    }),
  );

  router.use(
    createAdminOpeningOperationsRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      openingOperations: dependencies.openingOperations,
    }),
  );

  router.use(
    createAdminOpeningGovernanceRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      openingGovernance: dependencies.openingGovernance,
    }),
  );

  router.use(
    createAdminOpeningDryRunRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      openingDryRun: dependencies.openingDryRun,
    }),
  );

  return router;
}

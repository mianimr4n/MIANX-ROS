import { Router } from "express";
import { z } from "zod";

import { validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNABLE_STAFF_ROLES,
  type StaffAssignmentService,
} from "../../services/staff/assignments.js";

export interface AdminStaffAssignmentsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  staffAssignments: StaffAssignmentService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const branchQuerySchema = z.object({ branchId: z.string().uuid() });

const createAssignmentSchema = z
  .object({
    branchId: z.string().uuid(),
    userId: z.string().uuid(),
    roleCode: z.enum(ASSIGNABLE_STAFF_ROLES as unknown as [string, ...string[]]),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

const statusSchema = z
  .object({
    status: z.enum(ASSIGNMENT_STATUSES as unknown as [string, ...string[]]),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

const notesSchema = z
  .object({
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export function createAdminStaffAssignmentsRouter(
  dependencies: AdminStaffAssignmentsRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );
  const service = dependencies.staffAssignments;

  router.get("/staff/assignments", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listBranchStaff(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/staff/available-users", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listAvailableUsers(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/staff/assignments",
    requireAuthenticatedUser,
    validateBody(createAssignmentSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createAssignmentSchema>;
        const row = await service.createAssignment(principal, body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/staff/assignments/:id/status",
    requireAuthenticatedUser,
    validateBody(statusSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof statusSchema>;
        const row = await service.updateStatus(
          principal,
          req.params.id,
          body.status,
          body.notes,
        );
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/staff/assignments/:id/deactivate",
    requireAuthenticatedUser,
    validateBody(notesSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof notesSchema>;
        const row = await service.deactivate(principal, req.params.id, body.notes);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/staff/assignments/:id/reactivate",
    requireAuthenticatedUser,
    validateBody(notesSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof notesSchema>;
        const row = await service.reactivate(principal, req.params.id, body.notes);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/staff/assignments/:id/history", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const rows = await service.listHistory(scopeFrom(principal), req.params.id);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

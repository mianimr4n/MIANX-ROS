import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import {
  HR_EMPLOYEE_STATUSES,
  type HrEmployeesService,
} from "../../services/hr/employees.js";
import {
  HR_ATTENDANCE_STATUSES,
  HR_DOCUMENT_TYPES,
  HR_LEAVE_TYPES,
  type HrWorkforceService,
} from "../../services/hr/workforce.js";

export interface AdminHrRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  hrEmployees: HrEmployeesService;
  hrWorkforce: HrWorkforceService;
}

function scopeFrom(principal: AuthPrincipal): BranchActorScope {
  return {
    userId: principal.userId,
    isSuperAdmin: principal.isSuperAdmin,
    roles: principal.roles,
    branchIds: principal.branchIds,
  };
}

const listQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

const documentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
});

const createEmployeeSchema = z
  .object({
    branchId: z.string().uuid(),
    fullName: z.string().trim().min(1).max(150),
    email: z.email(),
    phone: z.string().trim().max(40).nullable().optional(),
    role: z.string().trim().min(1).max(150),
    status: z.enum(HR_EMPLOYEE_STATUSES).optional(),
    hiredAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "hiredAt must be YYYY-MM-DD")
      .nullable()
      .optional(),
  })
  .strict();

const createAttendanceSchema = z
  .object({
    employeeId: z.string().uuid(),
    branchId: z.string().uuid(),
    action: z.enum(["check_in", "check_out"]).optional(),
    status: z.enum(HR_ATTENDANCE_STATUSES).optional(),
    checkInTime: z.string().min(1).nullable().optional(),
    checkOutTime: z.string().min(1).nullable().optional(),
  })
  .strict();

const createLeaveSchema = z
  .object({
    employeeId: z.string().uuid(),
    branchId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
    leaveType: z.enum(HR_LEAVE_TYPES),
    reason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const decideLeaveSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
  })
  .strict();

const createDocumentSchema = z
  .object({
    documentType: z.enum(HR_DOCUMENT_TYPES),
    fileUrl: z.string().trim().url().max(2000),
  })
  .strict();

/**
 * HR employee directory + attendance / leave / documents.
 * Gated by hr.manage, staff.manage, or admin.access.
 */
export function createAdminHrRouter(deps: AdminHrRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireHrAccess = requireAnyPermission(["hr.manage", "staff.manage", "admin.access"]);

  router.get(
    "/hr/employees",
    requireAuthenticatedUser,
    requireHrAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid employees query parameters.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.hrEmployees.listEmployees(scopeFrom(principal), parsed.data.branchId);
        return res.json({
          ok: true,
          data,
          meta: { count: data.length },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/employees",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createEmployeeSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createEmployeeSchema>;
        const data = await deps.hrEmployees.createEmployee(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/hr/attendance",
    requireAuthenticatedUser,
    requireHrAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid attendance query parameters.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.hrWorkforce.listAttendance(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/attendance",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createAttendanceSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createAttendanceSchema>;
        const data = await deps.hrWorkforce.createAttendance(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/hr/leaves",
    requireAuthenticatedUser,
    requireHrAccess,
    async (req, res, next) => {
      try {
        const parsed = listQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid leave query parameters.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.hrWorkforce.listLeaves(scopeFrom(principal), parsed.data.branchId);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/leaves",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createLeaveSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createLeaveSchema>;
        const data = await deps.hrWorkforce.createLeave(scopeFrom(principal), body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/hr/leaves/:id",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(decideLeaveSchema),
    async (req, res, next) => {
      try {
        const leaveId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof decideLeaveSchema>;
        const data = await deps.hrWorkforce.decideLeave(scopeFrom(principal), leaveId, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/hr/documents",
    requireAuthenticatedUser,
    requireHrAccess,
    async (req, res, next) => {
      try {
        const parsed = documentsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid documents query parameters.", parsed.error.flatten());
        }
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.hrWorkforce.listDocuments(scopeFrom(principal), parsed.data);
        return res.json({ ok: true, data, meta: { count: data.length } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/employees/:id/documents",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createDocumentSchema),
    async (req, res, next) => {
      try {
        const employeeId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createDocumentSchema>;
        const data = await deps.hrWorkforce.createDocument(scopeFrom(principal), employeeId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

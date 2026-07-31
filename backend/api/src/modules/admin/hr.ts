import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requireAnyPermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import { getRequestId } from "../../observability/index.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AuthPrincipal } from "../../services/auth/principal.js";
import type { BranchActorScope } from "../../services/tables/management.js";
import {
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  type HrEmployeesService,
} from "../../services/hr/employees.js";
import {
  HR_ATTENDANCE_STATUSES,
  HR_DOCUMENT_TYPES,
  HR_LEAVE_TYPES,
  type HrWorkforceService,
} from "../../services/hr/workforce.js";
import { HR_SHIFT_STATUSES, type HrSchedulingService } from "../../services/hr/scheduling.js";
import { HR_SALARY_TYPES, type HrPayrollService } from "../../services/hr/payroll.js";

export interface AdminHrRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  hrEmployees: HrEmployeesService;
  hrWorkforce: HrWorkforceService;
  hrScheduling: HrSchedulingService;
  hrPayroll: HrPayrollService;
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

const correctionsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

const documentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
});

const shiftsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(HR_SHIFT_STATUSES).optional(),
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
    employeeNumber: z.string().trim().max(40).nullable().optional(),
    employmentType: z.enum(HR_EMPLOYMENT_TYPES).nullable().optional(),
    emergencyContactName: z.string().trim().max(150).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

const patchEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(1).max(150).optional(),
    email: z.email().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    role: z.string().trim().min(1).max(150).optional(),
    hiredAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    employeeNumber: z.string().trim().max(40).nullable().optional(),
    employmentType: z.enum(HR_EMPLOYMENT_TYPES).nullable().optional(),
    emergencyContactName: z.string().trim().max(150).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
    branchId: z.string().uuid().optional(),
    transferReason: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict();

const deactivateEmployeeSchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
    status: z.enum(["inactive", "terminated"]).optional(),
  })
  .strict();

const reactivateEmployeeSchema = z
  .object({
    reason: z.string().trim().max(2000).nullable().optional(),
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
    scheduledShiftId: z.string().uuid().nullable().optional(),
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
    rejectionReason: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict();

const cancelLeaveSchema = z
  .object({
    reason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const createDocumentSchema = z
  .object({
    documentType: z.enum(HR_DOCUMENT_TYPES),
    fileUrl: z.string().trim().url().max(2000),
  })
  .strict();

const uploadDocumentSchema = z
  .object({
    documentType: z.enum(HR_DOCUMENT_TYPES),
    dataBase64: z.string().min(1).max(2_500_000),
    contentType: z.string().trim().min(3).max(120),
    originalFilename: z.string().trim().max(200).optional().nullable(),
    title: z.string().trim().max(200).optional().nullable(),
  })
  .strict();

const createCorrectionSchema = z
  .object({
    attendanceId: z.string().uuid(),
    reason: z.string().trim().min(1).max(2000),
    proposedCheckIn: z.string().min(1).nullable().optional(),
    proposedCheckOut: z.string().min(1).nullable().optional(),
    proposedStatus: z.enum(HR_ATTENDANCE_STATUSES).nullable().optional(),
  })
  .strict();

const decideCorrectionSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict();

const createTemplateSchema = z
  .object({
    branchId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    operationalRole: z.string().trim().max(150).nullable().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    breakMinutes: z.number().int().min(0).max(480).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const patchTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    operationalRole: z.string().trim().max(150).nullable().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    breakMinutes: z.number().int().min(0).max(480).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

const createShiftSchema = z
  .object({
    branchId: z.string().uuid(),
    employeeId: z.string().uuid(),
    templateId: z.string().uuid().nullable().optional(),
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    breakMinutes: z.number().int().min(0).max(480).optional(),
    operationalRole: z.string().trim().max(150).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(["draft", "published"]).optional(),
  })
  .strict();

const patchShiftSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).optional(),
    breakMinutes: z.number().int().min(0).max(480).optional(),
    operationalRole: z.string().trim().max(150).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    changeReason: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .strict();

const cancelShiftSchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();

const createCompensationSchema = z
  .object({
    employeeId: z.string().uuid(),
    branchId: z.string().uuid(),
    salaryType: z.enum(HR_SALARY_TYPES),
    baseRate: z.number().min(0),
    currency: z.string().length(3).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .strict();

const createPayPeriodSchema = z
  .object({
    branchId: z.string().uuid(),
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

const createPayrollRunSchema = z
  .object({
    payPeriodId: z.string().uuid(),
  })
  .strict();

/**
 * HR workforce: employees, attendance, leave, shifts, corrections, payroll foundation.
 * Gated by hr.manage, staff.manage, or admin.access.
 */
export function createAdminHrRouter(deps: AdminHrRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireHrAccess = requireAnyPermission(["hr.manage", "staff.manage", "admin.access"]);

  // --- Employees ---
  router.get("/hr/employees", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid employees query parameters.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrEmployees.listEmployees(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/hr/employees/:id", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const employeeId = z.string().uuid().parse(req.params.id);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrEmployees.getEmployee(scopeFrom(principal), employeeId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/employees",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createEmployeeSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createEmployeeSchema>;
        const data = await deps.hrEmployees.createEmployee(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/hr/employees/:id",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(patchEmployeeSchema),
    async (req, res, next) => {
      try {
        const employeeId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof patchEmployeeSchema>;
        const data = await deps.hrEmployees.patchEmployee(
          scopeFrom(principal),
          principal.userId,
          employeeId,
          body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/employees/:id/deactivate",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(deactivateEmployeeSchema),
    async (req, res, next) => {
      try {
        const employeeId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof deactivateEmployeeSchema>;
        const data = await deps.hrEmployees.deactivateEmployee(
          scopeFrom(principal),
          principal.userId,
          employeeId,
          body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/employees/:id/reactivate",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(reactivateEmployeeSchema),
    async (req, res, next) => {
      try {
        const employeeId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof reactivateEmployeeSchema>;
        const data = await deps.hrEmployees.reactivateEmployee(
          scopeFrom(principal),
          principal.userId,
          employeeId,
          body.reason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Attendance ---
  router.get("/hr/attendance", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
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
  });

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

  router.get("/hr/attendance/corrections", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = correctionsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid corrections query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrWorkforce.listCorrections(scopeFrom(principal), parsed.data);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/attendance/corrections",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createCorrectionSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createCorrectionSchema>;
        const data = await deps.hrWorkforce.createCorrection(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/hr/attendance/corrections/:id",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(decideCorrectionSchema),
    async (req, res, next) => {
      try {
        const correctionId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof decideCorrectionSchema>;
        const data = await deps.hrWorkforce.decideCorrection(
          scopeFrom(principal),
          principal.userId,
          correctionId,
          body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Leave ---
  router.get("/hr/leaves", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
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
  });

  router.post(
    "/hr/leaves",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createLeaveSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createLeaveSchema>;
        const data = await deps.hrWorkforce.createLeave(scopeFrom(principal), principal.userId, body);
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
        const data = await deps.hrWorkforce.decideLeave(
          scopeFrom(principal),
          principal.userId,
          leaveId,
          body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/leaves/:id/cancel",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(cancelLeaveSchema),
    async (req, res, next) => {
      try {
        const leaveId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof cancelLeaveSchema>;
        const data = await deps.hrWorkforce.cancelLeave(
          scopeFrom(principal),
          principal.userId,
          leaveId,
          body.reason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Documents ---
  router.get("/hr/documents", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
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
  });

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

  router.post(
    "/hr/employees/:id/documents/upload",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(uploadDocumentSchema),
    async (req, res, next) => {
      try {
        const employeeId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof uploadDocumentSchema>;
        const data = await deps.hrWorkforce.uploadDocumentBinary(
          scopeFrom(principal),
          principal.userId,
          employeeId,
          { ...body, requestId: getRequestId(req) ?? null },
        );
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/hr/documents/:id/download-url",
    requireAuthenticatedUser,
    requireHrAccess,
    async (req, res, next) => {
      try {
        const documentId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const data = await deps.hrWorkforce.createDocumentDownloadUrl(
          scopeFrom(principal),
          principal.userId,
          documentId,
          getRequestId(req) ?? null,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Shift templates ---
  router.get("/hr/shift-templates", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid templates query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrScheduling.listTemplates(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/shift-templates",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createTemplateSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createTemplateSchema>;
        const data = await deps.hrScheduling.createTemplate(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/hr/shift-templates/:id",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(patchTemplateSchema),
    async (req, res, next) => {
      try {
        const templateId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof patchTemplateSchema>;
        const data = await deps.hrScheduling.patchTemplate(
          scopeFrom(principal),
          principal.userId,
          templateId,
          body,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Scheduled shifts ---
  router.get("/hr/shifts", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = shiftsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid shifts query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrScheduling.listShifts(scopeFrom(principal), parsed.data);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/shifts",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createShiftSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createShiftSchema>;
        const data = await deps.hrScheduling.createShift(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/hr/shifts/:id",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(patchShiftSchema),
    async (req, res, next) => {
      try {
        const shiftId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof patchShiftSchema>;
        const data = await deps.hrScheduling.patchShift(scopeFrom(principal), principal.userId, shiftId, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/hr/shifts/:id/publish", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const shiftId = z.string().uuid().parse(req.params.id);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrScheduling.publishShift(scopeFrom(principal), principal.userId, shiftId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/shifts/:id/cancel",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(cancelShiftSchema),
    async (req, res, next) => {
      try {
        const shiftId = z.string().uuid().parse(req.params.id);
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof cancelShiftSchema>;
        const data = await deps.hrScheduling.cancelShift(
          scopeFrom(principal),
          principal.userId,
          shiftId,
          body.reason,
        );
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Metrics / attention ---
  router.get("/hr/metrics", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid metrics query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrWorkforce.getMetrics(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/hr/attention", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid attention query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrWorkforce.getAttention(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  // --- Payroll foundation ---
  router.get("/hr/compensation", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid compensation query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrPayroll.listCompensation(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/compensation",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createCompensationSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createCompensationSchema>;
        const data = await deps.hrPayroll.createCompensation(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/hr/pay-periods", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid pay periods query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrPayroll.listPayPeriods(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/pay-periods",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createPayPeriodSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createPayPeriodSchema>;
        const data = await deps.hrPayroll.createPayPeriod(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/hr/payroll-runs", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid payroll runs query.", parsed.error.flatten());
      }
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrPayroll.listPayrollRuns(scopeFrom(principal), parsed.data.branchId);
      return res.json({ ok: true, data, meta: { count: data.length } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/hr/payroll-runs",
    requireAuthenticatedUser,
    requireHrAccess,
    validateBody(createPayrollRunSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof createPayrollRunSchema>;
        const data = await deps.hrPayroll.createPayrollRun(scopeFrom(principal), principal.userId, body);
        return res.status(201).json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/hr/payroll-runs/:id/calculate", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const runId = z.string().uuid().parse(req.params.id);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrPayroll.calculatePayrollRun(scopeFrom(principal), principal.userId, runId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/hr/payroll-runs/:id/approve", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const runId = z.string().uuid().parse(req.params.id);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrPayroll.approvePayrollRun(scopeFrom(principal), principal.userId, runId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/hr/payroll-runs/:id/lock", requireAuthenticatedUser, requireHrAccess, async (req, res, next) => {
    try {
      const runId = z.string().uuid().parse(req.params.id);
      const principal = (req as AuthorizedRequest).principal!;
      const data = await deps.hrPayroll.lockPayrollRun(scopeFrom(principal), principal.userId, runId);
      return res.json({ ok: true, data });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

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

export interface AdminHrRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  hrEmployees: HrEmployeesService;
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

/**
 * HR employee directory — list + create.
 * Gated by staff.manage or admin.access.
 */
export function createAdminHrRouter(deps: AdminHrRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );
  const requireHrAccess = requireAnyPermission(["staff.manage", "admin.access"]);

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

  return router;
}

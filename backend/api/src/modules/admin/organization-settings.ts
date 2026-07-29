import { Router } from "express";
import { z } from "zod";

import { validateBody } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requirePermission,
  type AuthorizedRequest,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { OrganizationSettingsService } from "../../services/settings/organization.js";

export interface AdminOrganizationSettingsRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  organizationSettings: OrganizationSettingsService;
}

const updateSchema = z
  .object({
    companyName: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().max(150).nullable().optional(),
    address: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one organization field is required.",
  });

export function createAdminOrganizationSettingsRouter(
  deps: AdminOrganizationSettingsRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/settings/organization",
    requireAuthenticatedUser,
    requirePermission("admin.access"),
    async (_req, res, next) => {
      try {
        const data = await deps.organizationSettings.get();
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.put(
    "/settings/organization",
    requireAuthenticatedUser,
    requirePermission("admin.access"),
    validateBody(updateSchema),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const body = req.body as z.infer<typeof updateSchema>;
        const data = await deps.organizationSettings.update(principal, body);
        return res.json({ ok: true, data });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

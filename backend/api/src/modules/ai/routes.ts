import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../../common/http.js";
import {
  createRequireAuthenticatedUser,
  requirePermission,
} from "../../middleware/authorization.js";
import type { AuthTokenVerifier } from "../../middleware/auth.js";
import type { AuthPrincipalRepository } from "../../services/auth/supabase.js";
import type { AiPlatformService } from "../../services/ai/platform.js";

export interface AiRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  aiPlatform: AiPlatformService;
}

const tasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * AI Platform foundation reads.
 * Mutations / execution engines are intentionally out of this slice.
 */
export function createAiRouter(deps: AiRouterDependencies): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    deps.authTokenVerifier,
    deps.authProfileRepository,
  );

  router.get(
    "/teams",
    requireAuthenticatedUser,
    requirePermission("admin.access"),
    async (_req, res, next) => {
      try {
        const data = await deps.aiPlatform.listTeamsWithAgents();
        return res.json({
          ok: true,
          data,
          meta: { count: data.length, agentCount: data.reduce((sum, team) => sum + team.agents.length, 0) },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get(
    "/tasks",
    requireAuthenticatedUser,
    requirePermission("admin.access"),
    async (req, res, next) => {
      try {
        const parsed = tasksQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          throw new ApiError(400, "VALIDATION_ERROR", "Invalid tasks query parameters.", parsed.error.flatten());
        }
        const data = await deps.aiPlatform.listPendingTasks(parsed.data.limit ?? 50);
        return res.json({
          ok: true,
          data,
          meta: { count: data.length, status: "pending" },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

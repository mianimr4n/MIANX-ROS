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
  DRY_RUN_STEPS,
  type OpeningDryRunService,
} from "../../services/opening/dry-run.js";

export interface AdminOpeningDryRunRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  openingDryRun: OpeningDryRunService;
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
const stepCodes = DRY_RUN_STEPS.map((s) => s.code) as [string, ...string[]];

export function createAdminOpeningDryRunRouter(
  dependencies: AdminOpeningDryRunRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );
  const service = dependencies.openingDryRun;

  router.get("/opening/staff-seed/runs", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listStaffSeedRuns(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/staff-seed/simulate-local",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          handoverDir: z.string().trim().min(3).max(500),
          keyDir: z.string().trim().min(3).max(500),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const result = await service.simulateLocalStaffSeed(principal, req.body);
        // Never include plaintext passwords in the response body.
        return res.status(201).json({
          ok: true,
          data: {
            run: result.run,
            accountCount: result.accountCount,
            handoverCipherPath: result.handoverCipherPath,
            keyFilePath: result.keyFilePath,
            passwordsReturned: false,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/staff-seed/:id/request-production-auth",
    requireAuthenticatedUser,
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.requestProductionSeedAuthorization(principal, req.params.id);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/live-config", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listLiveConfigSnapshots(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/live-config/snapshot",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.captureLiveConfigSnapshot(principal, req.body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/dry-runs", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listDryRuns(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/dry-runs",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          seedRunId: z.string().uuid().optional().nullable(),
          liveConfigSnapshotId: z.string().uuid().optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.startDryRun(principal, req.body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/dry-runs/:id/steps",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          stepCode: z.enum(stepCodes),
          stepStatus: z.enum(["PASSED", "FAILED", "SKIPPED"]),
          evidenceSummary: z.string().trim().max(2000).optional().nullable(),
          screenshotHash: z.string().trim().max(128).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.recordDryRunStep(principal, req.params.id, {
          stepCode: req.body.stepCode,
          stepStatus: req.body.stepStatus,
          evidenceSummary: req.body.evidenceSummary,
          screenshotHash: req.body.screenshotHash,
        });
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/dry-runs/:id/complete",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          readinessPercentage: z.number().min(0).max(100).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.completeDryRunSimulation(principal, req.params.id, req.body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/dry-runs/:id/founder-decision",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          decision: z.enum(["GO", "NO_GO", "REVIEW_REQUIRED"]),
          notes: z.string().trim().max(4000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.recordDryRunFounderDecision(principal, req.params.id, req.body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/dry-runs/:id/evidence", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.getDryRunEvidence(scopeFrom(principal), req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

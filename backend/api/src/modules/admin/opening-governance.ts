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
  CANONICAL_ROLE_CODES,
  FOUNDER_DECISIONS,
  ROLE_REHEARSAL_CODES,
  SOP_CODES,
  TRAINING_CODES,
  type OpeningGovernanceService,
} from "../../services/opening/governance.js";

export interface AdminOpeningGovernanceRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  authProfileRepository: AuthPrincipalRepository;
  openingGovernance: OpeningGovernanceService;
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

export function createAdminOpeningGovernanceRouter(
  dependencies: AdminOpeningGovernanceRouterDependencies,
): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireAuthenticatedUser(
    dependencies.authTokenVerifier,
    dependencies.authProfileRepository,
  );
  const service = dependencies.openingGovernance;

  // ---- SOPs ----
  router.get("/opening/sops", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listSops(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/sops",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          id: z.string().uuid().optional(),
          branchId: z.string().uuid(),
          sopCode: z.enum(SOP_CODES),
          documentReference: z.string().trim().max(500).optional().nullable(),
          documentVersion: z.string().trim().max(80).optional().nullable(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.upsertSop(principal, req.body);
        return res.status(req.body.id ? 200 : 201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/opening/sops/:id/review", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
      const row = await service.reviewSop(principal, req.params.id, notes);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/opening/sops/:id/approve", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
      const row = await service.approveSop(principal, req.params.id, notes);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/sops/:id/fail",
    requireAuthenticatedUser,
    validateBody(z.object({ reason: z.string().trim().min(1).max(2000) }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.failSop(principal, req.params.id, req.body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/sops/:id/verify-operational",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          summary: z.string().trim().min(1).max(2000),
          evidenceType: z.string().optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.verifySopOperational(principal, req.params.id, req.body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/opening/sops/:id/expire", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const row = await service.expireSop(principal, req.params.id);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/opening/sops/:id/history", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const rows = await service.getSopHistory(scopeFrom(principal), req.params.id);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  // ---- Training ----
  router.get("/opening/training", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listTraining(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/training",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          id: z.string().uuid().optional(),
          branchId: z.string().uuid(),
          trainingCode: z.enum(TRAINING_CODES),
          title: z.string().trim().min(1).max(200),
          scheduledAt: z.string().datetime().optional().nullable(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.upsertTraining(principal, req.body);
        return res.status(req.body.id ? 200 : 201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/training/:id/participants",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          userId: z.string().uuid(),
          roleCode: z.enum(CANONICAL_ROLE_CODES),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.addTrainingParticipant(principal, req.params.id, req.body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/training/participants/:id/attendance",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          status: z.enum(["INVITED", "CONFIRMED", "ATTENDED", "ABSENT", "EXCUSED"]),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.recordAttendance(principal, req.params.id, req.body.status);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/training/participants/:id/assessment",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          result: z.enum(["NOT_ASSESSED", "PASS", "CONDITIONAL_PASS", "FAIL"]),
          notes: z.string().trim().max(2000).optional(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.recordAssessment(
          principal,
          req.params.id,
          req.body.result,
          req.body.notes,
        );
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/training/:id/complete",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          result: z.enum(["PASS", "CONDITIONAL_PASS", "FAIL"]).optional(),
          localTestOnly: z.boolean().optional(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.completeTraining(principal, req.params.id, req.body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/training/:id/fail",
    requireAuthenticatedUser,
    validateBody(z.object({ reason: z.string().trim().min(1).max(2000) }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.failTraining(principal, req.params.id, req.body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/training/participants/:id/remediation",
    requireAuthenticatedUser,
    validateBody(z.object({ dueAt: z.string().datetime() }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.scheduleRemediation(principal, req.params.id, req.body.dueAt);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.get("/opening/training/:id/history", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const rows = await service.getTrainingHistory(scopeFrom(principal), req.params.id);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  // ---- Role rehearsals ----
  router.get("/opening/role-rehearsals", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listRoleRehearsals(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/role-rehearsals",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          id: z.string().uuid().optional(),
          branchId: z.string().uuid(),
          rehearsalCode: z.enum(ROLE_REHEARSAL_CODES),
          scenario: z.string().trim().min(1).max(2000),
          scheduledAt: z.string().datetime().optional().nullable(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.upsertRoleRehearsal(principal, req.body);
        return res.status(req.body.id ? 200 : 201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/role-rehearsals/:id/complete",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          result: z.enum(["PASS", "CONDITIONAL_PASS", "FAIL"]).optional(),
          localTestOnly: z.boolean().optional(),
          notes: z.string().trim().max(2000).optional().nullable(),
          issuesFound: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.completeRoleRehearsal(principal, req.params.id, req.body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/role-rehearsals/:id/fail",
    requireAuthenticatedUser,
    validateBody(z.object({ reason: z.string().trim().min(1).max(2000) }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.failRoleRehearsal(principal, req.params.id, req.body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/role-rehearsals/:id/retest",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          dueAt: z.string().datetime().optional(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.retestRoleRehearsal(
          principal,
          req.params.id,
          req.body.notes ?? null,
          req.body.dueAt,
        );
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  // ---- E2E ----
  router.get("/opening/e2e-rehearsals", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listE2eRehearsals(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/e2e-rehearsals",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          scheduledAt: z.string().datetime().optional().nullable(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.scheduleE2eRehearsal(principal, req.body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/e2e-rehearsals/:id/complete",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          result: z.enum(["PASS", "CONDITIONAL_PASS", "FAIL"]).optional(),
          localTestOnly: z.boolean().optional(),
          stagesCompleted: z.array(z.string()).optional(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.completeE2eRehearsal(principal, req.params.id, req.body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/opening/e2e-rehearsals/:id/fail",
    requireAuthenticatedUser,
    validateBody(z.object({ reason: z.string().trim().min(1).max(2000) }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.failE2eRehearsal(principal, req.params.id, req.body.reason);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  // ---- Founder decisions ----
  router.get("/opening/founder-decisions", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const rows = await service.listFounderDecisions(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: rows });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/founder-decisions",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          decision: z.enum(FOUNDER_DECISIONS),
          decisionNotes: z.string().trim().max(4000).optional().nullable(),
          conditions: z.string().trim().max(4000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.recordFounderDecision(principal, req.body);
        return res.status(201).json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  // ---- Owner handover ----
  router.get("/opening/owner-handover", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const query = branchQuerySchema.parse(req.query);
      const row = await service.getOwnerHandover(scopeFrom(principal), query.branchId);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.put(
    "/opening/owner-handover",
    requireAuthenticatedUser,
    validateBody(
      z
        .object({
          branchId: z.string().uuid(),
          intendedOwnerName: z.string().trim().max(200).optional().nullable(),
          intendedOwnerContactReference: z.string().trim().max(500).optional().nullable(),
          handoverScope: z.string().trim().max(2000).optional().nullable(),
          operationalDocumentsReviewed: z.boolean().optional(),
          financialProcedureReviewed: z.boolean().optional(),
          staffStructureReviewed: z.boolean().optional(),
          deviceInventoryReviewed: z.boolean().optional(),
          unresolvedItems: z.string().trim().max(4000).optional().nullable(),
          notes: z.string().trim().max(2000).optional().nullable(),
        })
        .strict(),
    ),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const row = await service.upsertOwnerHandover(principal, req.body);
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/opening/owner-handover/:branchId/submit", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const branchId = z.string().uuid().parse(req.params.branchId);
      const row = await service.submitOwnerHandoverReview(principal, branchId);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/opening/owner-handover/:branchId/ready", requireAuthenticatedUser, async (req, res, next) => {
    try {
      const principal = (req as AuthorizedRequest).principal!;
      const branchId = z.string().uuid().parse(req.params.branchId);
      const row = await service.markOwnerHandoverReady(principal, branchId);
      return res.json({ ok: true, data: row });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/opening/owner-handover/:branchId/accept",
    requireAuthenticatedUser,
    validateBody(z.object({ acceptedByReference: z.string().trim().min(1).max(200) }).strict()),
    async (req, res, next) => {
      try {
        const principal = (req as AuthorizedRequest).principal!;
        const branchId = z.string().uuid().parse(req.params.branchId);
        const row = await service.acceptOwnerHandover(
          principal,
          branchId,
          req.body.acceptedByReference,
        );
        return res.json({ ok: true, data: row });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

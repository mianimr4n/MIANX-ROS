import { Router } from "express";
import { z } from "zod";

import { sendNotImplemented, validateBody } from "../../common/http.js";
import { mapCatalogError } from "../../services/catalog/errors.js";
import type { CatalogDataSource } from "../../services/catalog/types.js";

const resolveBranchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export function createBranchesRouter(catalogDataSource: CatalogDataSource) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const branches = await catalogDataSource.listBranches();

      res.json({
        ok: true,
        data: branches,
        meta: {
          source: "supabase",
          module: "branches",
          count: branches.length,
        },
      });
    } catch (error) {
      next(mapCatalogError(error, "Branches"));
    }
  });

  router.post("/resolve", validateBody(resolveBranchSchema), (_req, res) =>
    sendNotImplemented(res, "Branch routing", ["branch.read"]),
  );

  return router;
}

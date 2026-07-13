import { Router } from "express";
import { z } from "zod";

import { sendNotImplemented, validateBody } from "../../common/http.js";

const resolveBranchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export function createBranchesRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      ok: true,
      data: [],
      meta: {
        source: "supabase-pending",
        module: "branches",
      },
    });
  });

  router.post("/resolve", validateBody(resolveBranchSchema), (_req, res) =>
    sendNotImplemented(res, "Branch routing", ["branch.read"]),
  );

  return router;
}

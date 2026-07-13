import { Router } from "express";
import { z } from "zod";

import { requireRole, sendNotImplemented, validateBody } from "../../common/http.js";

const assignmentStatusSchema = z.object({
  status: z.enum(["accepted", "picked-up", "delivered"]),
  notes: z.string().max(250).optional(),
});

export function createRidersRouter() {
  const router = Router();

  router.get("/assignments", requireRole(["admin", "branch-manager", "rider"]), (_req, res) =>
    sendNotImplemented(res, "Rider assignment list", ["delivery.read"]),
  );

  router.post(
    "/deliveries/:deliveryId/status",
    requireRole(["rider"]),
    validateBody(assignmentStatusSchema),
    (_req, res) => sendNotImplemented(res, "Rider delivery status updates", ["delivery.update"]),
  );

  return router;
}

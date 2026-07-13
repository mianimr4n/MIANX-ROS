import { Router } from "express";

import { requireRole, sendNotImplemented } from "../../common/http.js";

export function createAdminRouter() {
  const router = Router();

  router.get("/controls", requireRole(["admin", "super-admin"]), (_req, res) =>
    sendNotImplemented(res, "Admin controls", ["admin.access"]),
  );

  return router;
}

import { Router } from "express";
import { z } from "zod";

import { sendNotImplemented, validateBody } from "../../common/http.js";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export function createAuthRouter() {
  const router = Router();

  router.post("/login", validateBody(loginSchema), (_req, res) =>
    sendNotImplemented(res, "Authentication login", ["auth.login"]),
  );

  router.post("/refresh", validateBody(refreshSchema), (_req, res) =>
    sendNotImplemented(res, "Authentication token refresh", ["auth.refresh"]),
  );

  return router;
}

import { Router } from "express";

export function createMenuRouter() {
  const router = Router();

  router.get("/catalog", (_req, res) => {
    res.json({
      ok: true,
      data: {
        categories: [],
        items: [],
        variants: [],
      },
      meta: {
        source: "supabase-pending",
        module: "menu",
      },
    });
  });

  return router;
}

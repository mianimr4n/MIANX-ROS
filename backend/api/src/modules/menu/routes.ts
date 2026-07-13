import { Router } from "express";

import { mapCatalogError } from "../../services/catalog/errors.js";
import type { CatalogDataSource } from "../../services/catalog/types.js";

export function createMenuRouter(catalogDataSource: CatalogDataSource) {
  const router = Router();

  router.get("/catalog", async (_req, res, next) => {
    try {
      const catalog = await catalogDataSource.getMenuCatalog();

      res.json({
        ok: true,
        data: catalog,
        meta: {
          source: "supabase",
          module: "menu",
          categoryCount: catalog.categories.length,
          itemCount: catalog.items.length,
        },
      });
    } catch (error) {
      next(mapCatalogError(error, "Menu catalog"));
    }
  });

  return router;
}

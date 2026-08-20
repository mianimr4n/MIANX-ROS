import { Router } from "express";

import { mapCatalogError } from "../../services/catalog/errors.js";
import type { CatalogDataSource } from "../../services/catalog/types.js";

/**
 * Public, unauthenticated brand config endpoint — powers
 * apps/website/client/src/lib/brand.ts. See MIANX-ROS-01/02 migrations
 * and services/catalog/types.ts BrandConfig for the shape.
 */
export function createBrandRouter(catalogDataSource: CatalogDataSource) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const brand = await catalogDataSource.getBrandConfig();

      res.json({
        ok: true,
        data: brand,
        meta: {
          source: "supabase",
          module: "brand",
        },
      });
    } catch (error) {
      next(mapCatalogError(error, "Brand config"));
    }
  });

  return router;
}

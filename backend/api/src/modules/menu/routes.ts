import { Router } from "express";

import { mapCatalogError } from "../../services/catalog/errors.js";
import type { CatalogDataSource } from "../../services/catalog/types.js";

export function createMenuRouter(catalogDataSource: CatalogDataSource) {
  const router = Router();

  router.get("/catalog", async (_req, res, next) => {
    try {
      const catalog = await catalogDataSource.getMenuCatalog();

      const productGroupCount = catalog.categories.reduce(
        (sum, category) => sum + category.items.length,
        0,
      );

      res.json({
        ok: true,
        data: catalog,
        meta: {
          source: "supabase",
          module: "menu",
          contract: "canonical-single-price-v1",
          categoryCount: catalog.categories.length,
          productGroupCount,
          skuCount: catalog.skus.length,
          toppingCount: catalog.toppings.length,
          dealCount: catalog.skus.filter((sku) => sku.productType === "deal").length,
        },
      });
    } catch (error) {
      next(mapCatalogError(error, "Menu catalog"));
    }
  });

  return router;
}

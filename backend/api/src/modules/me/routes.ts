import { Router } from "express";
import { z } from "zod";

import { ApiError, validateBody } from "../../common/http.js";
import {
  createRequireAuth,
  type AuthenticatedRequest,
  type AuthTokenVerifier,
} from "../../middleware/auth.js";
import type { CustomerAddressesDataSource } from "../../services/addresses/customer-addresses.js";
import type { CustomerOrdersDataSource } from "../../services/orders/customer-history.js";
import type { CustomerFavoritesDataSource } from "../../services/favorites/customer-favorites.js";
import type { CustomerReviewsDataSource } from "../../services/reviews/customer-reviews.js";

const labelSchema = z.enum(["Home", "Office", "Other"]);

const addressBodySchema = z
  .object({
    label: labelSchema,
    recipientName: z.string().trim().min(1).max(150),
    phone: z.string().trim().min(7).max(30),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    landmark: z.string().trim().max(200).optional(),
    area: z.string().trim().max(120).optional(),
    city: z.string().trim().max(80).optional(),
    deliveryZone: z.string().trim().max(120).optional(),
    preferredBranchId: z.union([z.string().min(1).max(80), z.null()]).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

const importBodySchema = z
  .object({
    drafts: z
      .array(
        addressBodySchema.extend({
          draftKey: z.string().trim().max(80).optional(),
        }),
      )
      .min(1)
      .max(20),
  })
  .strict();

const reviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();

export interface MeRouterDependencies {
  authTokenVerifier: AuthTokenVerifier;
  customerAddresses: CustomerAddressesDataSource;
  customerOrders: CustomerOrdersDataSource;
  customerFavorites: CustomerFavoritesDataSource;
  customerReviews: CustomerReviewsDataSource;
}

export function createMeRouter(dependencies: MeRouterDependencies) {
  const router = Router();
  const requireAuth = createRequireAuth(dependencies.authTokenVerifier);

  // --- Addresses (CP-1) ---
  router.get("/addresses", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const addresses = await dependencies.customerAddresses.listAddresses(auth.authUserId);
      return res.json({ ok: true, data: { addresses } });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/addresses", requireAuth, validateBody(addressBodySchema), async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const body = req.body as z.infer<typeof addressBodySchema>;
      const address = await dependencies.customerAddresses.createAddress(auth.authUserId, body);
      return res.status(201).json({ ok: true, data: { address } });
    } catch (error) {
      return next(error);
    }
  });

  router.patch(
    "/addresses/:id",
    requireAuth,
    validateBody(addressBodySchema),
    async (req, res, next) => {
      try {
        const auth = (req as AuthenticatedRequest).auth!;
        const address = await dependencies.customerAddresses.updateAddress(
          auth.authUserId,
          String(req.params.id ?? ""),
          req.body as z.infer<typeof addressBodySchema>,
        );
        return res.json({ ok: true, data: { address } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.delete("/addresses/:id", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const address = await dependencies.customerAddresses.archiveAddress(
        auth.authUserId,
        String(req.params.id ?? ""),
      );
      return res.json({ ok: true, data: { address } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/addresses/import",
    requireAuth,
    validateBody(importBodySchema),
    async (req, res, next) => {
      try {
        const auth = (req as AuthenticatedRequest).auth!;
        const body = req.body as z.infer<typeof importBodySchema>;
        const result = await dependencies.customerAddresses.importAddresses(
          auth.authUserId,
          body.drafts,
        );
        return res.json({
          ok: true,
          data: {
            imported: result.imported,
            skipped: result.skipped,
            importedCount: result.imported.length,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  // --- Orders (CP-2) ---
  router.get("/orders", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const limitRaw = Number(req.query.limit ?? 20);
      const offsetRaw = Number(req.query.offset ?? 0);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;
      const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const result = await dependencies.customerOrders.listOrders(auth.authUserId, {
        limit,
        offset,
        status,
      });
      return res.json({
        ok: true,
        data: {
          orders: result.orders,
          pagination: { limit, offset, total: result.total, returned: result.orders.length },
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/orders/:orderNumber", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const orderNumber = String(req.params.orderNumber ?? "").trim();
      if (!orderNumber) throw new ApiError(400, "VALIDATION_ERROR", "Order number required.");
      const order = await dependencies.customerOrders.getOrder(auth.authUserId, orderNumber);
      return res.json({ ok: true, data: { order } });
    } catch (error) {
      return next(error);
    }
  });

  // --- Favorites (CP-5) ---
  router.get("/favorites", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const favorites = await dependencies.customerFavorites.listFavorites(auth.authUserId);
      return res.json({ ok: true, data: { favorites } });
    } catch (error) {
      return next(error);
    }
  });

  router.put("/favorites/:itemCode", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const favorite = await dependencies.customerFavorites.addFavorite(
        auth.authUserId,
        String(req.params.itemCode ?? ""),
      );
      return res.json({ ok: true, data: { favorite } });
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/favorites/:itemCode", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      await dependencies.customerFavorites.removeFavorite(
        auth.authUserId,
        String(req.params.itemCode ?? ""),
      );
      return res.json({ ok: true, data: { removed: true } });
    } catch (error) {
      return next(error);
    }
  });

  // --- Reviews (CP-6) ---
  router.get("/reviews", requireAuth, async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const reviews = await dependencies.customerReviews.listReviews(auth.authUserId);
      return res.json({ ok: true, data: { reviews } });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/orders/:orderNumber/review",
    requireAuth,
    validateBody(reviewBodySchema),
    async (req, res, next) => {
      try {
        const auth = (req as AuthenticatedRequest).auth!;
        const review = await dependencies.customerReviews.createReview(
          auth.authUserId,
          String(req.params.orderNumber ?? ""),
          req.body as z.infer<typeof reviewBodySchema>,
        );
        return res.status(201).json({ ok: true, data: { review } });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.patch(
    "/orders/:orderNumber/review",
    requireAuth,
    validateBody(reviewBodySchema),
    async (req, res, next) => {
      try {
        const auth = (req as AuthenticatedRequest).auth!;
        const review = await dependencies.customerReviews.updateReview(
          auth.authUserId,
          String(req.params.orderNumber ?? ""),
          req.body as z.infer<typeof reviewBodySchema>,
        );
        return res.json({ ok: true, data: { review } });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

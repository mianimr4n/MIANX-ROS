import type { Express } from "express";

import type { AppDependencies } from "../app-dependencies.js";
import { createAdminRouter } from "./admin/routes.js";
import { createAuthRouter } from "./auth/routes.js";
import { createBranchesRouter } from "./branches/routes.js";
import { createDineInRouter } from "./dine-in/routes.js";
import { createKitchenRouter } from "./kitchen/routes.js";
import { createMeRouter } from "./me/routes.js";
import { createMenuRouter } from "./menu/routes.js";
import { createOrdersRouter } from "./orders/routes.js";
import { createPublicBookingRouter } from "./public-booking/routes.js";
import { createRidersRouter } from "./riders/routes.js";

export interface ApiModuleDescriptor {
  name: string;
  basePath: string;
  summary: string;
}

export const apiModules: ApiModuleDescriptor[] = [
  {
    name: "auth",
    basePath: "/api/v1/auth",
    summary: "Supabase Auth session verification, /me principal, staff invite accept, and authorization foundation.",
  },
  {
    name: "me",
    basePath: "/api/v1/me",
    summary: "Authenticated customer self-service (addresses, orders, favorites, reviews).",
  },
  {
    name: "branches",
    basePath: "/api/v1/branches",
    summary: "Branch lookup and routing.",
  },
  {
    name: "menu",
    basePath: "/api/v1/menu",
    summary: "Category, item, and variant catalog APIs.",
  },
  {
    name: "orders",
    basePath: "/api/v1/orders",
    summary: "Cart, checkout, and tracking APIs.",
  },
  {
    name: "dine-in",
    basePath: "/api/v1/dine-in",
    summary: "Public dine-in session resolve (table QR) and session state by public token.",
  },
  {
    name: "reservations",
    basePath: "/api/v1/reservations",
    summary: "Public restaurant reservation booking, availability, cancel, and status (rate-limited).",
  },
  {
    name: "kitchen",
    basePath: "/api/v1/kitchen",
    summary: "Kitchen tickets queue and status transitions (DB-R5 foundation).",
  },
  {
    name: "riders",
    basePath: "/api/v1/riders",
    summary: "Sprint 4.6 rider roster, assignment, and delivery status with order mirror.",
  },
  {
    name: "admin",
    basePath: "/api/v1/admin",
    summary: "Administrative controls, staff invites, restaurant tables, dine-in bills, and dashboards.",
  },
];

export function registerApiModules(app: Express, dependencies: AppDependencies) {
  app.use(
    "/api/v1/auth",
    createAuthRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      staffInviteRepository: dependencies.staffInviteRepository,
    }),
  );
  app.use(
    "/api/v1/me",
    createMeRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      customerAddresses: dependencies.customerAddresses,
      customerOrders: dependencies.customerOrders,
      customerFavorites: dependencies.customerFavorites,
      customerReviews: dependencies.customerReviews,
    }),
  );
  app.use("/api/v1/branches", createBranchesRouter(dependencies.catalogDataSource));
  app.use("/api/v1/menu", createMenuRouter(dependencies.catalogDataSource));
  app.use(
    "/api/v1/orders",
    createOrdersRouter(dependencies.ordersDataSource, dependencies.authTokenVerifier),
  );
  app.use(
    "/api/v1/dine-in",
    createDineInRouter({
      dineInSessions: dependencies.dineInSessions,
    }),
  );
  app.use(
    "/api/v1/reservations",
    createPublicBookingRouter({
      publicBooking: dependencies.publicBooking,
    }),
  );
  app.use(
    "/api/v1/kitchen",
    createKitchenRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      kitchenTickets: dependencies.kitchenTickets,
    }),
  );
  app.use(
    "/api/v1/riders",
    createRidersRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      deliveryOperations: dependencies.deliveryOperations,
    }),
  );
  app.use(
    "/api/v1/admin",
    createAdminRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
      staffInviteRepository: dependencies.staffInviteRepository,
      branchOrderManagement: dependencies.branchOrderManagement,
      restaurantTables: dependencies.restaurantTables,
      restaurantBills: dependencies.restaurantBills,
      ordersDataSource: dependencies.ordersDataSource,
      floorConfiguration: dependencies.floorConfiguration,
      menuManagement: dependencies.menuManagement,
      reservations: dependencies.reservations,
      tableService: dependencies.tableService,
      paymentSettlement: dependencies.paymentSettlement,
      deposits: dependencies.deposits,
      outboxWorker: dependencies.outboxWorker,
      manualContact: dependencies.manualContact,
      envStatus: dependencies.envStatus,
      inviteAppOrigin: dependencies.inviteAppOrigin,
    }),
  );
}

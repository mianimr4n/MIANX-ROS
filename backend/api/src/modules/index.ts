import type { Express } from "express";

import type { AppDependencies } from "../app-dependencies.js";
import { createAdminRouter } from "./admin/routes.js";
import { createAuthRouter } from "./auth/routes.js";
import { createBranchesRouter } from "./branches/routes.js";
import { createMenuRouter } from "./menu/routes.js";
import { createOrdersRouter } from "./orders/routes.js";
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
    summary: "Supabase Auth session verification and customer /me profile.",
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
    name: "riders",
    basePath: "/api/v1/riders",
    summary: "Rider assignment and delivery workflows.",
  },
  {
    name: "admin",
    basePath: "/api/v1/admin",
    summary: "Administrative controls and dashboards.",
  },
];

export function registerApiModules(app: Express, dependencies: AppDependencies) {
  app.use(
    "/api/v1/auth",
    createAuthRouter({
      authTokenVerifier: dependencies.authTokenVerifier,
      authProfileRepository: dependencies.authProfileRepository,
    }),
  );
  app.use("/api/v1/branches", createBranchesRouter(dependencies.catalogDataSource));
  app.use("/api/v1/menu", createMenuRouter(dependencies.catalogDataSource));
  app.use("/api/v1/orders", createOrdersRouter(dependencies.ordersDataSource));
  app.use("/api/v1/riders", createRidersRouter());
  app.use("/api/v1/admin", createAdminRouter());
}

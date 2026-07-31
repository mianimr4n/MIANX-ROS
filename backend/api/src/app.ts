import cors from "cors";
import express from "express";
import helmet from "helmet";

import { createAppDependencies, type AppDependencies } from "./app-dependencies.js";
import { errorHandler, notFoundHandler } from "./common/http.js";
import { getEnvironmentStatus } from "./config/env.js";
import { apiModules, registerApiModules } from "./modules/index.js";
import {
  buildHealthDiagnostics,
  buildVersionPayload,
  createApmFromEnv,
  createRequestLoggingMiddleware,
  probeSupabaseConnectivity,
  setApm,
} from "./observability/index.js";

export function createApp(
  sourceEnv: NodeJS.ProcessEnv = process.env,
  dependencyOverrides: Partial<AppDependencies> = {},
) {
  const envStatus = getEnvironmentStatus(sourceEnv);
  const dependencies: AppDependencies = {
    ...createAppDependencies(envStatus),
    ...dependencyOverrides,
  };
  const app = express();

  setApm(createApmFromEnv(sourceEnv));

  // Render (and similar) sit behind a single reverse proxy — needed for accurate req.ip.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: envStatus.config.corsOrigin,
      exposedHeaders: ["X-Request-ID"],
    }),
  );
  // Request ID + structured access logs (before body parsers so all requests are covered).
  app.use(createRequestLoggingMiddleware());
  // 2mb covers admin menu JPG/PNG uploads (base64) without opening unbounded payloads.
  app.use(express.json({ limit: "2mb" }));

  app.get("/healthz", async (_req, res) => {
    const dbConnectivity = await probeSupabaseConnectivity(envStatus.config.supabaseUrl);
    const diagnostics = buildHealthDiagnostics(envStatus, { dbConnectivity, env: sourceEnv });
    res.json({
      ...diagnostics,
      modules: apiModules,
    });
  });

  app.get("/readyz", async (_req, res) => {
    const statusCode = envStatus.isReady ? 200 : 503;
    const runtime = buildVersionPayload(envStatus, sourceEnv);
    const dbConnectivity = envStatus.isReady
      ? await probeSupabaseConnectivity(envStatus.config.supabaseUrl)
      : ("skipped" as const);

    res.status(statusCode).json({
      ok: envStatus.isReady,
      config: {
        port: envStatus.config.port,
        corsOrigin: envStatus.config.corsOrigin,
        supabaseUrl: envStatus.config.supabaseUrl,
        envClass: envStatus.config.envClass,
        integrations: {
          email: envStatus.config.emailMode,
          whatsapp: envStatus.config.whatsappMode,
          payment: envStatus.config.paymentMode,
          webhook: envStatus.config.webhookMode,
        },
      },
      runtime: {
        version: runtime.version,
        gitSha: runtime.gitSha,
        nodeVersion: runtime.nodeVersion,
        uptimeSeconds: runtime.uptimeSeconds,
        startedAt: runtime.startedAt,
      },
      database: {
        connectivity: dbConnectivity,
      },
      migrations: {
        status: "unavailable",
        note: "Use Supabase CLI migration list for tip verification.",
      },
      safetyBlockers: envStatus.safetyBlockers,
      issues: envStatus.issues,
    });
  });

  app.get("/api/v1/meta/modules", (_req, res) => {
    res.json({
      ok: true,
      data: apiModules,
    });
  });

  app.get("/api/v1/meta/version", (_req, res) => {
    res.json(buildVersionPayload(envStatus, sourceEnv));
  });

  registerApiModules(app, dependencies);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    envStatus,
  };
}

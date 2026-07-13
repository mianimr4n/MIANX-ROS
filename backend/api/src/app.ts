import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler, notFoundHandler } from "./common/http.js";
import { getEnvironmentStatus } from "./config/env.js";
import { apiModules, registerApiModules } from "./modules/index.js";

export function createApp(sourceEnv: NodeJS.ProcessEnv = process.env) {
  const envStatus = getEnvironmentStatus(sourceEnv);
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: envStatus.config.corsOrigin,
    }),
  );
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "telepizza-api",
      modules: apiModules,
    });
  });

  app.get("/readyz", (_req, res) => {
    const statusCode = envStatus.isReady ? 200 : 503;

    res.status(statusCode).json({
      ok: envStatus.isReady,
      config: {
        port: envStatus.config.port,
        corsOrigin: envStatus.config.corsOrigin,
        supabaseUrl: envStatus.config.supabaseUrl,
      },
      issues: envStatus.issues,
    });
  });

  app.get("/api/v1/meta/modules", (_req, res) => {
    res.json({
      ok: true,
      data: apiModules,
    });
  });

  registerApiModules(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    envStatus,
  };
}

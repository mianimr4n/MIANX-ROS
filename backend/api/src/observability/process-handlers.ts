import type { Logger } from "./logger.js";
import { defaultLogger } from "./logger.js";
import { getApm } from "./apm.js";

let installed = false;

/** Idempotent process-level handlers for uncaught errors (logs only; does not change business logic). */
export function installProcessErrorHandlers(logger: Logger = defaultLogger): void {
  if (installed) return;
  installed = true;

  process.on("uncaughtException", (error) => {
    logger.error("uncaught_exception", {
      errorClass: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
    getApm().captureException(error, { kind: "uncaughtException" });
  });

  process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const errorClass = reason instanceof Error ? reason.name : "UnhandledRejection";
    logger.error("unhandled_rejection", {
      errorClass,
      message,
      stack: process.env.NODE_ENV === "production" || !(reason instanceof Error) ? undefined : reason.stack,
    });
    getApm().captureException(reason, { kind: "unhandledRejection" });
  });
}

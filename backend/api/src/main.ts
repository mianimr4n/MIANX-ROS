import { createApp } from "./app.js";
import { defaultLogger, installProcessErrorHandlers } from "./observability/index.js";
import { startNotificationWorker } from "./services/notifications/outbox-worker.js";
import { startInboundWorker } from "./services/whatsapp/inbound-worker.js";
import { startWhatsAppOutboxWorker } from "./services/whatsapp/outbox-worker.js";
import { startWhatsAppPiiAnonymizationJob } from "./services/whatsapp/pii-anonymization.js";
import { startRiderLocationTtlJob } from "./services/deliveries/rider-location-ttl.js";

installProcessErrorHandlers(defaultLogger);

const { app, envStatus, dependencies } = createApp();
const isProduction = process.env.NODE_ENV === "production";

if (envStatus.safetyBlockers.length > 0) {
  console.error("");
  console.error("═══════════════════════════════════════════════════════════");
  console.error(" TELEPIZZA API REFUSED TO START — UNSAFE ENVIRONMENT");
  console.error("═══════════════════════════════════════════════════════════");
  console.error(` Environment class: ${envStatus.config.envClass}`);
  console.error(" Expected local target: http://127.0.0.1:54321");
  console.error(" Secret values are never printed.");
  console.error("");
  for (const issue of envStatus.safetyBlockers) {
    console.error(` • ${issue.key}: ${issue.message}`);
  }
  console.error("");
  console.error(" Fix: point SUPABASE_URL at local Supabase, set TELEPIZZA_ENV=local,");
  console.error(" or use write-local-env-from-supabase.mjs after `npx supabase start`.");
  console.error("═══════════════════════════════════════════════════════════");
  console.error("");
  process.exit(1);
}

if (!envStatus.isReady) {
  if (isProduction) {
    console.error("API environment is not ready. Refusing to start in production.");
    for (const issue of envStatus.issues) {
      console.error(`${issue.key}: ${issue.message}`);
    }
    process.exit(1);
  }

  console.warn("API environment is not ready. /readyz will report configuration issues.");
}

app.listen(envStatus.config.port, () => {
  console.log(
    `Telepizza API listening on port ${envStatus.config.port} [${envStatus.config.envClass}] supabase=${envStatus.config.supabaseUrl}`,
  );
  console.log(
    `Integrations: email=${envStatus.config.emailMode} whatsapp=${envStatus.config.whatsappMode} payment=${envStatus.config.paymentMode} webhook=${envStatus.config.webhookMode}`,
  );

  // Start notification outbox worker for mock|sandbox (not production unless TELEPIZZA_NOTIFICATION_WORKER=1).
  startNotificationWorker(envStatus, 15_000);

  // Start WhatsApp inbound worker — drains whatsapp_inbound_events queue into
  // whatsapp_messages + whatsapp_conversations (ADR-004 §7). Same lifecycle
  // rules as the notification worker: not in production unless
  // TELEPIZZA_WHATSAPP_WORKER=1.
  startInboundWorker(envStatus, dependencies.whatsappAdapter, 10_000);

  // Start WhatsApp outbound outbox worker — drains pending outbound
  // whatsapp_messages rows, calls the provider adapter, updates delivery_status
  // (ADR-004 §5, §8). Same lifecycle rules as the inbound worker.
  startWhatsAppOutboxWorker(envStatus, dependencies.whatsappAdapter, 15_000);

  // Start WhatsApp 24-month PII anonymization job (ADR-004 §9).
  // Runs daily. Not in production unless TELEPIZZA_WHATSAPP_PII_JOB=1.
  startWhatsAppPiiAnonymizationJob(envStatus);

  // Start rider location TTL purge job (ADR-008 §2).
  // Runs hourly. Deletes rider_locations rows 24h after the parent delivery
  // reaches a terminal state. Not in production unless
  // TELEPIZZA_RIDER_LOCATION_TTL_JOB=1.
  startRiderLocationTtlJob(envStatus);
});

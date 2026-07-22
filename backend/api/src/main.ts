import { createApp } from "./app.js";

const { app, envStatus } = createApp();
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
});

import { createApp } from "./app.js";

const { app, envStatus } = createApp();
const isProduction = process.env.NODE_ENV === "production";

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
  console.log(`Telepizza API listening on port ${envStatus.config.port}`);
});

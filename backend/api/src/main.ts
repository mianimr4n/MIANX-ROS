import { createApp } from "./app.js";

const { app, envStatus } = createApp();

if (!envStatus.isReady) {
  console.warn("API environment is not ready. /readyz will report configuration issues.");
}

app.listen(envStatus.config.port, () => {
  console.log(`Telepizza API listening on http://localhost:${envStatus.config.port}`);
});

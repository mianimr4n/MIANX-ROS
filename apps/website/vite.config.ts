import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@catalog": path.resolve(import.meta.dirname, "..", "..", "data", "catalog"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        /**
         * RC5-PERF-01 — merge tiny async fragments (e.g. single lucide icons)
         * so route splitting does not explode request count / gzip overhead.
         * Does not force deferred modules back into the sync entry graph.
         */
        experimentalMinChunkSize: 12_000,
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },
});

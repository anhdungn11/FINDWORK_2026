import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const envTarget =
    process.env.VITE_BACKEND_TARGET ||
    env.VITE_BACKEND_TARGET ||
    (process.env.VITE_BACKEND_PORT ? `http://127.0.0.1:${process.env.VITE_BACKEND_PORT}` : null) ||
    (env.VITE_BACKEND_PORT ? `http://127.0.0.1:${env.VITE_BACKEND_PORT}` : null);
  const defaultBackendTarget = envTarget || "http://127.0.0.1:3000";

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    // Same-origin dev proxy preserves the httpOnly refresh cookie and avoids CORS.
    // Port 5173 is dedicated to isolated browser test against findwork_test (port 3001).
    // Port 5176 remains dedicated to local development against findwork_dev (port 3000).
    server: {
      proxy: {
        "/api/v1": {
          target: defaultBackendTarget,
          changeOrigin: true,
          router(req: any) {
            const host = req.headers?.host || "";
            if (host.includes(":5173") || host.endsWith("5173")) {
              return "http://127.0.0.1:3001";
            }
            if (host.includes(":5176") || host.endsWith("5176")) {
              return "http://127.0.0.1:3000";
            }
            return defaultBackendTarget;
          },
        },
      },
    },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) return "lucide";
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react/")) return "vendor";
            if (id.includes("zustand") || id.includes("axios")) return "state";
            return "deps";
          }
        },
      },
    },
  },
};
});



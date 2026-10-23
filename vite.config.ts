import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // 1. Identify instance role based on explicit port/env at startup
  const isPort5173 =
    process.argv.includes("5173") ||
    process.env.PORT === "5173" ||
    process.env.VITE_PORT === "5173" ||
    env.VITE_PORT === "5173";

  const isTestBackendPort =
    process.env.VITE_BACKEND_PORT === "3001" ||
    env.VITE_BACKEND_PORT === "3001" ||
    process.env.VITE_BACKEND_TARGET === "http://127.0.0.1:3001" ||
    env.VITE_BACKEND_TARGET === "http://127.0.0.1:3001";

  const isTestInstance = isPort5173 || isTestBackendPort;

  const requestedTarget =
    process.env.VITE_BACKEND_TARGET ||
    env.VITE_BACKEND_TARGET ||
    (process.env.VITE_BACKEND_PORT ? `http://127.0.0.1:${process.env.VITE_BACKEND_PORT}` : null) ||
    (env.VITE_BACKEND_PORT ? `http://127.0.0.1:${env.VITE_BACKEND_PORT}` : null);

  // 2. Fail-closed safety: Port 5173 test instance MUST NEVER target dev backend (3000 / findwork_dev)
  if (isPort5173 && requestedTarget && (requestedTarget.includes(":3000") || requestedTarget.endsWith("3000"))) {
    throw new Error(
      "[Vite Safety Gate] Port 5173 is dedicated to isolated browser testing against findwork_test (port 3001). " +
      "Targeting port 3000 (findwork_dev) is strictly prohibited to prevent test pollution."
    );
  }

  // 3. Fixed backend target selected at startup (no ambiguous Host header inspection or silent fallback)
  const backendTarget = isTestInstance
    ? "http://127.0.0.1:3001"
    : (requestedTarget || "http://127.0.0.1:3000");

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    define: {
      "import.meta.env.VITE_ENABLE_WORKSPACE_WRITES": JSON.stringify(
        process.env.VITE_ENABLE_WORKSPACE_WRITES ?? env.VITE_ENABLE_WORKSPACE_WRITES ?? ""
      ),
      "import.meta.env.VITE_ENABLE_LIVE_WRITES": JSON.stringify(
        process.env.VITE_ENABLE_LIVE_WRITES ?? env.VITE_ENABLE_LIVE_WRITES ?? ""
      ),
      "import.meta.env.VITE_BACKEND_TARGET": JSON.stringify(
        process.env.VITE_BACKEND_TARGET ?? env.VITE_BACKEND_TARGET ?? ""
      ),
      "import.meta.env.VITE_BACKEND_PORT": JSON.stringify(
        process.env.VITE_BACKEND_PORT ?? env.VITE_BACKEND_PORT ?? ""
      ),
    },
    // Isolate Vite pre-bundle cache between test (5173) and dev (5176) to eliminate file lock contention
    cacheDir: isTestInstance ? "node_modules/.vite-test" : "node_modules/.vite",
    server: {
      proxy: {
        "/api/v1": {
          target: backendTarget,
          changeOrigin: true,
          // Fixed router: guarantees 100% of requests go to backendTarget without relying on Host headers
          router() {
            return backendTarget;
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

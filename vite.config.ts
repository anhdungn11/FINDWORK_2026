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

  const isPort5177 =
    process.argv.includes("5177") ||
    process.env.PORT === "5177" ||
    process.env.VITE_PORT === "5177" ||
    env.VITE_PORT === "5177";

  const isPort5178 =
    process.argv.includes("5178") ||
    process.env.PORT === "5178" ||
    process.env.VITE_PORT === "5178" ||
    env.VITE_PORT === "5178";

  const isTestBackendPort =
    process.env.VITE_BACKEND_PORT === "3001" ||
    env.VITE_BACKEND_PORT === "3001" ||
    process.env.VITE_BACKEND_TARGET === "http://127.0.0.1:3001" ||
    env.VITE_BACKEND_TARGET === "http://127.0.0.1:3001";

  const isTestInstance = isPort5173 || isTestBackendPort;

  let requestedTarget =
    process.env.VITE_BACKEND_TARGET ||
    env.VITE_BACKEND_TARGET ||
    (process.env.VITE_BACKEND_PORT ? `http://127.0.0.1:${process.env.VITE_BACKEND_PORT}` : null) ||
    (env.VITE_BACKEND_PORT ? `http://127.0.0.1:${env.VITE_BACKEND_PORT}` : null);

  // If running on port 5178, override any default .env.local targeting 3002 unless CLI explicitly specified a target
  if (isPort5178 && !process.env.VITE_BACKEND_PORT && !process.env.VITE_BACKEND_TARGET) {
    requestedTarget = "http://127.0.0.1:3003";
  }

  // 2. Fail-closed safety: Port 5173 test instance MUST NEVER target dev backend (3000 / findwork_dev)
  if (isPort5173 && requestedTarget && (requestedTarget.includes(":3000") || requestedTarget.endsWith("3000"))) {
    throw new Error(
      "[Vite Safety Gate] Port 5173 is dedicated to isolated browser testing against findwork_test (port 3001). " +
      "Targeting port 3000 (findwork_dev) is strictly prohibited to prevent test pollution."
    );
  }

  // Fail-closed safety: Port 5177 integration instance MUST NEVER target dev (3000) or test (3001) backend
  if (
    isPort5177 &&
    requestedTarget &&
    (requestedTarget.includes(":3000") ||
      requestedTarget.endsWith("3000") ||
      requestedTarget.includes(":3001") ||
      requestedTarget.endsWith("3001"))
  ) {
    throw new Error(
      "[Vite Safety Gate] Port 5177 is dedicated to integrated frontend delivery targeting backend port 3002. " +
      "Targeting port 3000 (findwork_dev) or port 3001 (findwork_test) is strictly prohibited to prevent environment pollution."
    );
  }

  // Fail-closed safety: Port 5178 acceptance instance MUST NEVER target dev (3000), test (3001), or shared (3002) backend
  if (
    isPort5178 &&
    requestedTarget &&
    (requestedTarget.includes(":3000") ||
      requestedTarget.endsWith("3000") ||
      requestedTarget.includes(":3001") ||
      requestedTarget.endsWith("3001"))
  ) {
    throw new Error(
      "[Vite Safety Gate] Port 5178 is dedicated to isolated browser acceptance targeting backend port 3003 (findwork_frontend_acceptance_cc7531c3be19). " +
      "Targeting port 3000, 3001, or 3002 is strictly prohibited to prevent environment pollution."
    );
  }

  // 3. Fixed backend target selected at startup (no ambiguous Host header inspection or silent fallback)
  const backendTarget = isTestInstance
    ? "http://127.0.0.1:3001"
    : isPort5178
    ? (requestedTarget || "http://127.0.0.1:3003")
    : isPort5177
    ? (requestedTarget || "http://127.0.0.1:3002")
    : (requestedTarget || "http://127.0.0.1:3000");

  const effectiveBackendPort = isTestInstance
    ? "3001"
    : isPort5178
    ? "3003"
    : isPort5177
    ? "3002"
    : (process.env.VITE_BACKEND_PORT ?? env.VITE_BACKEND_PORT ?? "3000");

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        isPort5178 || isPort5177 || isPort5173
          ? "/api/v1"
          : process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL ?? "/api/v1"
      ),
      "import.meta.env.VITE_ENABLE_WORKSPACE_WRITES": JSON.stringify(
        process.env.VITE_ENABLE_WORKSPACE_WRITES ?? env.VITE_ENABLE_WORKSPACE_WRITES ?? "true"
      ),
      "import.meta.env.VITE_ENABLE_LIVE_WRITES": JSON.stringify(
        process.env.VITE_ENABLE_LIVE_WRITES ?? env.VITE_ENABLE_LIVE_WRITES ?? "true"
      ),
      "import.meta.env.VITE_BACKEND_TARGET": JSON.stringify(backendTarget),
      "import.meta.env.VITE_BACKEND_PORT": JSON.stringify(effectiveBackendPort),
    },
    // Isolate Vite pre-bundle cache between test (5173), dev (5176), integration (5177) and acceptance (5178)
    cacheDir: isTestInstance
      ? "node_modules/.vite-test"
      : isPort5178
      ? "node_modules/.vite-acceptance"
      : process.env.VITE_PORT === "5177" || env.VITE_PORT === "5177"
      ? "node_modules/.vite-integration"
      : "node_modules/.vite",
    server: {
      proxy: {
        "/api/v1": {
          target: backendTarget,
          changeOrigin: true,
          headers: {
            origin: isPort5178 ? "http://127.0.0.1:5177" : undefined,
          },
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

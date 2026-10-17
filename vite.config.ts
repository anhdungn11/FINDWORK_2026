import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Same-origin dev proxy preserves the httpOnly refresh cookie and avoids CORS.
  // Production must configure a reverse proxy for /api/v1 or VITE_API_BASE_URL.
  server: {
    proxy: {
      "/api/v1": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
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
});

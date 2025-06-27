// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0", // or true
    port: 5000,
    allowedHosts: "all", // or ['.janeway.replit.dev']
    hmr: {
      host: "0.0.0.0",
      port: 5000,
    }, // ← closes hmr
  }, // ← closes server  ✅

  build: {
    outDir: "dist",
    rollupOptions: { input: "./index.html" },
  },

  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: { ".js": "jsx" },
    },
  },
});

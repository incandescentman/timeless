// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5001,
    allowedHosts: [
      "9d7287a9-30f2-49c4-8c85-1270a78afdfd-00-2m2bho6b577pp.janeway.replit.dev",
      ".replit.dev",
      "localhost"
    ],
    hmr: {
      host: "0.0.0.0",
      port: 5001,
    }
  },

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

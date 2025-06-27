// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                     // or keep '0.0.0.0' if you prefer
    port: 5000,
    /* 🛡 Tell Vite to trust your Replit URL (and all its sub-domains) */
    allowedHosts: ['.janeway.replit.dev']   // <-- add this line
    // -- OR --  allowedHosts: 'all'   // to accept every host
  },
  build: {
    outDir: 'dist',
    rollupOptions: { input: './index.html' }
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  }
}); 
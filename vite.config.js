// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Trust every host (easiest for cloud sandboxes)
    allowedHosts: 'all',

    // Or lock it down to just your Replit URL:
    // allowedHosts: [
    //   '9d7287a9-30f2-49c4-8c85-1270a78afdfd-00-2m2bho6b577pp.janeway.replit.dev'
    // ],

    // Optional: ensure the dev server binds to all interfaces
    host: true
  }
}); 
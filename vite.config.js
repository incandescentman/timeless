import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { formatCalendarAsMarkdown, parseMarkdownDiary } from './src/utils/calendarDiary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIARY_PATH = path.resolve(__dirname, 'data', 'jay-diary.md');
const DATE_KEY_REGEX = /^\d+_\d+_\d+$/;

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function registerCalendarDiaryMiddleware(server) {
  server.middlewares.use('/__load-calendar-diary', async (req, res, next) => {
    if (req.method !== 'GET') return next();

    try {
      const raw = await fs.readFile(DIARY_PATH, 'utf8');
      const { calendarData, lastSavedTimestamp } = parseMarkdownDiary(raw);
      const payload = {
        ...calendarData,
        lastSavedTimestamp: String(lastSavedTimestamp || Date.now())
      };
      sendJson(res, 200, payload);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        sendJson(res, 200, { lastSavedTimestamp: Date.now().toString() });
        return;
      }
      console.error('[calendar-diary] load failed:', error);
      sendJson(res, 500, { status: 'error', message: 'Failed to load calendar diary' });
    }
  });

  server.middlewares.use('/__update-calendar-diary', (req, res, next) => {
    if (req.method !== 'POST') return next();

    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!payload || typeof payload !== 'object') {
          sendJson(res, 400, { status: 'error', message: 'Invalid payload' });
          return;
        }

        const { lastSavedTimestamp, ...rest } = payload;
        const calendarData = {};
        Object.entries(rest).forEach(([key, value]) => {
          if (!DATE_KEY_REGEX.test(key)) return;
          if (!Array.isArray(value)) return;
          calendarData[key] = value;
        });

        const timestamp = typeof lastSavedTimestamp === 'string' || typeof lastSavedTimestamp === 'number'
          ? lastSavedTimestamp
          : Date.now();

        await fs.mkdir(path.dirname(DIARY_PATH), { recursive: true });
        const markdown = formatCalendarAsMarkdown(calendarData, timestamp);
        await fs.writeFile(DIARY_PATH, markdown, 'utf8');
        console.info('[calendar-diary] wrote diary', DIARY_PATH, timestamp);

        sendJson(res, 200, {
          status: 'ok',
          savedTimestamp: String(Number(timestamp) || Date.now())
        });
      } catch (error) {
        console.error('[calendar-diary] save failed:', error);
        sendJson(res, 500, { status: 'error', message: 'Failed to save calendar diary' });
      }
    });
    req.on('error', (error) => {
      console.error('[calendar-diary] request error:', error);
      sendJson(res, 500, { status: 'error', message: 'Failed to read request body' });
    });
  });
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5000,
    allowedHosts: ['.janeway.replit.dev'],
    configureServer(server) {
      registerCalendarDiaryMiddleware(server);
    }
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

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { formatCalendarAsMarkdown, parseMarkdownDiary } from './src/utils/calendarDiary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIARY_PATH = path.resolve(__dirname, 'data', 'timeline.md');
const DATE_KEY_REGEX = /^\d+_\d+_\d+$/;

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function createDiaryRevision(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

async function readDiaryState() {
  try {
    const content = await fs.readFile(DIARY_PATH, 'utf8');
    return {
      content,
      fileExists: true,
      revision: createDiaryRevision(content)
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { content: '', fileExists: false, revision: null };
    }
    throw error;
  }
}

function registerCalendarDiaryMiddleware(server) {
  server.middlewares.use('/__load-calendar-diary', async (req, res, next) => {
    if (req.method !== 'GET') return next();

    try {
      const diaryState = await readDiaryState();
      if (!diaryState.fileExists) {
        sendJson(res, 200, {
          lastSavedTimestamp: '0',
          serverRevision: null,
          serverFileExists: false
        });
        return;
      }

      const { calendarData, lastSavedTimestamp } = parseMarkdownDiary(diaryState.content);
      const payload = {
        ...calendarData,
        lastSavedTimestamp: String(lastSavedTimestamp || Date.now()),
        serverRevision: diaryState.revision,
        serverFileExists: true
      };
      sendJson(res, 200, payload);
    } catch (error) {
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
      let temporaryPath = null;
      try {
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (!payload || typeof payload !== 'object') {
          sendJson(res, 400, { status: 'error', message: 'Invalid payload' });
          return;
        }

        const hasBaseRevision = Object.prototype.hasOwnProperty.call(payload, 'baseRevision');
        const hasBaseFileExists = Object.prototype.hasOwnProperty.call(payload, 'baseFileExists');
        if (!hasBaseRevision || !hasBaseFileExists) {
          sendJson(res, 428, {
            status: 'error',
            code: 'missing_revision',
            message: 'Load the current calendar revision before saving.'
          });
          return;
        }

        const { baseRevision, baseFileExists } = payload;
        if (typeof baseFileExists !== 'boolean') {
          sendJson(res, 400, { status: 'error', message: 'baseFileExists must be a boolean' });
          return;
        }

        if (baseFileExists && (typeof baseRevision !== 'string' || !baseRevision)) {
          sendJson(res, 428, {
            status: 'error',
            code: 'missing_revision',
            message: 'The existing calendar requires its latest file revision.'
          });
          return;
        }

        if (!baseFileExists && baseRevision !== null) {
          sendJson(res, 400, {
            status: 'error',
            message: 'baseRevision must be null when the calendar file does not exist.'
          });
          return;
        }

        const {
          lastSavedTimestamp: _ignoredLastSavedTimestamp,
          baseRevision: _ignoredBaseRevision,
          baseFileExists: _ignoredBaseFileExists,
          ...rest
        } = payload;
        const calendarData = {};
        Object.entries(rest).forEach(([key, value]) => {
          if (!DATE_KEY_REGEX.test(key)) return;
          if (!Array.isArray(value)) return;
          calendarData[key] = value;
        });

        const currentState = await readDiaryState();
        const revisionMatches = currentState.fileExists === baseFileExists
          && (!currentState.fileExists || currentState.revision === baseRevision);

        if (!revisionMatches) {
          sendJson(res, 409, {
            status: 'conflict',
            code: 'revision_conflict',
            message: 'The diary changed on disk since this browser last loaded it. Local changes were preserved.'
          });
          return;
        }

        const timestamp = Date.now();

        await fs.mkdir(path.dirname(DIARY_PATH), { recursive: true });
        const markdown = formatCalendarAsMarkdown(calendarData, timestamp);
        temporaryPath = `${DIARY_PATH}.${process.pid}.${randomUUID()}.tmp`;
        await fs.writeFile(temporaryPath, markdown, 'utf8');

        const stateBeforeReplace = await readDiaryState();
        const stillMatches = stateBeforeReplace.fileExists === currentState.fileExists
          && stateBeforeReplace.revision === currentState.revision;
        if (!stillMatches) {
          sendJson(res, 409, {
            status: 'conflict',
            code: 'revision_conflict',
            message: 'The diary changed while the save was being prepared. Local changes were preserved.'
          });
          return;
        }

        await fs.rename(temporaryPath, DIARY_PATH);
        temporaryPath = null;
        console.info('[calendar-diary] wrote diary', DIARY_PATH, timestamp);

        sendJson(res, 200, {
          status: 'ok',
          savedTimestamp: String(timestamp),
          serverRevision: createDiaryRevision(markdown),
          serverFileExists: true
        });
      } catch (error) {
        console.error('[calendar-diary] save failed:', error);
        sendJson(res, 500, { status: 'error', message: 'Failed to save calendar diary' });
      } finally {
        if (temporaryPath) {
          fs.rm(temporaryPath, { force: true }).catch(() => {});
        }
      }
    });
    req.on('error', (error) => {
      console.error('[calendar-diary] request error:', error);
      sendJson(res, 500, { status: 'error', message: 'Failed to read request body' });
    });
  });
}

function calendarDiaryPlugin() {
  return {
    name: 'timeless-calendar-diary',
    configureServer(server) {
      registerCalendarDiaryMiddleware(server);
    }
  };
}

export default defineConfig({
  plugins: [react(), calendarDiaryPlugin()],
  server: {
    host: true,
    port: 5000,
    allowedHosts: ['.janeway.replit.dev']
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

import { formatCalendarAsMarkdown } from '../src/utils/calendarDiary.js';
import {
  getDropboxAccessToken,
  invalidateDropboxAccessToken,
  shouldRefreshDropboxToken,
  DROPBOX_UPLOAD_URL
} from '../lib/dropbox.js';

const DROPBOX_CALENDAR_PATH = process.env.DROPBOX_CALENDAR_PATH || '/Apps/Timeless/calendar/timeline.md';
const DATE_KEY_REGEX = /^\d+_\d+_\d+$/;

function parseRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return req.body ? JSON.parse(req.body) : {};
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  return req.body;
}

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { status: 'error', message: 'Method not allowed' });
    return;
  }

  try {
    const parsed = parseRequestBody(req);
    if (!parsed || typeof parsed !== 'object') {
      sendJson(res, 400, { status: 'error', message: 'Invalid payload' });
      return;
    }

    const hasBaseRevision = Object.prototype.hasOwnProperty.call(parsed, 'baseRevision');
    const hasBaseFileExists = Object.prototype.hasOwnProperty.call(parsed, 'baseFileExists');
    if (!hasBaseRevision || !hasBaseFileExists) {
      sendJson(res, 428, {
        status: 'error',
        code: 'missing_revision',
        message: 'Load the current calendar revision before saving.'
      });
      return;
    }

    const { baseRevision, baseFileExists } = parsed;
    if (typeof baseFileExists !== 'boolean') {
      sendJson(res, 400, { status: 'error', message: 'baseFileExists must be a boolean' });
      return;
    }

    if (baseFileExists && (typeof baseRevision !== 'string' || !baseRevision)) {
      sendJson(res, 428, {
        status: 'error',
        code: 'missing_revision',
        message: 'The existing calendar requires its latest Dropbox revision.'
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
    } = parsed;
    const timestampForSave = Date.now();

    const calendarData = {};
    Object.entries(rest).forEach(([key, value]) => {
      if (!DATE_KEY_REGEX.test(key)) return;
      if (!Array.isArray(value)) return;
      calendarData[key] = value;
    });

    const markdown = formatCalendarAsMarkdown(calendarData, timestampForSave);

    const attemptUpload = (token) => fetch(DROPBOX_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: DROPBOX_CALENDAR_PATH,
          mode: baseFileExists
            ? { '.tag': 'update', update: baseRevision }
            : { '.tag': 'add' },
          autorename: false,
          mute: true,
          strict_conflict: true
        })
      },
      body: Buffer.from(markdown, 'utf-8')
    });

    let token = await getDropboxAccessToken();
    let uploadResponse = await attemptUpload(token);

    if (!uploadResponse.ok && await shouldRefreshDropboxToken(uploadResponse)) {
      invalidateDropboxAccessToken();
      token = await getDropboxAccessToken();
      uploadResponse = await attemptUpload(token);
    }

    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      console.error('Dropbox upload failed:', detail);
      if (uploadResponse.status === 409) {
        sendJson(res, 409, {
          status: 'conflict',
          code: 'revision_conflict',
          message: 'Dropbox changed since this browser last loaded the calendar. Local changes were preserved.',
          detail
        });
        return;
      }

      sendJson(res, uploadResponse.status, { status: 'error', message: 'Dropbox upload failed', detail });
      return;
    }

    let metadataTimestamp = 0;
    let serverRevision = null;
    try {
      const metadata = await uploadResponse.json();
      if (typeof metadata?.rev === 'string' && metadata.rev) {
        serverRevision = metadata.rev;
      }
      const parsed = metadata?.server_modified ? Date.parse(metadata.server_modified) : NaN;
      if (Number.isFinite(parsed)) {
        metadataTimestamp = parsed;
      }
    } catch (metadataError) {
      console.warn('Failed to parse Dropbox upload metadata', metadataError);
    }

    if (!serverRevision) {
      sendJson(res, 502, {
        status: 'error',
        code: 'missing_revision',
        message: 'Dropbox saved the calendar but did not return a revision. Reload before saving again.'
      });
      return;
    }

    const effectiveTimestamp = metadataTimestamp || timestampForSave;

    sendJson(res, 200, {
      status: 'ok',
      savedTimestamp: String(effectiveTimestamp),
      serverRevision,
      serverFileExists: true
    });
  } catch (error) {
    console.error('Dropbox calendar save failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { status: 'error', message: 'Unexpected error while uploading to Dropbox', detail: message });
  }
}

import { formatCalendarAsMarkdown } from '../src/utils/calendarDiary.js';
import {
  getDropboxAccessToken,
  invalidateDropboxAccessToken,
  shouldRefreshDropboxToken,
  DROPBOX_UPLOAD_URL
} from '../lib/dropbox.js';

const DROPBOX_CALENDAR_PATH = process.env.DROPBOX_CALENDAR_PATH || '/Apps/Timeless/calendar/jay-diary.md';
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

    const { lastSavedTimestamp, ...rest } = parsed;
    const timestamp = typeof lastSavedTimestamp === 'string' || typeof lastSavedTimestamp === 'number'
      ? lastSavedTimestamp
      : Date.now();

    const calendarData = {};
    Object.entries(rest).forEach(([key, value]) => {
      if (!DATE_KEY_REGEX.test(key)) return;
      if (!Array.isArray(value)) return;
      calendarData[key] = value;
    });

    const markdown = formatCalendarAsMarkdown(calendarData, timestamp);

    const attemptUpload = (token) => fetch(DROPBOX_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: DROPBOX_CALENDAR_PATH,
          mode: 'overwrite',
          autorename: false,
          mute: true,
          strict_conflict: false
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
      sendJson(res, uploadResponse.status, { status: 'error', message: 'Dropbox upload failed', detail });
      return;
    }

    sendJson(res, 200, { status: 'ok', savedTimestamp: String(timestamp) });
  } catch (error) {
    console.error('Dropbox calendar save failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { status: 'error', message: 'Unexpected error while uploading to Dropbox', detail: message });
  }
}

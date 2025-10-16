import { parseMarkdownDiary } from '../src/utils/calendarDiary.js';
import {
  getDropboxAccessToken,
  invalidateDropboxAccessToken,
  shouldRefreshDropboxToken,
  DROPBOX_DOWNLOAD_URL
} from '../lib/dropbox.js';

const DROPBOX_CALENDAR_PATH = process.env.DROPBOX_CALENDAR_PATH || '/Apps/Timeless/calendar/timeline.md';

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { status: 'error', message: 'Method not allowed' });
    return;
  }

  try {
    const attemptDownload = (token) => fetch(DROPBOX_DOWNLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: DROPBOX_CALENDAR_PATH })
      }
    });

    let token = await getDropboxAccessToken();
    let downloadResponse = await attemptDownload(token);

    if (!downloadResponse.ok && await shouldRefreshDropboxToken(downloadResponse)) {
      invalidateDropboxAccessToken();
      token = await getDropboxAccessToken();
      downloadResponse = await attemptDownload(token);
    }

    if (!downloadResponse.ok) {
      if (downloadResponse.status === 409) {
        const detail = await downloadResponse.text();
        if (detail.includes('path/not_found/')) {
          sendJson(res, 200, { lastSavedTimestamp: Date.now().toString() });
          return;
        }
      }

      const message = await downloadResponse.text();
      console.error('Dropbox download failed:', message);
      sendJson(res, downloadResponse.status, { status: 'error', message: 'Dropbox download failed', detail: message });
      return;
    }

    const metadataHeader = downloadResponse.headers.get('Dropbox-API-Result');
    let metadataTimestamp = 0;

    if (metadataHeader) {
      try {
        const metadata = JSON.parse(metadataHeader);
        const parsed = metadata?.server_modified ? Date.parse(metadata.server_modified) : NaN;
        if (Number.isFinite(parsed)) {
          metadataTimestamp = parsed;
        }
      } catch (metadataError) {
        console.warn('Failed to parse Dropbox metadata header', metadataError);
      }
    }

    const buffer = await downloadResponse.arrayBuffer();
    const content = Buffer.from(buffer).toString('utf-8');
    const { calendarData, lastSavedTimestamp } = parseMarkdownDiary(content);

    sendJson(res, 200, {
      ...calendarData,
      lastSavedTimestamp: String(
        Math.max(
          Number.isFinite(lastSavedTimestamp) ? lastSavedTimestamp : 0,
          metadataTimestamp
        )
      )
    });
  } catch (error) {
    console.error('Dropbox calendar load failed:', error);
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { status: 'error', message: 'Unexpected error while downloading from Dropbox', detail: message });
  }
}

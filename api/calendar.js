import calendarLoadHandler from './calendar-load.js';
import calendarSaveHandler from './calendar-save.js';

function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      await calendarLoadHandler(req, res);
      return;
    }

    if (req.method === 'POST') {
      await calendarSaveHandler(req, res);
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (error) {
    console.error('Calendar handler error:', error);
    sendJson(res, 500, { status: 'error', message: 'Internal server error' });
  }
}

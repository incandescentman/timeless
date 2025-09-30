import Redis from 'ioredis';

const KEY = 'calendar:data';
const redis = new Redis(process.env.REDIS_URL);

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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = await redis.get(KEY);
      let payload = {};

      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (error) {
          console.error('Failed to parse calendar payload from Redis:', error);
        }
      }

      sendJson(res, 200, payload);
      return;
    }

    if (req.method === 'POST') {
      let payload;
      try {
        payload = parseRequestBody(req);
      } catch (error) {
        sendJson(res, 400, { status: 'error', message: error.message });
        return;
      }

      if (typeof payload !== 'object' || payload === null) {
        sendJson(res, 400, { status: 'error', message: 'Invalid payload' });
        return;
      }

      const timestamp = Date.now().toString();
      await redis.set(
        KEY,
        JSON.stringify({
          ...payload,
          lastSavedTimestamp: timestamp
        })
      );

      sendJson(res, 200, { status: 'ok', savedTimestamp: timestamp });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Redis handler error:', error);
    sendJson(res, 500, { status: 'error', message: 'Internal server error' });
  }
}

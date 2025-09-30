import { kv } from '@vercel/kv';

const KEY = 'calendar:data';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await kv.get(KEY);
      const payload = typeof data === 'object' && data !== null ? data : {};
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(payload);
      return;
    }

    if (req.method === 'POST') {
      let payload = req.body;
      if (typeof payload === 'string') {
        payload = JSON.parse(payload || '{}');
      }

      if (typeof payload !== 'object' || payload === null) {
        res.status(400).json({ status: 'error', message: 'Invalid payload' });
        return;
      }

      const timestamp = Date.now().toString();
      const dataToSave = {
        ...payload,
        lastSavedTimestamp: timestamp
      };

      await kv.set(KEY, dataToSave);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ status: 'ok', savedTimestamp: timestamp });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('KV handler error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

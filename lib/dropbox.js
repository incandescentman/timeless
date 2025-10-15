const DROPBOX_TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token';

let cachedToken = null;

function directToken() {
  return process.env.DROPBOX_ACCESS_TOKEN;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Dropbox environment variable: ${name}`);
  }
  return value;
}

export async function getDropboxAccessToken() {
  const override = directToken();
  if (override) {
    return override;
  }

  if (cachedToken && cachedToken.expiresAt - 30_000 > Date.now()) {
    return cachedToken.value;
  }

  const appKey = requireEnv('DROPBOX_APP_KEY');
  const appSecret = requireEnv('DROPBOX_APP_SECRET');
  const refreshToken = requireEnv('DROPBOX_REFRESH_TOKEN');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await fetch(DROPBOX_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${appKey}:${appSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to refresh Dropbox token: ${detail}`);
  }

  const payload = await response.json();
  const expiresInSeconds = typeof payload.expires_in === 'number' ? payload.expires_in : 4 * 60 * 60;

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1000
  };

  return cachedToken.value;
}

export function invalidateDropboxAccessToken() {
  cachedToken = null;
}

export async function shouldRefreshDropboxToken(response) {
  if (directToken()) return false;
  if (response.status === 401) return true;
  if (response.status === 409) {
    try {
      const detail = await response.clone().text();
      return detail.includes('expired_access_token');
    } catch (error) {
      console.warn('Failed to inspect Dropbox error payload', error);
      return false;
    }
  }
  return false;
}

export const DROPBOX_UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';
export const DROPBOX_DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download';

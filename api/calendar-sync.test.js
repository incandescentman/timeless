import { beforeEach, describe, expect, it, vi } from 'vitest';

const dropboxMocks = vi.hoisted(() => ({
  getDropboxAccessToken: vi.fn(),
  invalidateDropboxAccessToken: vi.fn(),
  shouldRefreshDropboxToken: vi.fn()
}));

vi.mock('../lib/dropbox.js', () => ({
  ...dropboxMocks,
  DROPBOX_DOWNLOAD_URL: 'https://content.dropbox.test/download',
  DROPBOX_UPLOAD_URL: 'https://content.dropbox.test/upload'
}));

import calendarLoadHandler from './calendar-load.js';
import calendarSaveHandler from './calendar-save.js';

function createResponseRecorder() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    send(body) {
      this.body = JSON.parse(body);
    }
  };
}

describe('Dropbox calendar revision API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dropboxMocks.getDropboxAccessToken.mockResolvedValue('test-token');
    dropboxMocks.shouldRefreshDropboxToken.mockResolvedValue(false);
    globalThis.fetch = vi.fn();
  });

  it('returns the downloaded Dropbox revision to the client', async () => {
    globalThis.fetch.mockResolvedValue(new Response(
      '<!-- lastSavedTimestamp: 1000 -->\n\n# 2026\n\n## October 2026\n\n10/2/2026\n  - Rumpus reunion\n',
      {
        status: 200,
        headers: {
          'Dropbox-API-Result': JSON.stringify({
            rev: 'rev-load',
            server_modified: '2026-10-02T12:00:00Z'
          })
        }
      }
    ));
    const res = createResponseRecorder();

    await calendarLoadHandler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.serverRevision).toBe('rev-load');
    expect(res.body.serverFileExists).toBe(true);
    expect(res.body['9_2_2026']).toHaveLength(1);
  });

  it('reports a missing Dropbox file as a known absent baseline', async () => {
    globalThis.fetch.mockResolvedValue(new Response('path/not_found/', { status: 409 }));
    const res = createResponseRecorder();

    await calendarLoadHandler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      lastSavedTimestamp: '0',
      serverRevision: null,
      serverFileExists: false
    });
  });

  it('rejects an existing Dropbox file when its revision metadata is missing', async () => {
    globalThis.fetch.mockResolvedValue(new Response('# 2026\n', { status: 200 }));
    const res = createResponseRecorder();

    await calendarLoadHandler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('missing_revision');
  });

  it('uses Dropbox update mode with the exact client baseline revision', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({
      rev: 'rev-next',
      server_modified: '2026-10-02T12:00:00Z'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    const res = createResponseRecorder();

    await calendarSaveHandler({
      method: 'POST',
      body: {
        '9_2_2026': [{ text: 'Rumpus reunion', completed: false, tags: [] }],
        lastSavedTimestamp: '1000',
        baseRevision: 'rev-base',
        baseFileExists: true
      }
    }, res);

    const uploadOptions = globalThis.fetch.mock.calls[0][1];
    const uploadArg = JSON.parse(uploadOptions.headers['Dropbox-API-Arg']);
    expect(uploadArg).toMatchObject({
      mode: { '.tag': 'update', update: 'rev-base' },
      autorename: false,
      strict_conflict: true
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      serverRevision: 'rev-next',
      serverFileExists: true
    });
  });

  it('uses strict add mode only when the client loaded a known missing file', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({
      rev: 'rev-created',
      server_modified: '2026-10-02T12:00:00Z'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    const res = createResponseRecorder();

    await calendarSaveHandler({
      method: 'POST',
      body: {
        '9_2_2026': [{ text: 'Rumpus reunion', completed: false, tags: [] }],
        lastSavedTimestamp: '1000',
        baseRevision: null,
        baseFileExists: false
      }
    }, res);

    const uploadOptions = globalThis.fetch.mock.calls[0][1];
    const uploadArg = JSON.parse(uploadOptions.headers['Dropbox-API-Arg']);
    expect(uploadArg).toMatchObject({
      mode: { '.tag': 'add' },
      autorename: false,
      strict_conflict: true
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.serverRevision).toBe('rev-created');
  });

  it('returns 409 instead of overwriting when Dropbox rejects a stale revision', async () => {
    globalThis.fetch.mockResolvedValue(new Response('path/conflict/file/', { status: 409 }));
    const res = createResponseRecorder();

    await calendarSaveHandler({
      method: 'POST',
      body: {
        '9_2_2026': [],
        lastSavedTimestamp: '1000',
        baseRevision: 'stale-rev',
        baseFileExists: true
      }
    }, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      status: 'conflict',
      code: 'revision_conflict'
    });
  });

  it('rejects legacy saves that omit a revision precondition', async () => {
    const res = createResponseRecorder();

    await calendarSaveHandler({
      method: 'POST',
      body: { '9_2_2026': [] }
    }, res);

    expect(res.statusCode).toBe(428);
    expect(res.body.code).toBe('missing_revision');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

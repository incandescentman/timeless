import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CalendarSyncError,
  fetchServerCalendar,
  getServerSyncState,
  hasUnsyncedCalendarChanges,
  importCalendarData,
  saveCalendarToServer,
  saveServerSyncState,
  setUnsyncedCalendarChanges,
  calendarDataMatches
} from './storage';

function createMemoryStorage() {
  const entries = new Map();
  return {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    key(index) {
      return Array.from(entries.keys())[index] ?? null;
    },
    removeItem(key) {
      entries.delete(key);
    },
    setItem(key, value) {
      entries.set(key, String(value));
    }
  };
}

describe('calendar server revision storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true
    });
    globalThis.fetch = vi.fn();
  });

  it('persists the last synchronized server revision and dirty state', () => {
    expect(getServerSyncState()).toEqual({ revision: null, fileExists: null });
    expect(hasUnsyncedCalendarChanges()).toBe(false);

    saveServerSyncState({ revision: 'rev-a', fileExists: true });
    setUnsyncedCalendarChanges(true);

    expect(getServerSyncState()).toEqual({ revision: 'rev-a', fileExists: true });
    expect(hasUnsyncedCalendarChanges()).toBe(true);

    saveServerSyncState({ revision: null, fileExists: false });
    setUnsyncedCalendarChanges(false);

    expect(getServerSyncState()).toEqual({ revision: null, fileExists: false });
    expect(hasUnsyncedCalendarChanges()).toBe(false);
  });

  it('compares calendar content without treating generated event IDs as changes', () => {
    expect(calendarDataMatches(
      { '9_2_2026': [{ id: 'local-id', text: 'Rumpus reunion', completed: false, tags: [] }] },
      { '9_2_2026': [{ id: 'server-id', text: 'Rumpus reunion', completed: false, tags: [] }] }
    )).toBe(true);

    expect(calendarDataMatches(
      { '9_2_2026': [{ text: 'Rumpus reunion', completed: false, tags: [] }] },
      { '9_2_2026': [{ text: 'Different event', completed: false, tags: [] }] }
    )).toBe(false);
  });

  it('marks an imported calendar as unsynced', () => {
    expect(importCalendarData(JSON.stringify({
      '9_2_2026': ['Rumpus reunion']
    }))).toBe(true);

    expect(hasUnsyncedCalendarChanges()).toBe(true);
  });

  it('returns Dropbox revision metadata with normalized calendar data', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({
      '9_2_2026': ['Rumpus reunion'],
      lastSavedTimestamp: '1234',
      serverRevision: 'rev-load',
      serverFileExists: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const result = await fetchServerCalendar();

    expect(result.lastSavedTimestamp).toBe(1234);
    expect(result.serverSyncState).toEqual({ revision: 'rev-load', fileExists: true });
    expect(result.calendarData['9_2_2026'][0]).toMatchObject({ text: 'Rumpus reunion' });
  });

  it('sends the baseline revision and returns the next revision', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      savedTimestamp: '5678',
      serverRevision: 'rev-next',
      serverFileExists: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const result = await saveCalendarToServer(
      { '9_2_2026': [{ text: 'Rumpus reunion', completed: false, tags: [] }] },
      '1234',
      { revision: 'rev-base', fileExists: true }
    );

    const request = globalThis.fetch.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({
      lastSavedTimestamp: '1234',
      baseRevision: 'rev-base',
      baseFileExists: true
    });
    expect(result.serverSyncState).toEqual({ revision: 'rev-next', fileExists: true });
  });

  it('raises a typed conflict without discarding the server detail', async () => {
    globalThis.fetch.mockResolvedValue(new Response(JSON.stringify({
      status: 'conflict',
      code: 'revision_conflict',
      message: 'Dropbox changed.',
      detail: 'path/conflict/file/'
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    }));

    await expect(saveCalendarToServer(
      {},
      '1234',
      { revision: 'stale-rev', fileExists: true }
    )).rejects.toMatchObject({
      name: 'CalendarSyncError',
      status: 409,
      code: 'revision_conflict',
      detail: 'path/conflict/file/'
    });
  });

  it('refuses to save before a baseline revision is known', async () => {
    await expect(saveCalendarToServer({}, '1234', {
      revision: null,
      fileExists: null
    })).rejects.toBeInstanceOf(CalendarSyncError);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

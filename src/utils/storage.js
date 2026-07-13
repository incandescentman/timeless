/**
 * Local storage utilities for Timeless Calendar
 */

import { generateDayId } from './dateUtils';
import { normalizeEvents } from './eventUtils';
import { formatCalendarAsMarkdown } from './calendarDiary';

const DATE_KEY_REGEX = /^\d+_\d+_\d+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_KEY_REGEX = /^item\d+$/;
const SERVER_REVISION_KEY = 'calendarServerRevision';
const SERVER_FILE_EXISTS_KEY = 'calendarServerFileExists';
const UNSYNCED_CHANGES_KEY = 'calendarHasUnsyncedChanges';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const trimmedBase = rawApiBase.replace(/\/$/, '');
const API_ENDPOINT = trimmedBase
  ? /\.php$/i.test(trimmedBase)
    ? trimmedBase
    : `${trimmedBase}/api/calendar`
  : '/api/calendar';

const rawCalendarSyncEndpoint = (import.meta.env.VITE_CALENDAR_SYNC_ENDPOINT || '').trim();
const rawCalendarLoadEndpoint = (import.meta.env.VITE_CALENDAR_LOAD_ENDPOINT || '').trim();

const DEFAULT_DEV_SYNC_ENDPOINT = import.meta.env.DEV ? '/__update-calendar-diary' : API_ENDPOINT;
const DEFAULT_DEV_LOAD_ENDPOINT = import.meta.env.DEV ? '/__load-calendar-diary' : API_ENDPOINT;

const SYNC_ENDPOINT = rawCalendarSyncEndpoint || DEFAULT_DEV_SYNC_ENDPOINT;
const LOAD_ENDPOINT = rawCalendarLoadEndpoint || DEFAULT_DEV_LOAD_ENDPOINT;

function readLocalStorageEntries() {
  const entries = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    entries[key] = localStorage.getItem(key);
  }
  return entries;
}

function normaliseEntryKey(key) {
  if (DATE_KEY_REGEX.test(key)) {
    return key;
  }

  if (ISO_DATE_REGEX.test(key)) {
    const date = new Date(`${key}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return generateDayId(date);
    }
  }

  return null;
}

function resolveItemTokens(rawValue, itemMap) {
  const tokens = rawValue
    .split(/[\n,]/)
    .map(token => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return '';
  }

  const resolvedTokens = tokens.map(token => {
    if (ITEM_KEY_REGEX.test(token)) {
      const resolved = (itemMap[token] || '').trim();
      return resolved || token;
    }
    return token;
  }).filter(Boolean);

  if (resolvedTokens.length === 0) {
    return '';
  }

  const containsItems = tokens.some(token => ITEM_KEY_REGEX.test(token));
  return containsItems ? resolvedTokens.join('\n') : rawValue.trim();
}

function toEventArray(value) {
  let rawEvents = [];

  if (Array.isArray(value)) {
    rawEvents = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawEvents = parsed;
      } else {
        // Not an array, split by newlines/commas
        rawEvents = trimmed
          .split(/[\n,]/)
          .map(entry => entry.trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Not JSON, split by newlines/commas
      rawEvents = trimmed
        .split(/[\n,]/)
        .map(entry => entry.trim())
        .filter(Boolean);
    }
  }

  // Normalize all events to object format
  return normalizeEvents(rawEvents);
}

function normaliseCalendarEntries(entries) {
  const itemMap = {};
  Object.entries(entries).forEach(([key, value]) => {
    if (ITEM_KEY_REGEX.test(key)) {
      itemMap[key] = value || '';
    }
  });

  const calendarData = {};

  Object.entries(entries).forEach(([key, value]) => {
    const normalisedKey = normaliseEntryKey(key);
    if (!normalisedKey) {
      return;
    }

    if (Array.isArray(value)) {
      const events = toEventArray(value);
      if (events.length) {
        calendarData[normalisedKey] = events;
      }
      return;
    }

    if (typeof value !== 'string') {
      return;
    }

    const resolvedValue = resolveItemTokens(value.trim(), itemMap);
    const events = toEventArray(resolvedValue);
    if (events.length) {
      calendarData[normalisedKey] = events;
    }
  });

  return calendarData;
}

function removeLegacyKeys(calendarData = null) {
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (ITEM_KEY_REGEX.test(key) || ISO_DATE_REGEX.test(key)) {
      keysToRemove.push(key);
      continue;
    }

    if (DATE_KEY_REGEX.test(key)) {
      if (!calendarData || !calendarData[key]) {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get all calendar data from localStorage
 */
export function getAllCalendarData() {
  const entries = readLocalStorageEntries();
  return normaliseCalendarEntries(entries);
}

/**
 * Load calendar data from localStorage
 */
export function loadFromLocalStorage() {
  return getAllCalendarData();
}

/**
 * Save calendar data to localStorage
 */
export function saveToLocalStorage(calendarData, timestamp = Date.now().toString()) {
  removeLegacyKeys(calendarData);

  Object.entries(calendarData).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  });

  localStorage.setItem('lastSavedTimestamp', timestamp);
}

export function getLocalTimestamp() {
  const raw = localStorage.getItem('lastSavedTimestamp');
  const parsed = parseInt(raw ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createServerPayload(calendarData, timestamp, serverSyncState) {
  return {
    ...calendarData,
    lastSavedTimestamp: timestamp,
    baseRevision: serverSyncState.revision,
    baseFileExists: serverSyncState.fileExists
  };
}

export class CalendarSyncError extends Error {
  constructor(message, { status = 0, code = 'sync_error', detail = null } = {}) {
    super(message);
    this.name = 'CalendarSyncError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function isCalendarSyncConflict(error) {
  return error instanceof CalendarSyncError && error.code === 'revision_conflict';
}

export function getServerSyncState() {
  const revision = localStorage.getItem(SERVER_REVISION_KEY);
  const rawFileExists = localStorage.getItem(SERVER_FILE_EXISTS_KEY);

  return {
    revision: revision || null,
    fileExists: rawFileExists === null ? null : rawFileExists === 'true'
  };
}

export function saveServerSyncState({ revision, fileExists }) {
  if (fileExists === null || typeof fileExists === 'undefined') {
    localStorage.removeItem(SERVER_REVISION_KEY);
    localStorage.removeItem(SERVER_FILE_EXISTS_KEY);
    return;
  }

  localStorage.setItem(SERVER_FILE_EXISTS_KEY, fileExists ? 'true' : 'false');
  if (fileExists && revision) {
    localStorage.setItem(SERVER_REVISION_KEY, revision);
  } else {
    localStorage.removeItem(SERVER_REVISION_KEY);
  }
}

export function hasUnsyncedCalendarChanges() {
  return localStorage.getItem(UNSYNCED_CHANGES_KEY) === 'true';
}

export function setUnsyncedCalendarChanges(hasChanges) {
  if (hasChanges) {
    localStorage.setItem(UNSYNCED_CHANGES_KEY, 'true');
  } else {
    localStorage.removeItem(UNSYNCED_CHANGES_KEY);
  }
}

export function calendarDataMatches(left, right) {
  return formatCalendarAsMarkdown(left || {}, 0) === formatCalendarAsMarkdown(right || {}, 0);
}

export async function fetchServerCalendar() {
  const url = LOAD_ENDPOINT.includes('?')
    ? `${LOAD_ENDPOINT}&t=${Date.now()}`
    : `${LOAD_ENDPOINT}?t=${Date.now()}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }

  const rawData = await response.json();
  const timestamp = parseInt(rawData?.lastSavedTimestamp ?? '0', 10) || 0;
  const calendarData = normaliseCalendarEntries(rawData || {});
  const serverFileExists = typeof rawData?.serverFileExists === 'boolean'
    ? rawData.serverFileExists
    : null;
  const serverRevision = typeof rawData?.serverRevision === 'string' && rawData.serverRevision
    ? rawData.serverRevision
    : null;

  return {
    calendarData,
    lastSavedTimestamp: timestamp,
    serverSyncState: {
      revision: serverRevision,
      fileExists: serverFileExists
    }
  };
}

export async function saveCalendarToServer(calendarData, timestamp, serverSyncState) {
  if (!serverSyncState || typeof serverSyncState.fileExists !== 'boolean') {
    throw new CalendarSyncError(
      'Calendar must load the current server revision before it can save safely.',
      { status: 428, code: 'missing_revision' }
    );
  }

  if (serverSyncState.fileExists && !serverSyncState.revision) {
    throw new CalendarSyncError(
      'The server calendar exists, but its revision is unavailable.',
      { status: 428, code: 'missing_revision' }
    );
  }

  const payload = createServerPayload(calendarData, timestamp, serverSyncState);

  const response = await fetch(SYNC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorPayload = null;
    try {
      errorPayload = await response.json();
    } catch (error) {
      // Preserve the status even when an upstream proxy returns a non-JSON body.
    }

    const code = response.status === 409
      ? 'revision_conflict'
      : errorPayload?.code || 'sync_error';
    const message = errorPayload?.message || `Server responded with ${response.status}`;
    throw new CalendarSyncError(message, {
      status: response.status,
      code,
      detail: errorPayload?.detail || null
    });
  }

  const result = await response.json();
  return {
    ...result,
    serverSyncState: {
      revision: typeof result?.serverRevision === 'string' && result.serverRevision
        ? result.serverRevision
        : null,
      fileExists: result?.serverFileExists === true
    }
  };
}

/**
 * Download calendar data as JSON
 */
export function downloadCalendarData() {
  const data = getAllCalendarData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timeless-calendar-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import calendar data from JSON
 */
export function importCalendarData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    const normalised = normaliseCalendarEntries(data);

    removeLegacyKeys();

    Object.entries(normalised).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });

    localStorage.setItem('lastSavedTimestamp', Date.now().toString());
    setUnsyncedCalendarChanges(true);
    return true;
  } catch (error) {
    console.error('Error importing calendar data:', error);
    return false;
  }
}

/**
 * Export calendar data as Markdown diary
 */
export function exportAsMarkdownDiary() {
  const data = getAllCalendarData();
  const timestamp = getLocalTimestamp();
  return formatCalendarAsMarkdown(data, timestamp);
}

/**
 * Download Markdown diary
 */
export function downloadMarkdownDiary() {
  const markdown = exportAsMarkdownDiary();
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timeline.md';
  a.click();
  URL.revokeObjectURL(url);

  // Also copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown);
  }
}

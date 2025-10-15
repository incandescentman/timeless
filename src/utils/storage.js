/**
 * Local storage utilities for Timeless Calendar
 */

import { generateDayId } from './dateUtils';
import { normalizeEvents } from './eventUtils';
import { formatCalendarAsMarkdown } from './calendarDiary';

const DATE_KEY_REGEX = /^\d+_\d+_\d+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_KEY_REGEX = /^item\d+$/;

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const trimmedBase = rawApiBase.replace(/\/$/, '');
const API_ENDPOINT = trimmedBase
  ? /\.php$/i.test(trimmedBase)
    ? trimmedBase
    : `${trimmedBase}/api/calendar`
  : '/api/calendar';

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

function createServerPayload(calendarData, timestamp) {
  return {
    ...calendarData,
    lastSavedTimestamp: timestamp
  };
}

export async function fetchServerCalendar() {
  const response = await fetch(`${API_ENDPOINT}?t=${Date.now()}`, {
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

  return {
    calendarData,
    lastSavedTimestamp: timestamp
  };
}

export async function saveCalendarToServer(calendarData, timestamp) {
  const payload = createServerPayload(calendarData, timestamp);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }

  return response.json();
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
  a.download = 'jay-diary.md';
  a.click();
  URL.revokeObjectURL(url);

  // Also copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown);
  }
}

/**
 * Local storage utilities for Timeless Calendar
 */

import { generateDayId } from './dateUtils';

const DATE_KEY_REGEX = /^\d+_\d+_\d+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_KEY_REGEX = /^item\d+$/;

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
    if (!normalisedKey || typeof value !== 'string') {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const resolvedValue = resolveItemTokens(trimmed, itemMap);
    const finalValue = resolvedValue.trim();

    if (finalValue) {
      calendarData[normalisedKey] = finalValue;
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
export function saveToLocalStorage(calendarData) {
  removeLegacyKeys(calendarData);

  Object.entries(calendarData).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      localStorage.setItem(key, value.trim());
    }
  });

  // Update timestamp
  localStorage.setItem('lastSavedTimestamp', Date.now().toString());
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
      localStorage.setItem(key, value);
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
  const entries = Object.entries(data).map(([dateId, text]) => {
    const [month, day, year] = dateId.split('_').map(Number);
    const date = new Date(year, month, day);
    return { date, text };
  }).sort((a, b) => a.date - b.date);

  let markdown = '# Calendar Diary\n\n';
  let currentYear = null;
  let currentMonth = null;

  entries.forEach(({ date, text }) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (year !== currentYear) {
      currentYear = year;
      markdown += `## ${year}\n\n`;
    }

    if (month !== currentMonth) {
      currentMonth = month;
      const monthNames = ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"];
      markdown += `### ${monthNames[month]}\n\n`;
    }

    markdown += `**${day}**: ${text}\n\n`;
  });

  return markdown;
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
  a.download = `calendar-diary-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);

  // Also copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(markdown);
  }
}

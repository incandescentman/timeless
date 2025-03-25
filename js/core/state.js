/*
 * Timeless: The Infinitely Scrolling Calendar
 *
 * A single-page application that displays a continuously scrolling calendar.
 * Users can add notes to any day, toggle dark mode, import/export data, and more.
 *
 * core/state.js
 * This file contains the global state for the app.
 */

// Force local midnight date to avoid time-zone hour offsets
const now = new Date();
export let systemToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
systemToday.setHours(0, 0, 0, 0);

// The "currentCalendarDate" is what we consider "today" within the calendar logic.
export let currentCalendarDate = new Date(systemToday);

// Helper functions to update currentCalendarDate
export function updateCurrentCalendarDate(newDate) {
  currentCalendarDate.setTime(new Date(newDate).getTime());
  return currentCalendarDate;
}

export function resetToToday() {
  currentCalendarDate.setTime(systemToday.getTime());
  return currentCalendarDate;
}

// Global variable for keyboard navigation focus.
export let keyboardFocusDate = null;

// Flag for keyboard navigation mode
export let keyboardNavMode = false;

// Flag for multi-select mode.
export let isMultiSelectMode = false;

// Date range selection state.
export let rangeStart = null;
export let rangeEnd = null;

// Undo/redo logic for localStorage snapshots.
export let undoStack = [];
export let redoStack = [];
export const MAX_UNDO = 50;

// Store a value for an item ID in localStorage
export function storeValueForItemId(itemId, value) {
  if (!itemId) return false;
  
  const textarea = document.getElementById(itemId);
  const val = value || (textarea ? textarea.value : "");
  
  // Don't store empty notes
  if (!val.trim()) {
    removeValueForItemId(itemId);
    return false;
  }
  
  // Record for undo
  const oldValue = localStorage.getItem(itemId);
  if (oldValue !== val) {
    const undoData = {};
    if (oldValue) undoData[itemId] = oldValue;
    undoStack.push(undoData);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0; // Clear redo stack on new change
  }
  
  localStorage.setItem(itemId, val);
  return true;
}

// Make this function available globally
window.storeValueForItemId = storeValueForItemId;

// Remove a value from localStorage and update parent references
export function removeValueForItemId(itemId) {
  if (!itemId || !localStorage[itemId]) return;
  
  // Find which day this item belongs to
  for (const key in localStorage) {
    if (key.includes("_") && !key.startsWith("item_")) {
      // This looks like a day cell ID (e.g., "1_15_2023")
      const itemIds = localStorage[key].split(",");
      const idx = itemIds.indexOf(itemId);
      if (idx !== -1) {
        // Record for undo
        const undoData = {};
        undoData[itemId] = localStorage[itemId];
        undoData[key] = localStorage[key];
        undoStack.push(undoData);
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack.length = 0;
        
        // Remove from list and update localStorage
        itemIds.splice(idx, 1);
        if (itemIds.length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage[key] = itemIds.join(",");
        }
        break;
      }
    }
  }
  
  // Remove the item itself
  localStorage.removeItem(itemId);
}

// -----------------------------------------------------------------------------
// Internal variables (not exported) for use within the app.
// (If you need to export these for other modules, add them to the export list.)
let calendarTableElement; // e.g., set via a setter from the UI module.
let firstDate, lastDate;
let isSelectingRange = false;
const ROW_ANIMATION_CLASS = 'week-row-animate';
const daysOfWeek = ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const shortMonths = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsShort = shortMonths;
let startTime, startY, goalY;
let currentVisibleRow = '';
let selectedDays = [];

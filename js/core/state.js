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

// Global variable for keyboard navigation focus.
export let keyboardFocusDate = null;

// Flag for multi-select mode.
export let isMultiSelectMode = false;

// Date range selection state.
export let rangeStart = null;
export let rangeEnd = null;

// Undo/redo logic for localStorage snapshots.
export let undoStack = [];
export let redoStack = [];
export const MAX_UNDO = 5;

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

/*
 * Timeless: The Infinitely Scrolling Calendar
 *
 * A single-page application that displays a continuously scrolling calendar.
 * Users can add notes to any day, toggle dark mode, import/export data, and more.
 */

// ========== CORE VARIABLES & STATE ==========

// Force local midnight date to avoid time-zone hour offsets
// At the beginning of your code
// Force local midnight date to avoid time-zone hour offsets
/*
 * Timeless: The Infinitely Scrolling Calendar
 *
 * A single-page application that displays a continuously scrolling calendar.
 * Users can add notes to any day, toggle dark mode, import/export data, and more.
 */

// ========== CORE VARIABLES & STATE ==========

// Force local midnight date to avoid time-zone hour offsets
// At the beginning of your code
// Force local midnight date to avoid time-zone hour offsets

/*
 * Timeless: The Infinitely Scrolling Calendar
 * core/state.js
 *
 * This file contains the global state for the app.
 */

// Force local midnight date to avoid time-zone hour offsets
const now = new Date();
export let systemToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// Make sure to set hours/min/sec to 0 to avoid any time-based issues
systemToday.setHours(0, 0, 0, 0);

// The "currentCalendarDate" is what we consider "today" within the calendar logic
export let currentCalendarDate = new Date();

// Global variable for keyboard navigation focus
export let keyboardFocusDate = null;

// Flag for multi-select mode
export let isMultiSelectMode = false;

// Optionally, you can add more state exports if needed:
export let rangeStart = null;
export let rangeEnd = null;





// The main <table> element that holds day cells
let calendarTableElement;

// "firstDate" and "lastDate" track the earliest + latest days loaded
let firstDate, lastDate;

// Undo/redo logic uses arrays to store JSON snapshots of localStorage
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 5;

// Date range selection state

let isSelectingRange = false;

// For row insertion animations
const ROW_ANIMATION_CLASS = 'week-row-animate';

// Arrays for day-of-week and month-of-year names
const daysOfWeek = ["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];
// Short month labels for mobile
const shortMonths = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];
const monthsShort = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

// Variables for smooth-scrolling animations
let startTime, startY, goalY;

// If we used to track "currentVisibleMonth", we now track the row instead.
let currentVisibleRow = '';


// Multi-select mode
let selectedDays = [];


// core/state.js

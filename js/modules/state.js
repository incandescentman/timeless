/*
 * state.js - Application State Management
 * 
 * This module manages all global state for the application, including:
 * - Current date tracking
 * - Calendar table element reference
 * - Undo/redo history
 * - Selection state
 */

// Force local midnight date to avoid time-zone hour offsets
const now = new Date();
export let systemToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
systemToday.setHours(0, 0, 0, 0);

// The "currentCalendarDate" is what we consider "today" within the calendar logic
export let currentCalendarDate;

// The main <table> element that holds day cells
export let calendarTableElement;

// "firstDate" and "lastDate" track the earliest + latest days loaded
export let firstDate, lastDate;

// Undo/redo logic uses arrays to store JSON snapshots of localStorage
export let undoStack = [];
export let redoStack = [];
export const MAX_UNDO = 5;

// Date range selection state
export let rangeStart = null;
export let rangeEnd = null;
export let isSelectingRange = false;

// For row insertion animations
export const ROW_ANIMATION_CLASS = 'week-row-animate';

// Arrays for day-of-week and month-of-year names
export const daysOfWeek = ["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
export const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];
// Short month labels for mobile
export const shortMonths = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];
export const monthsShort = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

// Variables for smooth-scrolling animations
export let startTime, startY, goalY;

// Current visible month/row tracking
export let currentVisibleRow = '';
export let keyboardFocusDate = null;  // used for arrow key navigation

// Multi-select mode
export let selectedDays = [];
export let isMultiSelectMode = false;

// Mini calendar tracking
export let lastMiniCalendarMonth = null;

/**
 * Initialize the application state
 */
export function initializeState() {
    currentCalendarDate = new Date(systemToday);
    calendarTableElement = document.getElementById("calendar");
}

/**
 * Get a unique ID for a date like "2_14_2025" for Feb 14, 2025
 */
export function idForDate(date) {
    return date.getMonth() + "_" + date.getDate() + "_" + date.getFullYear();
}

/**
 * Convert a date ID back to an ISO date string
 */
export function parseDateFromId(idStr) {
    const parts = idStr.split("_");
    if (parts.length !== 3) return null;
    const [month, day, year] = parts.map(Number);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns 0..6 for Monday..Sunday, shifting JS's default Sunday=0
 */
export function getAdjustedDayIndex(date) {
    const day = date.getDay();  // 0..6 (Sun..Sat)
    return day === 0 ? 6 : day - 1; // Re-map so Monday=0, Sunday=6
}

/**
 * Generate a unique ID for a new note item
 */
export function nextItemId() {
    localStorage.nextId = localStorage.nextId ? parseInt(localStorage.nextId) + 1 : 0;
    return "item" + localStorage.nextId;
} 
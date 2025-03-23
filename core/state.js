// core/state.js

// Global state variables for the calendar app

// Holds the current calendar date used by the UI
export let currentCalendarDate = null;

// System's current date. This can be used to initialize calendar views.
export const systemToday = new Date();

// Reference to the calendar table element in the DOM
export let calendarTableElement = null;

// Additional state variables (placeholders for potential future use)
export let firstDate = null;
export let lastDate = null;

// ui/calendarfunctions.js

// Import functions from dom.js and state.js (make sure these functions/variables are exported from those modules)
import {
  showLoading,
  hideLoading,
  showToast,
  recalculateAllHeights,
  documentScrollTop,
  documentScrollHeight,
  scrollPositionForElement,
  updateStickyMonthHeader,
  getAdjustedDayIndex,       // exported from dom.js
  idForDate,                 // exported from dom.js
  animateRowInsertion        // exported from dom.js
} from "./dom.js";

import { buildMiniCalendar } from "./minicalendar.js"; // ensure the export name matches (capital M)

import { currentCalendarDate, systemToday, keyboardFocusDate } from "../core/state.js";

// Module-level variable for the calendar table element:
let calendarTableElement;

// Export a setter so that init.js can set the calendar table element:
export function setCalendarTableElement(element) {
  calendarTableElement = element;
}

// Module-level variables used for the calendar
let firstDate, lastDate;
let lastMiniCalendarMonth = null;

// --- Function definitions ---

export function loadCalendarAroundDate(seedDate) {
  showLoading();
  const container = document.getElementById('calendarContainer');
  container.classList.add('loading-calendar');

  // Start from seedDate, roll back to Monday
  calendarTableElement.innerHTML = "";
  firstDate = new Date(seedDate);
  while (getAdjustedDayIndex(firstDate) !== 0) {
    firstDate.setDate(firstDate.getDate() - 1);
  }
  lastDate = new Date(firstDate);
  lastDate.setDate(lastDate.getDate() - 1);

  // Insert the first row
  appendWeek();

  // Insert additional weeks to fill the screen:
  for (let i = 0; i < 3; i++) {
    prependWeek();
  }
  for (let i = 0; i < 5; i++) {
    appendWeek();
  }

  function loadBatch() {
    let batchCount = 0;
    // Keep adding weeks until the document is tall enough:
    while (documentScrollHeight() <= window.innerHeight && batchCount < 2) {
      prependWeek();
      appendWeek();
      batchCount++;
    }
    if (documentScrollHeight() <= window.innerHeight) {
      setTimeout(loadBatch, 0);
    } else {
      container.classList.remove('loading-calendar');
      scrollToToday();
      recalculateAllHeights();
      updateStickyMonthHeader();

      if (currentCalendarDate.getMonth() !== lastMiniCalendarMonth) {
        buildMiniCalendar();
        lastMiniCalendarMonth = currentCalendarDate.getMonth();
      }

      // If keyboardFocusDate exists and a global highlight function is defined, call it.
      if (keyboardFocusDate && typeof window.highlightKeyboardFocusedDay === 'function') {
        window.highlightKeyboardFocusedDay();
      }
      hideLoading();
    }
  }
  loadBatch();
}

export function scrollToToday() {
  const elem = document.getElementById(idForDate(currentCalendarDate));
  if (elem) {
    window.scrollTo(0, scrollPositionForElement(elem));
  }
  hideLoading();
}

export function goToTodayAndRefresh() {
  // Reset currentCalendarDate to systemToday
  currentCalendarDate = new Date(systemToday);

  // Reset any visible row reference (assumed to be a global variable, e.g., on window)
  window.currentVisibleRow = null;

  // Scroll to top
  window.scrollTo(0, 0);

  // Rebuild the calendar
  calendarTableElement.innerHTML = "";
  loadCalendarAroundDate(currentCalendarDate);

  // After a delay, scroll smoothly to the day cell
  setTimeout(() => {
    const elem = document.getElementById(idForDate(currentCalendarDate));
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 500);
}

export function appendWeek() {
  let daysForThisRow = [];
  for (let i = 0; i < 7; i++) {
    lastDate.setDate(lastDate.getDate() + 1);
    if (lastDate.getDate() === 1) {
      const headingRow = calendarTableElement.insertRow(-1);
      headingRow.classList.add('month-boundary');
      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7;
      headingCell.className = 'extra';
      // Assuming that a global array "months" is defined in your original file.
      headingCell.innerHTML = months[lastDate.getMonth()] + " " + lastDate.getFullYear();
      headingRow.dataset.monthIndex = lastDate.getMonth();
      headingRow.dataset.year = lastDate.getFullYear();
    }
    daysForThisRow.push(new Date(lastDate));
  }
  const row = calendarTableElement.insertRow(-1);
  animateRowInsertion(row, 'append');
  row.dataset.monthIndex = lastDate.getMonth();
  row.dataset.year = lastDate.getFullYear();
  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

export function prependWeek() {
  let daysForThisRow = [];
  for (let i = 0; i < 7; i++) {
    firstDate.setDate(firstDate.getDate() - 1);
    if (firstDate.getDate() === 1) {
      const headingRow = calendarTableElement.insertRow(0);
      headingRow.classList.add('month-boundary');
      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7;
      headingCell.className = 'extra';
      headingCell.innerHTML = months[firstDate.getMonth()] + " " + firstDate.getFullYear();
      headingRow.dataset.monthIndex = firstDate.getMonth();
      headingRow.dataset.year = firstDate.getFullYear();
    }
    daysForThisRow.push(new Date(firstDate));
  }
  const row = calendarTableElement.insertRow(0);
  animateRowInsertion(row, 'prepend');
  row.dataset.monthIndex = firstDate.getMonth();
  row.dataset.year = firstDate.getFullYear();
  daysForThisRow.reverse();
  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

export function generateDay(dayCell, date) {
  // Here we assume that global arrays "daysOfWeek" and "shortMonths" (and "months") are available.
  // You could also import these from a configuration module if desired.
  const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
  if (isWeekend) dayCell.classList.add("weekend");
  const isShaded = (date.getMonth() % 2 === 1);
  if (isShaded) dayCell.classList.add("shaded");
  const isToday = (
    date.getFullYear() === currentCalendarDate.getFullYear() &&
    date.getMonth() === currentCalendarDate.getMonth() &&
    date.getDate() === currentCalendarDate.getDate()
  );
  if (isToday) dayCell.classList.add("today");
  dayCell.id = idForDate(date);
  if (window.innerWidth <= 768) {
    const monthShort = shortMonths[date.getMonth()];
    const dowLabel = daysOfWeek[getAdjustedDayIndex(date)];
    const dayNum = date.getDate();
    dayCell.innerHTML = `
          <div class="day-top-row">
            <span class="day-label">${dowLabel}</span>
            <div class="month-day-container">
              <span class="month-label">${monthShort}</span>
              <span class="day-number">${dayNum}</span>
            </div>
          </div>
        `;
  } else {
    dayCell.innerHTML = `
          <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
          <span class="day-number">${date.getDate()}</span>
        `;
  }
  // Assume that lookupItemsForParentId, generateItem, recalculateHeight, processNoteTags are available globally.
  lookupItemsForParentId(dayCell.id, items => {
    items.forEach(it => {
      const note = generateItem(dayCell.id, it.itemId);
      if (note) {
        note.value = it.itemValue;
        recalculateHeight(note.id);
        processNoteTags(note);
      }
    });
  });
}


// ui/calendarfunctions.js


// --- Function definitions ---

export function loadCalendarAroundDate(seedDate) {
  showLoading();
  const container = document.getElementById('calendarContainer');
  container.classList.add('loading-calendar');

  // Start from seedDate, roll back to Monday
  calendarTableElement.innerHTML = "";
  firstDate = new Date(seedDate);
  while (getAdjustedDayIndex(firstDate) !== 0) {
    firstDate.setDate(firstDate.getDate() - 1);
  }
  lastDate = new Date(firstDate);
  lastDate.setDate(lastDate.getDate() - 1);

  // Insert the first row
  appendWeek();

  // Insert additional weeks to fill the screen:
  for (let i = 0; i < 3; i++) {
    prependWeek();
  }
  for (let i = 0; i < 5; i++) {
    appendWeek();
  }

  function loadBatch() {
    let batchCount = 0;
    // Keep adding weeks until the document is tall enough
    while (documentScrollHeight() <= window.innerHeight && batchCount < 2) {
      prependWeek();
      appendWeek();
      batchCount++;
    }
    if (documentScrollHeight() <= window.innerHeight) {
      setTimeout(loadBatch, 0);
    } else {
      container.classList.remove('loading-calendar');
      scrollToToday();
      recalculateAllHeights();
      updateStickyMonthHeader();

      // Rebuild mini-calendar if month changed
      if (currentCalendarDate.getMonth() !== lastMiniCalendarMonth) {
        buildMiniCalendar();
        lastMiniCalendarMonth = currentCalendarDate.getMonth();
      }

      // Highlight the focused day if applicable
      if (keyboardFocusDate && typeof highlightKeyboardFocusedDay === 'function') {
        highlightKeyboardFocusedDay();
      }
      hideLoading();
    }
  }
  loadBatch();
}

export function scrollToToday() {
  const elem = document.getElementById(idForDate(currentCalendarDate));
  if (elem) {
    window.scrollTo(0, scrollPositionForElement(elem));
  }
  hideLoading();
}

export function goToTodayAndRefresh() {
  // Reset currentCalendarDate to systemToday
  currentCalendarDate = new Date(systemToday);

  // Clear any visible row reference
  window.currentVisibleRow = null;

  // Scroll to top
  window.scrollTo(0, 0);

  // Rebuild the calendar
  calendarTableElement.innerHTML = "";
  loadCalendarAroundDate(currentCalendarDate);

  // After a delay, scroll smoothly to the day
  setTimeout(() => {
    const elem = document.getElementById(idForDate(currentCalendarDate));
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 500);
}

export function appendWeek() {
  let daysForThisRow = [];
  for (let i = 0; i < 7; i++) {
    lastDate.setDate(lastDate.getDate() + 1);
    if (lastDate.getDate() === 1) {
      const headingRow = calendarTableElement.insertRow(-1);
      headingRow.classList.add('month-boundary');
      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7;
      headingCell.className = 'extra';
      headingCell.innerHTML = months[lastDate.getMonth()] + " " + lastDate.getFullYear();
      headingRow.dataset.monthIndex = lastDate.getMonth();
      headingRow.dataset.year = lastDate.getFullYear();
    }
    daysForThisRow.push(new Date(lastDate));
  }
  const row = calendarTableElement.insertRow(-1);
  animateRowInsertion(row, 'append');
  row.dataset.monthIndex = lastDate.getMonth();
  row.dataset.year = lastDate.getFullYear();
  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

export function prependWeek() {
  let daysForThisRow = [];
  for (let i = 0; i < 7; i++) {
    firstDate.setDate(firstDate.getDate() - 1);
    if (firstDate.getDate() === 1) {
      const headingRow = calendarTableElement.insertRow(0);
      headingRow.classList.add('month-boundary');
      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7;
      headingCell.className = 'extra';
      headingCell.innerHTML = months[firstDate.getMonth()] + " " + firstDate.getFullYear();
      headingRow.dataset.monthIndex = firstDate.getMonth();
      headingRow.dataset.year = firstDate.getFullYear();
    }
    daysForThisRow.push(new Date(firstDate));
  }
  const row = calendarTableElement.insertRow(0);
  animateRowInsertion(row, 'prepend');
  row.dataset.monthIndex = firstDate.getMonth();
  row.dataset.year = firstDate.getFullYear();
  daysForThisRow.reverse();
  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

export function generateDay(dayCell, date) {
  const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
  if (isWeekend) dayCell.classList.add("weekend");
  const isShaded = (date.getMonth() % 2 === 1);
  if (isShaded) dayCell.classList.add("shaded");
  const isToday = (
    date.getFullYear() === currentCalendarDate.getFullYear() &&
    date.getMonth() === currentCalendarDate.getMonth() &&
    date.getDate() === currentCalendarDate.getDate()
  );
  if (isToday) dayCell.classList.add("today");
  dayCell.id = idForDate(date);
  if (window.innerWidth <= 768) {
    const monthShort = shortMonths[date.getMonth()];
    const dowLabel = daysOfWeek[getAdjustedDayIndex(date)];
    const dayNum = date.getDate();
    dayCell.innerHTML = `
          <div class="day-top-row">
            <span class="day-label">${dowLabel}</span>
            <div class="month-day-container">
              <span class="month-label">${monthShort}</span>
              <span class="day-number">${dayNum}</span>
            </div>
          </div>
        `;
  } else {
    dayCell.innerHTML = `
          <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
          <span class="day-number">${date.getDate()}</span>
        `;
  }
  // Assumes lookupItemsForParentId, generateItem, recalculateHeight, processNoteTags are available globally
  lookupItemsForParentId(dayCell.id, items => {
    items.forEach(it => {
      const note = generateItem(dayCell.id, it.itemId);
      if (note) {
        note.value = it.itemValue;
        recalculateHeight(note.id);
        processNoteTags(note);
      }
    });
  });
}

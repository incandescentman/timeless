// ui/calendarfunctions.js

// Import functions and state from other modules:
import {
  showLoading,
  hideLoading,
  showToast,
  recalculateAllHeights,
  documentScrollTop,
  documentScrollHeight,
  scrollPositionForElement,
  updateStickyMonthHeader,
  getAdjustedDayIndex,  // exported from dom.js
  idForDate,            // exported from dom.js
  animateRowInsertion,  // exported from dom.js
  generateItem,         // added import
  recalculateHeight,    // added import
  processNoteTags       // added import
} from "./dom.js";

import { buildMiniCalendar } from "./minicalendar.js"; // Make sure this module exports buildMiniCalendar (capital M)
import { currentCalendarDate, systemToday, keyboardFocusDate, resetToToday } from "../core/state.js";

// UI strings for calendar display:
const daysOfWeek = ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const shortMonths = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsShort = shortMonths; // same as shortMonths in this case

// Module-level variable for the calendar table element.
let calendarTableElement;


// If we used to track "currentVisibleMonth", we now track the row instead.
let currentVisibleRow = '';


// Export a setter so that init.js can set the calendar table element.
export function setCalendarTableElement(element) {
  calendarTableElement = element;
}

// Module-level variables used for week management.
let firstDate, lastDate;
let lastMiniCalendarMonth = null;

// --- Function definitions ---

export function loadCalendarAroundDate(seedDate) {
  showLoading();
  const container = document.getElementById('calendarContainer');
  container.classList.add('loading-calendar');

  // Clear the calendar table and initialize firstDate.
  calendarTableElement.innerHTML = "";
  firstDate = new Date(seedDate);
  // Roll back to Monday.
  while (getAdjustedDayIndex(firstDate) !== 0) {
    firstDate.setDate(firstDate.getDate() - 1);
  }
  lastDate = new Date(firstDate);
  lastDate.setDate(lastDate.getDate() - 1);

  // Insert the first week row.
  appendWeek();

  // Add additional weeks to fill the screen.
  for (let i = 0; i < 3; i++) {
    prependWeek();
  }
  for (let i = 0; i < 5; i++) {
    appendWeek();
  }

  // Load more weeks if necessary.
  function loadBatch() {
    let batchCount = 0;
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

      // If a global highlight function is available and keyboardFocusDate exists, call it.
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
  // Reset currentCalendarDate to today using the utility function that modifies in place
  resetToToday();
  // Reset any visible row reference.
  window.currentVisibleRow = null;
  // Scroll to the top.
  window.scrollTo(0, 0);
  // Rebuild the calendar.
  calendarTableElement.innerHTML = "";
  loadCalendarAroundDate(currentCalendarDate);
  // After a delay, scroll smoothly to the current day.
  setTimeout(() => {
    const elem = document.getElementById(idForDate(currentCalendarDate));
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 500);
}

// Also expose the function globally for use by HTML event handlers
window.goToTodayAndRefresh = goToTodayAndRefresh;

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
  // Weekend shading.
  const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
  if (isWeekend) dayCell.classList.add("weekend");
  // Shaded style for alternating months.
  const isShaded = (date.getMonth() % 2 === 1);
  if (isShaded) dayCell.classList.add("shaded");
  // Highlight today.
  const isToday = (
    date.getFullYear() === currentCalendarDate.getFullYear() &&
    date.getMonth() === currentCalendarDate.getMonth() &&
    date.getDate() === currentCalendarDate.getDate()
  );
  if (isToday) dayCell.classList.add("today");
  
  // System today highlight
  const isSystemToday = (
    date.getFullYear() === systemToday.getFullYear() &&
    date.getMonth() === systemToday.getMonth() &&
    date.getDate() === systemToday.getDate()
  );
  if (isSystemToday) {
    dayCell.classList.add("system-today");
    // Add a small dot indicator to show the true current day
    const dot = document.createElement("div");
    dot.className = "current-day-dot";
    dayCell.appendChild(dot);
  }
  
  // Set a unique ID for the day cell.
  dayCell.id = idForDate(date);
  
  // Create inner HTML based on device width
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
  
  // Add the day's events/notes from localStorage
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


export function lookupItemsForParentId(parentId, callback) {
    if (localStorage[parentId]) {
        const ids = localStorage[parentId].split(",");
        const items = [];
        ids.forEach(it => {
            const val = localStorage[it];
            if (val !== undefined) {
                items.push({ itemId: it, itemValue: val });
            }
        });
        callback(items);
    }
}




/*
 * jumpOneMonthForward(), jumpOneMonthBackward()
 *  - Use the row's monthIndex/year to figure out the next/previous month's 1st day,
 *    then call smoothScrollToDate().
 */


export function jumpOneMonthForward() {
  if (!currentVisibleRow) return;
  let year = parseInt(currentVisibleRow.dataset.year, 10);
  let month = parseInt(currentVisibleRow.dataset.monthIndex, 10);

  month++;
  if (month > 11) {
    month = 0;
    year++;
  }

  // Create a date object centered on the 1st of the target month
  const nextDate = new Date(year, month, 1);

  // Reset the currentVisibleRow reference before navigating
  currentVisibleRow = null;

  // Then load calendar and scroll to the date
  smoothScrollToDate(nextDate);
}
window.jumpOneMonthBackward = jumpOneMonthBackward;


export function jumpOneMonthBackward() {
  if (!currentVisibleRow) return;
  let year = parseInt(currentVisibleRow.dataset.year, 10);
  let month = parseInt(currentVisibleRow.dataset.monthIndex, 10);

  month--;
  if (month < 0) {
    month = 11;
    year--;
  }

  // Create a date object centered on the 1st of the target month
  const prevDate = new Date(year, month, 1);

  // Reset the currentVisibleRow reference before navigating
  currentVisibleRow = null;

  // Then load calendar and scroll to the date
  smoothScrollToDate(prevDate);
}

window.jumpOneMonthForward = jumpOneMonthForward;

// Smoothly scroll to a specific date
export function smoothScrollToDate(targetDate) {
  if (!targetDate) return;
  
  // First ensure the calendar is loaded around that date
  loadCalendarAroundDate(targetDate);
  
  // Then find the element and scroll to it smoothly
  setTimeout(() => {
    const elem = document.getElementById(idForDate(targetDate));
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100); // Small delay to ensure the calendar is fully loaded
}


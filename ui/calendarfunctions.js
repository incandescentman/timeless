// ui/calendarfunctions.js

//
// Below are the functions verbatim from calendar.js, with only "export" added
// so this file can serve as an ES module. No other code has been added or changed.
//

// ui/calendarfunctions.js

import { showLoading, hideLoading, showToast, recalculateAllHeights } from "./dom.js";
import { updateStickyMonthHeader } from "./dom.js"; // if it's defined there
import { buildMiniCalendar } from "./minicalendar.js"; // if mini calendar functions are here


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

    // Insert a bunch of weeks before/after to ensure there's enough content:
    for (let i = 0; i < 3; i++) {
      prependWeek();
    }
    for (let i = 0; i < 5; i++) {
      appendWeek();
    }

    function loadBatch() {
        let batchCount = 0;
        // Keep adding top/bottom weeks until screen is filled (or do a max iteration)
        while (documentScrollHeight() <= window.innerHeight && batchCount < 2) {
            prependWeek();
            appendWeek();
            batchCount++;
        }
        if (documentScrollHeight() <= window.innerHeight) {
            setTimeout(loadBatch, 0);
        } else {
            // Done loading
            container.classList.remove('loading-calendar');
            scrollToToday();
            recalculateAllHeights();
            updateStickyMonthHeader();

            // Rebuild mini-calendar if our month changed
            if (currentCalendarDate.getMonth() !== lastMiniCalendarMonth) {
                buildMiniCalendar();
                lastMiniCalendarMonth = currentCalendarDate.getMonth();
            }

            // If we were using keyboardFocusDate, highlight that day
            if (keyboardFocusDate) {
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
    // Reset currentCalendarDate to actual system today
    currentCalendarDate = new Date(systemToday);

    // Reset currentVisibleRow so we don't scroll to an old row
    currentVisibleRow = null;

    // Clear any previous scroll position
    window.scrollTo(0, 0);

    // Completely rebuild the calendar with today at the center
    calendarTableElement.innerHTML = "";
    loadCalendarAroundDate(currentCalendarDate);

    // Increase delay to ensure calendar has time to render
    setTimeout(() => {
        const elem = document.getElementById(idForDate(currentCalendarDate));
        if (elem) {
            elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 500);
}

export function appendWeek() {
  // We'll gather the 7 upcoming days in an array first
  let daysForThisRow = [];

  // Build a list of 7 consecutive days
  for (let i = 0; i < 7; i++) {
    lastDate.setDate(lastDate.getDate() + 1);

    // If we're about to generate day=1, insert a heading row for "Month Year"
    if (lastDate.getDate() === 1) {
      // Insert a separate row for the heading BEFORE we add the actual day row.
      const headingRow = calendarTableElement.insertRow(-1);
      headingRow.classList.add('month-boundary');

      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7; // or 8, if you prefer
      headingCell.className = 'extra';
      headingCell.innerHTML =
        months[lastDate.getMonth()] + " " + lastDate.getFullYear();

      // Optionally store row data for the heading row
      headingRow.dataset.monthIndex = lastDate.getMonth();
      headingRow.dataset.year       = lastDate.getFullYear();
    }

    // Collect this day in our array
    daysForThisRow.push(new Date(lastDate));
  }

  // Now create the "week row" itself and fill it with these 7 days.
  const row = calendarTableElement.insertRow(-1);
  animateRowInsertion(row, 'append');

  // For tracking
  row.dataset.monthIndex = lastDate.getMonth();
  row.dataset.year       = lastDate.getFullYear();

  // Fill the cells
  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

export function prependWeek() {
  // We'll gather the 7 previous days in an array first
  let daysForThisRow = [];

  for (let i = 0; i < 7; i++) {
    // Move firstDate backward by 1 day
    firstDate.setDate(firstDate.getDate() - 1);

    // If we discover day=1, insert heading row above
    if (firstDate.getDate() === 1) {
      const headingRow = calendarTableElement.insertRow(0);
      // Insert at index 0 so it appears above the upcoming week row

      headingRow.classList.add('month-boundary');
      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7;
      headingCell.className = 'extra';
      headingCell.innerHTML =
        months[firstDate.getMonth()] + " " + firstDate.getFullYear();

      headingRow.dataset.monthIndex = firstDate.getMonth();
      headingRow.dataset.year       = firstDate.getFullYear();
    }

    // Collect this day
    daysForThisRow.push(new Date(firstDate));
  }

  // Now we actually create the "week row" at index 0 so it's on top
  const row = calendarTableElement.insertRow(0);
  animateRowInsertion(row, 'prepend');

  row.dataset.monthIndex = firstDate.getMonth();
  row.dataset.year       = firstDate.getFullYear();

  // Because we built daysForThisRow from newest to oldest,
  // we may want to reverse it so it displays Monday..Tuesday.. etc
  daysForThisRow.reverse();

  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

export function generateDay(dayCell, date) {
    // Weekend shading
    const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
    if (isWeekend) dayCell.classList.add("weekend");

    // "Shaded" alternating months
    const isShaded = (date.getMonth() % 2 === 1);
    if (isShaded) dayCell.classList.add("shaded");

    // Is it "today"?
    const isToday = (
        date.getFullYear() === currentCalendarDate.getFullYear() &&
        date.getMonth() === currentCalendarDate.getMonth() &&
        date.getDate() === currentCalendarDate.getDate()
    );
    if (isToday) dayCell.classList.add("today");

    // Unique ID like "2_10_2025" for each day cell
    dayCell.id = idForDate(date);

    // For mobile, a top-row layout with day label on left, month+day number on right
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
        // Desktop layout
        dayCell.innerHTML = `
          <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
          <span class="day-number">${date.getDate()}</span>
        `;
    }

    // Restore any notes stored for this day
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


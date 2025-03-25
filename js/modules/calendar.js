/*
 * calendar.js - Calendar Management
 * 
 * This module handles calendar building and manipulation including:
 * - Loading calendar around a date
 * - Adding/removing weeks
 * - Day cell generation
 */

import { 
    calendarTableElement, currentCalendarDate, firstDate, lastDate, 
    idForDate, getAdjustedDayIndex, months, daysOfWeek, shortMonths, 
    systemToday, lastMiniCalendarMonth, keyboardFocusDate
} from './state.js';
import { showLoading, hideLoading, documentScrollHeight } from './utils.js';
import { recalculateAllHeights } from './notes.js';
import { buildMiniCalendar } from './miniCalendar.js';
import { updateStickyMonthHeader } from './header.js';
import { scrollToToday } from './navigation.js';
import { highlightKeyboardFocusedDay } from './keyboard.js';
import { animateRowInsertion } from './animations.js';
import { generateDay } from './day.js';

/**
 * Loads calendar around the given date, creating enough weeks to fill the screen
 */
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

/**
 * Inserts a new <tr> at the top, stepping "firstDate" backward by 7 days
 */
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
            headingRow.dataset.year = firstDate.getFullYear();
        }

        // Collect this day
        daysForThisRow.push(new Date(firstDate));
    }

    // Now we actually create the "week row" at index 0 so it's on top
    const row = calendarTableElement.insertRow(0);
    animateRowInsertion(row, 'prepend');

    row.dataset.monthIndex = firstDate.getMonth();
    row.dataset.year = firstDate.getFullYear();

    // Because we built daysForThisRow from newest to oldest,
    // we may want to reverse it so it displays Monday..Tuesday.. etc
    daysForThisRow.reverse();

    for (let dayObj of daysForThisRow) {
        const cell = row.insertCell(-1);
        generateDay(cell, dayObj);
    }
}

/**
 * Adds a new <tr> at the bottom, stepping "lastDate" forward by 7 days
 */
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
            headingRow.dataset.year = lastDate.getFullYear();
        }

        // Collect this day in our array
        daysForThisRow.push(new Date(lastDate));
    }

    // Now create the "week row" itself and fill it with these 7 days.
    const row = calendarTableElement.insertRow(-1);
    animateRowInsertion(row, 'append');

    // For tracking
    row.dataset.monthIndex = lastDate.getMonth();
    row.dataset.year = lastDate.getFullYear();

    // Fill the cells
    for (let dayObj of daysForThisRow) {
        const cell = row.insertCell(-1);
        generateDay(cell, dayObj);
    }
} 
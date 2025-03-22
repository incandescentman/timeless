/*
 * navigation.js - Calendar Navigation
 * 
 * This module handles calendar navigation, including scrolling
 * to specific dates and day selection.
 */

import { 
    currentCalendarDate, currentVisibleRow, systemToday, 
    startTime, startY, goalY, idForDate 
} from './state.js';
import { scrollPositionForElement, documentScrollTop, showLoading, hideLoading } from './utils.js';
import { loadCalendarAroundDate } from './calendar.js';
import { scrollAnimation } from './animations.js';

/**
 * Jumps immediately to the row containing "currentCalendarDate"
 */
export function scrollToToday() {
    const elem = document.getElementById(idForDate(currentCalendarDate));
    if (elem) {
        window.scrollTo(0, scrollPositionForElement(elem));
    }
    hideLoading();
}

/**
 * Smoothly animates to the row containing "currentCalendarDate"
 */
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

/**
 * Loads the calendar around the given date, then animates to it
 */
export function smoothScrollToDate(dateObj) {
    showLoading();
    loadCalendarAroundDate(dateObj);
    setTimeout(() => {
        const el = document.getElementById(idForDate(dateObj));
        if (!el) {
            hideLoading();
            return;
        }
        goalY = scrollPositionForElement(el);
        startY = documentScrollTop();
        startTime = new Date();
        if (goalY !== startY) setTimeout(scrollAnimation, 10);
        else hideLoading();
    }, 200);
}

/**
 * Use the row's monthIndex/year to find next month's 1st day, then call smoothScrollToDate()
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

/**
 * Use the row's monthIndex/year to find previous month's 1st day, then call smoothScrollToDate()
 */
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

/**
 * Jumps to specific date from date picker input
 */
export function jumpToDate() {
    const val = document.getElementById("jumpDate").value;
    if (!val) return;
    showLoading();
    const [yyyy, mm, dd] = val.split("-");
    const jumpDateObj = new Date(yyyy, mm - 1, dd);
    currentCalendarDate = jumpDateObj;
    loadCalendarAroundDate(currentCalendarDate);
    setTimeout(() => goToTodayAndRefresh(), 300);
} 
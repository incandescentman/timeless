/*
 * Timeless: The Infinitely Scrolling Calendar
 *
 * A single-page application that displays a continuously scrolling calendar.
 * Users can add notes to any day, toggle dark mode, import/export data, and more.
 */

import {
    state,
    ROW_ANIMATION_CLASS,
    daysOfWeek,
    months,
    shortMonths,
    debounce,
    storeValueForItemId,
    recalculateHeight,
    wrapTextSelection,
    addTaskPriority,
    toggleTaskDone,
    insertHashtag,
    documentScrollHeight,
    documentScrollTop,
    scrollPositionForElement,
    showLoading,
    hideLoading,
    showToast,
    buildMiniCalendar,
    generateDay,
    generateItem,
    removeValueForItemId,
    pullUpdatesFromServer,
    loadDataFromServer
} from './core.js';

// Variables for smooth-scrolling animations
let scrollAnimationId = null;
let scrollTarget = null;
let scrollStartPosition = null;
let scrollStartTime = null;
let scrollDuration = 500; // ms
let startTime, startY, goalY;

// For keyboard navigation
let keyboardNavigationMode = false;
let keyboardFocusedDay = null;
let keyboardFocusDate = null;  // used for arrow key navigation

// For range selection
let isSelectingRange = false;
let selectedDays = [];

// For mini-calendar tracking
let lastMiniCalendarMonth = null;
let currentVisibleRow = '';

// Multi-select mode
let isMultiSelectMode = false;

// Function implementations
function showHelp() {
    document.getElementById("help").style.display = "block";
}

function hideHelp() {
    document.getElementById("help").style.display = "none";
}

function goToTodayAndRefresh() {
    // Reset currentCalendarDate to actual system today
    state.currentCalendarDate = new Date(state.systemToday);

    // Reset currentVisibleRow so we don't scroll to an old row
    currentVisibleRow = null;

    // Completely rebuild the calendar with today at the center
    state.calendarTableElement.innerHTML = "";
    loadCalendarAroundDate(state.currentCalendarDate);

    // Increase delay to ensure calendar has time to render
    setTimeout(() => {
        const elem = document.getElementById(idForDate(state.currentCalendarDate));
        if (elem) {
            elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 300);
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode",
        document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
}

function undoLastChange() {
    if (!state.undoStack.length) {
        showToast("Nothing to undo");
        return;
    }
    const data = state.undoStack.pop();
    state.redoStack.push(Object.assign({}, data));
    if (state.redoStack.length > state.MAX_UNDO) {
        state.redoStack.shift();
    }
    for (const k in data) {
        localStorage.setItem(k, data[k]);
    }
    loadCalendarAroundDate(state.currentCalendarDate);
    showToast("Undo applied");
}

function redoLastChange() {
    if (!state.redoStack.length) {
        showToast("Nothing to redo");
        return;
    }
    const data = state.redoStack.pop();
    state.undoStack.push(Object.assign({}, data));
    if (state.undoStack.length > state.MAX_UNDO) {
        state.undoStack.shift();
    }
    for (const k in data) {
        localStorage.setItem(k, data[k]);
    }
    loadCalendarAroundDate(state.currentCalendarDate);
    showToast("Redo applied");
}

function showYearView() {
    const year = state.currentCalendarDate.getFullYear();
    document.getElementById('yearViewTitle').textContent = year;

    const container = document.getElementById('yearViewGrid');
    container.innerHTML = '';
    buildYearView(year, container);

    document.getElementById('yearViewContainer').style.display = 'block';
}

function hideYearView() {
    document.getElementById('yearViewContainer').style.display = 'none';
}

function toggleKeyboardNavMode() {
    if (!keyboardFocusDate) {
        keyboardFocusDate = new Date(state.currentCalendarDate || state.systemToday);
        document.body.classList.add('keyboard-nav-active');
        showToast("Keyboard navigation mode activated (press i to exit)");
        highlightKeyboardFocusedDay();
    } else {
        keyboardFocusDate = null;
        document.body.classList.remove('keyboard-nav-active');
        document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
        showToast("Keyboard navigation mode deactivated");
    }
}

function jumpOneMonthForward() {
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

function jumpOneMonthBackward() {
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

function toggleRangeSelection() {
    isSelectingRange = !isSelectingRange;
    if (!isSelectingRange) {
        clearRangeSelection();
    }
    showToast(isSelectingRange ? "Select range start date" : "Range selection cancelled");
}

function loadCalendarAroundDate(seedDate) {
    showLoading();
    const container = document.getElementById('calendarContainer');
    container.classList.add('loading-calendar');

    // Start from seedDate, roll back to Monday
    state.calendarTableElement.innerHTML = "";
    state.firstDate = new Date(seedDate);
    while (getAdjustedDayIndex(state.firstDate) !== 0) {
        state.firstDate.setDate(state.firstDate.getDate() - 1);
    }
    state.lastDate = new Date(state.firstDate);
    state.lastDate.setDate(state.lastDate.getDate() - 1);

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
            if (state.currentCalendarDate.getMonth() !== lastMiniCalendarMonth) {
                buildMiniCalendar();
                lastMiniCalendarMonth = state.currentCalendarDate.getMonth();
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

function prependWeek() {
    // We'll gather the 7 upcoming days in an array first
    let daysForThisRow = [];

    // Build a list of 7 consecutive days
    for (let i = 0; i < 7; i++) {
        // Move firstDate backward by 1 day
        state.firstDate.setDate(state.firstDate.getDate() - 1);

        // If we discover day=1, insert heading row above
        if (state.firstDate.getDate() === 1) {
            const headingRow = state.calendarTableElement.insertRow(0);
            // Insert at index 0 so it appears above the upcoming week row

            headingRow.classList.add('month-boundary');
            const headingCell = headingRow.insertCell(0);
            headingCell.colSpan = 7;
            headingCell.className = 'extra';
            headingCell.innerHTML =
                months[state.firstDate.getMonth()] + " " + state.firstDate.getFullYear();

            headingRow.dataset.monthIndex = state.firstDate.getMonth();
            headingRow.dataset.year = state.firstDate.getFullYear();
        }

        // Collect this day
        daysForThisRow.push(new Date(state.firstDate));
    }

    // Now we actually create the "week row" at index 0 so it's on top
    const row = state.calendarTableElement.insertRow(0);
    animateRowInsertion(row, 'prepend');

    row.dataset.monthIndex = state.firstDate.getMonth();
    row.dataset.year = state.firstDate.getFullYear();

    // Because we built daysForThisRow from newest to oldest,
    // we may want to reverse it so it displays Monday..Tuesday.. etc
    daysForThisRow.reverse();

    for (let dayObj of daysForThisRow) {
        const cell = row.insertCell(-1);
        generateDay(cell, dayObj);
    }
}

function appendWeek() {
    // We'll gather the 7 upcoming days in an array first
    let daysForThisRow = [];

    // Build a list of 7 consecutive days
    for (let i = 0; i < 7; i++) {
        state.lastDate.setDate(state.lastDate.getDate() + 1);

        // If we're about to generate day=1, insert a heading row for "Month Year"
        if (state.lastDate.getDate() === 1) {
            // Insert a separate row for the heading BEFORE we add the actual day row.
            const headingRow = state.calendarTableElement.insertRow(-1);
            headingRow.classList.add('month-boundary');

            const headingCell = headingRow.insertCell(0);
            headingCell.colSpan = 7; // or 8, if you prefer
            headingCell.className = 'extra';
            headingCell.innerHTML =
                months[state.lastDate.getMonth()] + " " + state.lastDate.getFullYear();

            // Optionally store row data for the heading row
            headingRow.dataset.monthIndex = state.lastDate.getMonth();
            headingRow.dataset.year = state.lastDate.getFullYear();
        }

        // Collect this day in our array
        daysForThisRow.push(new Date(state.lastDate));
    }

    // Now create the "week row" itself and fill it with these 7 days.
    const row = state.calendarTableElement.insertRow(-1);
    animateRowInsertion(row, 'append');

    // For tracking
    row.dataset.monthIndex = state.lastDate.getMonth();
    row.dataset.year = state.lastDate.getFullYear();

    // Fill the cells
    for (let dayObj of daysForThisRow) {
        const cell = row.insertCell(-1);
        generateDay(cell, dayObj);
    }
}

function scrollToToday() {
    const elem = document.getElementById(idForDate(state.currentCalendarDate));
    if (elem) {
        window.scrollTo(0, scrollPositionForElement(elem));
    }
}

function recalculateAllHeights() {
    document.querySelectorAll('textarea').forEach(note => {
        recalculateHeight(note.id);
    });
}

function noteBlurHandler() {
    // Implementation here
}

function lookupItemsForParentId(parentId, callback) {
    // Implementation here
}

// Export functions that need to be accessed by other modules
export {
    showHelp,
    hideHelp,
    goToTodayAndRefresh,
    toggleDarkMode,
    undoLastChange,
    redoLastChange,
    showYearView,
    hideYearView,
    toggleKeyboardNavMode,
    jumpOneMonthForward,
    jumpOneMonthBackward,
    toggleRangeSelection,
    loadCalendarAroundDate,
    prependWeek,
    appendWeek,
    scrollToToday,
    recalculateAllHeights,
    noteBlurHandler,
    lookupItemsForParentId
};

// Initialize the calendar when the window loads
window.onload = async function() {
    // Load data from server
    await loadDataFromServer();

    // Build the calendar around today
    loadCalendarAroundDate(state.currentCalendarDate);

    // Set up scroll observers
    if ('IntersectionObserver' in window) {
        setupScrollObservers();
    } else {
        setInterval(checkInfiniteScroll, 100);
    }

    // Set up auto-pull every 5 minutes
    setInterval(() => {
        pullUpdatesFromServer();
    }, 300000);

    // Initialize UI elements
    const jumpDateInput = document.getElementById("jumpDate");
    if (jumpDateInput) {
        const sys = new Date();
        jumpDateInput.value = sys.getFullYear() + "-" +
                   String(sys.getMonth() + 1).padStart(2, '0') + "-" +
                   String(sys.getDate()).padStart(2, '0');
    }

    // Apply dark mode if enabled
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // Initial calculations
    setTimeout(recalculateAllHeights, 100);

    // Set up scroll listeners
    window.addEventListener('scroll', throttle(updateStickyMonthHeader, 100));
    updateStickyMonthHeader();

    // Header fade effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('solid');
        } else {
            header.classList.remove('solid');
        }
    });
};

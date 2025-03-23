// init/appInit.js

// Import core state variables
import { currentCalendarDate, systemToday, calendarTableElement } from '../core/state.js';

// Import UI functions
import { loadCalendarAroundDate, scrollToToday, goToTodayAndRefresh } from '../ui/calendarUI.js';

// Import scroll and swipe event functions, including fallback scroll check
import { setupScrollObservers, setupHorizontalSwipe, checkInfiniteScroll } from '../events/scrollEvents.js';

// Import server synchronization functions
import { loadDataFromServer, pullUpdatesFromServer } from '../data/serverSync.js';

// Import general event listeners (e.g., for date input, dark mode toggles, etc.)
import { setupEventListeners } from '../events/eventSetup.js';

// Main initialization function
window.onload = async function() {
    // On mobile, enable horizontal swipes for month navigation
    if (window.innerWidth <= 768) {
        setupHorizontalSwipe();
    }

    // Load data from server once
    await loadDataFromServer();

    // Grab the #calendar table element and initialize state
    const calendarElem = document.getElementById("calendar");
    if (calendarElem) {
        // Update the global state with the calendar element
        calendarTableElement = calendarElem;
    } else {
        console.error("Calendar element not found in the DOM.");
    }

    // Set the current calendar date using systemToday
    currentCalendarDate = new Date(systemToday);

    // Build the calendar UI around "today"
    loadCalendarAroundDate(currentCalendarDate);

    // Set up scroll observers or fallback using a periodic check if IntersectionObserver is unsupported
    if ('IntersectionObserver' in window) {
        setupScrollObservers();
    } else {
        setInterval(checkInfiniteScroll, 100);
    }

    // Set up auto-refresh to pull updates from the server every 5 minutes (300,000 ms)
    setInterval(() => {
        pullUpdatesFromServer();
    }, 300000);

    // Initialize additional event listeners (e.g., date input, dark mode toggles)
    setupEventListeners();
};

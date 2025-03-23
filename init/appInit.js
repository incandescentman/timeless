// init/appInit.js
// init/appInit.js

// Import core modules
import { currentCalendarDate, systemToday, calendarTableElement } from '../core/state.js';
import { loadCalendarAroundDate } from '../ui/calendar.js';
import { setupScrollObservers, setupHorizontalSwipe } from '../events/scrollEvents.js';
import { loadDataFromServer, pullUpdatesFromServer } from '../data/serverSync.js';
import { setupEventListeners } from '../events/eventSetup.js';
import { checkInfiniteScroll } from '../events/scrollFallback.js';

// Main initialization function
window.onload = async function() {
    // On mobile, enable horizontal swipes for month navigation
    if (window.innerWidth <= 768) {
        setupHorizontalSwipe();
    }

    // Load data from the server once
    await loadDataFromServer();

    // Grab the #calendar table and initialize state
    calendarTableElement = document.getElementById("calendar");
    currentCalendarDate = new Date(systemToday);

    // Build the calendar around "today"
    loadCalendarAroundDate(currentCalendarDate);

    // Set up scroll observers or fallback
    if ('IntersectionObserver' in window) {
        setupScrollObservers();
    } else {
        setInterval(checkInfiniteScroll, 100);
    }

    // Set up auto-refresh every 5 minutes
    setInterval(() => {
        pullUpdatesFromServer();
    }, 300000); // 300,000 ms = 5 minutes

    // Initialize additional event listeners (e.g., date input, dark mode, etc.)
    setupEventListeners();
};

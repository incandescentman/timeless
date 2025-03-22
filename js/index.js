/*
 * Timeless: The Infinitely Scrolling Calendar - Main Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It imports and initializes all the modules.
 */

// Import core modules
import { initializeState, currentCalendarDate, systemToday } from './modules/state.js';
import { setupUI } from './modules/ui.js';
import { loadCalendarAroundDate } from './modules/calendar.js';
import { setupEventHandlers } from './modules/events.js';
import { loadDataFromServer } from './modules/storage.js';
import { setupScrollObservers, checkInfiniteScroll } from './modules/scroll.js';
import { recalculateAllHeights } from './modules/notes.js';
import { updateStickyMonthHeader } from './modules/header.js';

// Application initialization
window.onload = async function() {
    // 1. Initialize application state
    initializeState();
    
    // 2. Set up UI components
    setupUI();
    
    // 3. Load data from server
    await loadDataFromServer();
    
    // 4. Build the calendar around "today"
    loadCalendarAroundDate(currentCalendarDate);
    
    // 5. Set up scroll observers or fallback
    if ('IntersectionObserver' in window) {
        setupScrollObservers();
    } else {
        setInterval(checkInfiniteScroll, 100);
    }

    // 6. Set up auto-refresh from server every 5 minutes
    setInterval(() => {
        import('./modules/storage.js').then(module => {
            module.pullUpdatesFromServer();
        });
    }, 300000); // 300,000 ms = 5 minutes
    
    // 7. Set initial date in date picker
    const jumpDateInput = document.getElementById("jumpDate");
    if (jumpDateInput) {
        const sys = new Date();
        jumpDateInput.value = sys.getFullYear() + "-" +
                     String(sys.getMonth() + 1).padStart(2, '0') + "-" +
                     String(sys.getDate()).padStart(2, '0');
    }

    // 8. Apply dark mode if enabled
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // 9. Recalculate textarea heights after short delay
    setTimeout(recalculateAllHeights, 100);

    // 10. Setup scroll event listeners
    window.addEventListener('scroll', function() {
        import('./modules/utils.js').then(module => {
            const throttledUpdateHeader = module.throttle(updateStickyMonthHeader, 100);
            throttledUpdateHeader();
        });
    });
    updateStickyMonthHeader();

    // 11. Header opacity effect on scroll
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('solid');
        } else {
            header.classList.remove('solid');
        }
    });
}; 
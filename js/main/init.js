// main/init.js

import { loadDataFromServer, pullUpdatesFromServer } from "../data/serverSync.js";
import { loadCalendarAroundDate, setCalendarTableElement, goToTodayAndRefresh } from "../ui/calendarfunctions.js";
import { setupScrollObservers, checkInfiniteScroll } from "../events/scrollEvents.js";
import { recalculateAllHeights, throttle, updateStickyMonthHeader } from "../ui/dom.js";
import { systemToday, currentCalendarDate } from "../core/state.js";
import { setupAllEventListeners } from "../events/eventSetup.js";

window.onload = async function() {
    // (1) Optionally load data from server once
    await loadDataFromServer();

    // Set up all event listeners
    setupAllEventListeners();

    // (2) Grab the #calendar table element and set it in the calendarfunctions module
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) {
        console.error("Calendar element not found!");
        return;
    }
    setCalendarTableElement(calendarEl);

    // Build the calendar around "today" (using the imported currentCalendarDate)
    loadCalendarAroundDate(currentCalendarDate);
    
    // For mobile devices, automatically go to today's date
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            goToTodayAndRefresh();
        }, 100);
    }

    // (3) Use IntersectionObserver if available; else fallback
    if ('IntersectionObserver' in window) {
        setupScrollObservers();
    } else {
        setInterval(checkInfiniteScroll, 100);
    }

    // Set up a timer to auto-pull every 5 minutes:
    setInterval(() => {
      pullUpdatesFromServer();
    }, 300000); // 300,000 ms = 5 minutes

    // (5) Misc. setup: set #jumpDate to today's date and re-apply dark mode if needed
    const j = document.getElementById("jumpDate");
    if (j) {
        const sys = new Date();
        j.value = sys.getFullYear() + "-" +
                  String(sys.getMonth() + 1).padStart(2, '0') + "-" +
                  String(sys.getDate()).padStart(2, '0');
    }

    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // Recalc <textarea> heights after a short delay
    setTimeout(recalculateAllHeights, 100);

    // Listen for scroll to update the sticky month header
    window.addEventListener('scroll', throttle(updateStickyMonthHeader, 100));
    updateStickyMonthHeader();

    // Additional cosmetic: fade in the top header after scrolling
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('solid');
        } else {
            header.classList.remove('solid');
        }
    });
};

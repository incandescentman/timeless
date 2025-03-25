import { 
    systemToday,
    currentCalendarDate,
    keyboardNavMode
} from './core/state.js';
import { 
    goToTodayAndRefresh,
    updateStickyMonthHeader,
    throttle
} from './ui/calendarfunctions.js';
import { setupHorizontalSwipe } from './swipe.js';

export function setupEventHandlers() {
    // Mobile-specific features
    if (window.innerWidth <= 768) {
        // Redirect to today's date after a timeout
        setTimeout(() => {
            goToTodayAndRefresh();
        }, 1000);
    }

    // Scroll event handlers
    window.addEventListener('scroll', throttle(() => {
        updateStickyMonthHeader();
    }, 100));

    window.addEventListener('scroll', throttle(() => {
        const header = document.querySelector('.sticky-header');
        if (header) {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            header.style.opacity = Math.min(scrollTop / 100, 1);
        }
    }, 100));

    // Setup horizontal swipe for mobile
    setupHorizontalSwipe();

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
    }

    // Date picker
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.value = new Date(currentCalendarDate).toISOString().split('T')[0];
        datePicker.addEventListener('change', (e) => {
            const newDate = new Date(e.target.value);
            currentCalendarDate = newDate;
            loadCalendarAroundDate(newDate);
        });
    }

    // Apply dark mode if previously enabled
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
} 
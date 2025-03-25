import { 
    systemToday,
    currentCalendarDate
} from './core/state.js';
import { showToast } from './ui/dom.js';
import { 
    goToTodayAndRefresh,
    loadCalendarAroundDate
} from './ui/calendarfunctions.js';

export function setupMobileFeatures() {
    // Check if we're on mobile
    if (window.innerWidth <= 768) {
        // Initialize mobile-specific features
        setupMobileUI();
        setupMobileGestures();
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            setupMobileUI();
            setupMobileGestures();
        } else {
            cleanupMobileUI();
        }
    });
}

function setupMobileUI() {
    // Add mobile-specific classes
    document.body.classList.add('mobile-view');
    
    // Show mobile action bar
    const actionBar = document.getElementById('mobile-action-bar');
    if (actionBar) {
        actionBar.style.display = 'flex';
    }

    // Initialize mobile-specific event listeners
    setupMobileEventListeners();
}

function setupMobileEventListeners() {
    // Quick action buttons
    const todayButton = document.getElementById('mobile-today');
    if (todayButton) {
        todayButton.addEventListener('click', () => {
            goToTodayAndRefresh();
            showToast('Jumped to today');
        });
    }

    const newNoteButton = document.getElementById('mobile-new-note');
    if (newNoteButton) {
        newNoteButton.addEventListener('click', () => {
            const today = new Date(systemToday);
            const todayId = `${today.getMonth()}_${today.getDate()}_${today.getFullYear()}`;
            const note = document.createElement('textarea');
            note.className = 'note';
            note.id = nextItemId();
            note.placeholder = 'Add a note...';
            document.getElementById(todayId).appendChild(note);
            note.focus();
        });
    }

    const commandButton = document.getElementById('mobile-command');
    if (commandButton) {
        commandButton.addEventListener('click', () => {
            showCommandPalette();
        });
    }
}

function setupMobileGestures() {
    // Add touch event listeners for mobile gestures
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function cleanupMobileUI() {
    // Remove mobile-specific classes
    document.body.classList.remove('mobile-view');
    
    // Hide mobile action bar
    const actionBar = document.getElementById('mobile-action-bar');
    if (actionBar) {
        actionBar.style.display = 'none';
    }

    // Remove mobile-specific event listeners
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
}

// Mobile gesture handlers
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Handle horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > 50) { // Minimum swipe distance
            if (deltaX > 0) {
                // Swipe right - previous month
                const newDate = new Date(currentCalendarDate);
                newDate.setMonth(newDate.getMonth() - 1);
                currentCalendarDate = newDate;
            } else {
                // Swipe left - next month
                const newDate = new Date(currentCalendarDate);
                newDate.setMonth(newDate.getMonth() + 1);
                currentCalendarDate = newDate;
            }
            loadCalendarAroundDate(currentCalendarDate);
        }
    }
} 
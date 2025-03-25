import { currentCalendarDate } from './core/state.js';
import { loadCalendarAroundDate } from './ui/calendarfunctions.js';

let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;

export function setupHorizontalSwipe() {
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, false);
    document.addEventListener('touchend', handleTouchEnd, false);
}

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchMove(e) {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    
    // Show swipe indicator based on direction
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
        showSwipeIndicator(diff > 0 ? 'left' : 'right');
    } else {
        hideSwipeIndicator();
    }
}

function handleTouchEnd(e) {
    const diff = touchEndX - touchStartX;
    hideSwipeIndicator();
    
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) {
            // Swipe right - go to previous month
            const newDate = new Date(currentCalendarDate);
            newDate.setMonth(newDate.getMonth() - 1);
            currentCalendarDate = newDate;
        } else {
            // Swipe left - go to next month
            const newDate = new Date(currentCalendarDate);
            newDate.setMonth(newDate.getMonth() + 1);
            currentCalendarDate = newDate;
        }
        loadCalendarAroundDate(currentCalendarDate);
    }
}

function showSwipeIndicator(direction) {
    let indicator = document.getElementById('swipe-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'swipe-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.className = `swipe-indicator ${direction}`;
    indicator.style.opacity = '1';
}

function hideSwipeIndicator() {
    const indicator = document.getElementById('swipe-indicator');
    if (indicator) {
        indicator.style.opacity = '0';
    }
} 
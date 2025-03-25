// swipe.js - Handles touch swipe events for mobile navigation

import { jumpOneMonthForward, jumpOneMonthBackward } from './ui/calendarfunctions.js';

// Variables for swipe detection
let touchStartX = 0;
let touchEndX = 0;
const MIN_SWIPE_DISTANCE = 50; // Minimum swipe distance to trigger action

export function setupHorizontalSwipe() {
    // Only set up on mobile devices or touch-enabled devices
    if (!('ontouchstart' in window)) return;

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchend', handleTouchEnd, false);
}

function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
}

function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    
    // Check if swipe is long enough
    if (Math.abs(swipeDistance) < MIN_SWIPE_DISTANCE) return;
    
    if (swipeDistance > 0) {
        // Swiped right - go to previous month
        jumpOneMonthBackward();
    } else {
        // Swiped left - go to next month
        jumpOneMonthForward();
    }
}
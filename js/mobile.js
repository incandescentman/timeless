// mobile.js - Mobile-specific functionality

import { goToTodayAndRefresh, jumpOneMonthForward, jumpOneMonthBackward } from './ui/calendarfunctions.js';
import { setupHorizontalSwipe } from './swipe.js';

export function setupMobileFeatures() {
    // Only run on mobile devices
    if (window.innerWidth > 768) return;
    
    // Set up swipe navigation
    setupHorizontalSwipe();
    
    // Configure the mobile action bar
    setupMobileActionBar();
    
    // Auto-scroll to today's date after a short delay
    setTimeout(() => {
        goToTodayAndRefresh();
    }, 500);
    
    // Add viewport meta tag to prevent zooming if not already present
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
        document.head.appendChild(viewport);
    }
    
    // Add touch-specific CSS class to body
    document.body.classList.add('touch-device');
    
    // Modify calendar display for smaller screens
    adjustCalendarForMobile();
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustCalendarForMobile, 300);
    });
}

function setupMobileActionBar() {
    const actionBar = document.getElementById('mobileActions');
    if (!actionBar) return;
    
    // Make sure the action bar is visible
    actionBar.style.display = 'flex';
    
    // Connect any buttons that might not have event handlers
    const todayButton = actionBar.querySelector('button[title="Today"]');
    if (todayButton) {
        todayButton.addEventListener('click', goToTodayAndRefresh);
    }
    
    const prevButton = actionBar.querySelector('button[title="Previous Month"]');
    if (prevButton) {
        prevButton.addEventListener('click', jumpOneMonthBackward);
    }
    
    const nextButton = actionBar.querySelector('button[title="Next Month"]');
    if (nextButton) {
        nextButton.addEventListener('click', jumpOneMonthForward);
    }
}

function adjustCalendarForMobile() {
    // Adjust day cell heights to fit screen
    const availableHeight = window.innerHeight;
    const headerHeight = document.getElementById('header')?.offsetHeight || 0;
    const actionBarHeight = document.getElementById('mobileActions')?.offsetHeight || 0;
    
    // Calculate ideal row height (consider 6 rows per month view)
    const rowHeight = Math.floor((availableHeight - headerHeight - actionBarHeight) / 6);
    
    // Apply to CSS variable if we use one, or directly to cells
    document.documentElement.style.setProperty('--day-cell-height', `${rowHeight}px`);
    
    // Simplify UI by hiding optional elements
    document.querySelectorAll('.desktop-only').forEach(el => {
        el.style.display = 'none';
    });
}
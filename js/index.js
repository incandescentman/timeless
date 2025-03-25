/*
 * Timeless: The Infinitely Scrolling Calendar - Main Entry Point
 * 
 * This file serves as the main entry point for the application.
 * It imports and initializes all the modules.
 */

import { 
    systemToday,
    currentCalendarDate,
    initializeState
} from './core/state.js';
import { setupUI } from './ui/dom.js';
import { 
    loadCalendarAroundDate, 
    recalculateAllHeights,
    goToTodayAndRefresh
} from './ui/calendarfunctions.js';
import { pullUpdatesFromServer } from './data/serverSync.js';
import { setupEventHandlers } from './events.js';
import { setupKeyboardNavigation } from './navigation.js';
import { setupMobileFeatures } from './mobile.js';

// Main entry point for the application
// Imports and initializes all modules

window.onload = async () => {
    // Initialize application state
    initializeState();

    // Setup UI components
    if (!setupUI()) {
        console.error('Failed to set up UI components');
        return;
    }

    // Load data from server
    await pullUpdatesFromServer();

    // Build calendar around current date
    loadCalendarAroundDate(currentCalendarDate);

    // Setup event handlers
    setupEventHandlers();

    // Setup keyboard navigation
    setupKeyboardNavigation();

    // Setup mobile features
    setupMobileFeatures();

    // Auto-refresh from server every 5 minutes
    setInterval(pullUpdatesFromServer, 5 * 60 * 1000);

    // Recalculate textarea heights after a short delay
    setTimeout(recalculateAllHeights, 100);
}; 
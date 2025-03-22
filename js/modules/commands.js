/*
 * commands.js - Command Handlers
 * 
 * This module contains handler functions for various commands
 * triggered via keyboard shortcuts or the command palette.
 */

import { toggleDarkMode as toggleDarkModeUtil } from './utils.js';
import { undoLastChange as undo, redoLastChange as redo } from './history.js';
import { showToast } from './utils.js';
import { clearRangeSelection, isSelectingRange } from './rangeSelection.js';

/**
 * Toggle dark mode and save preference
 */
export function toggleDarkMode() {
    toggleDarkModeUtil();
}

/**
 * Undo the last change
 */
export function undoLastChange() {
    undo();
}

/**
 * Redo the last undone change
 */
export function redoLastChange() {
    redo();
}

/**
 * Toggle keyboard navigation mode
 */
export function toggleKeyboardNavMode() {
    import('./keyboard.js').then(module => {
        module.toggleKeyboardNavMode();
    });
}

/**
 * Toggle range selection mode
 */
export function toggleRangeSelection() {
    import('./rangeSelection.js').then(module => {
        module.toggleRangeSelection();
    });
}

/**
 * Hide help dialog if showing
 */
export function hideHelp() {
    document.getElementById("help").style.display = "none";
}

/**
 * Show help dialog
 */
export function showHelp() {
    document.getElementById("help").style.display = "block";
} 
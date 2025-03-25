/*
 * history.js - History Management
 * 
 * This module handles undo/redo functionality by storing
 * snapshots of localStorage.
 */

import { undoStack, redoStack, MAX_UNDO } from './state.js';
import { showToast } from './utils.js';
import { loadCalendarAroundDate } from './calendar.js';
import { currentCalendarDate } from './state.js';

/**
 * Creates a JSON snapshot of localStorage and pushes it onto undoStack
 */
export function pushUndoState() {
    redoStack = []; // Clear redo stack on new action
    const snapshot = {};
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            snapshot[key] = localStorage[key];
        }
    }
    undoStack.push(JSON.stringify(snapshot));
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    }
}

/**
 * Pops from undoStack, overwrites localStorage, and refreshes the calendar
 */
export function undoLastChange() {
    if (!undoStack.length) {
        showToast("No undo history available");
        return;
    }
    // Save current for redo
    const currentSnapshot = {};
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            currentSnapshot[key] = localStorage[key];
        }
    }
    redoStack.push(JSON.stringify(currentSnapshot));

    const lastSnap = undoStack.pop();
    if (!lastSnap) return;

    localStorage.clear();
    const data = JSON.parse(lastSnap);
    for (const k in data) {
        localStorage.setItem(k, data[k]);
    }
    loadCalendarAroundDate(currentCalendarDate);
    showToast("Undo applied");
}

/**
 * Restores from redoStack, pushing current state onto undoStack
 */
export function redoLastChange() {
    if (!redoStack.length) {
        showToast("No redo history available");
        return;
    }
    const nextState = redoStack.pop();
    pushUndoState();  // Current goes to undo

    localStorage.clear();
    const data = JSON.parse(nextState);
    for (const k in data) {
        localStorage.setItem(k, data[k]);
    }
    loadCalendarAroundDate(currentCalendarDate);
    showToast("Redo applied");
} 
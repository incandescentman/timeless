/*
 * header.js - Header Management
 * 
 * This module handles the sticky month header and its updating.
 */

import { currentVisibleRow, months } from './state.js';

/**
 * Updates the sticky month header based on the current visible row
 */
export function updateStickyMonthHeader() {
    const headerEl = document.getElementById('header');
    headerEl.style.display = window.innerWidth <= 768 ? 'none' : '';

    const headerOffset = headerEl.offsetHeight + 30;
    const rows = document.querySelectorAll('#calendar tr');
    let foundRow = null;
    for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if ((rect.top >= headerOffset && rect.top <= window.innerHeight) ||
            (rect.top < headerOffset && rect.bottom > headerOffset)) {
            foundRow = row;
            break;
        }
    }

    if (foundRow) {
        currentVisibleRow = foundRow;
        const monthIndex = parseInt(foundRow.dataset.monthIndex, 10);
        const year = parseInt(foundRow.dataset.year, 10);
        const monthName = months[monthIndex] || "???";
        const stickyElem = document.getElementById('stickyMonthHeader');
        stickyElem.textContent = `${monthName} ${year}`;
        stickyElem.style.display = 'block';
    }
} 
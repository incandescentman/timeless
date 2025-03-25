/*
 * animations.js - Animation Utilities
 * 
 * This module handles animations like smooth scrolling
 * and row insertion effects.
 */

import { ROW_ANIMATION_CLASS, startTime, startY, goalY } from './state.js';
import { curve, documentScrollTop } from './utils.js';
import { hideLoading } from './utils.js';

/**
 * Animates from startY to goalY over ~1 second using curve()
 */
export function scrollAnimation() {
    const percent = (new Date() - startTime) / 1000;
    if (percent > 1) {
        window.scrollTo(0, goalY);
        hideLoading();
    } else {
        const newY = Math.round(startY + (goalY - startY)*curve(percent));
        window.scrollTo(0, newY);
        setTimeout(scrollAnimation, 10);
    }
}

/**
 * Adds a CSS class to animate row insertion at top or bottom
 */
export function animateRowInsertion(row, direction = 'append') {
    row.classList.add(ROW_ANIMATION_CLASS);
    row.classList.add(direction === 'append' ? 'append-animate' : 'prepend-animate');
    row.addEventListener('animationend', () => {
        row.classList.remove(ROW_ANIMATION_CLASS, 'append-animate', 'prepend-animate');
    }, { once: true });
} 
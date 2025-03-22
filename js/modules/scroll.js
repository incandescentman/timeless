/*
 * scroll.js - Scroll Management
 * 
 * This module handles infinite scrolling, scroll observers,
 * and other scroll-related functionality.
 */

import { prependWeek, appendWeek } from './calendar.js';
import { documentScrollTop, documentScrollHeight, throttle } from './utils.js';
import { recalculateAllHeights } from './notes.js';
import { updateStickyMonthHeader } from './header.js';
import { systemToday } from './state.js';

/**
 * Uses IntersectionObserver to detect hitting top/bottom sentinels, then loads more weeks
 */
export function setupScrollObservers() {
    const opts = { rootMargin: '200px' };

    const topObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            const oldH = documentScrollHeight();
            for (let i = 0; i < 8; i++) {
                prependWeek();
            }
            window.scrollBy(0, documentScrollHeight() - oldH);
            recalculateAllHeights();
            updateStickyMonthHeader();
        }
    }, opts);

    const botObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            for (let i = 0; i < 8; i++) {
                appendWeek();
            }
            recalculateAllHeights();
            updateStickyMonthHeader();
        }
    }, opts);

    topObs.observe(document.getElementById('top-sentinel'));
    botObs.observe(document.getElementById('bottom-sentinel'));

    // Also check if the system day changed
    setInterval(() => {
        const newSys = new Date();
        if (newSys.toDateString() !== systemToday.toDateString()) {
            systemToday = newSys;
            // If the visual "today" is out of date, reload
            if (!document.querySelector('.current-day-dot')) {
                location.reload();
            }
        }
    }, 60000);
}

/**
 * Fallback approach if IntersectionObserver is not supported
 */
export function checkInfiniteScroll() {
    if (documentScrollTop() < 200) {
        const oldH = documentScrollHeight();
        for (let i = 0; i < 8; i++) {
            prependWeek();
        }
        window.scrollBy(0, documentScrollHeight() - oldH);
        recalculateAllHeights();
    } else if (documentScrollTop() > documentScrollHeight() - window.innerHeight - 200) {
        for (let i = 0; i < 8; i++) {
            appendWeek();
        }
        recalculateAllHeights();
    }

    // Also watch for system date changes
    const newSys = new Date();
    if (newSys.toDateString() !== systemToday.toDateString()) {
        systemToday = newSys;
        if (!document.querySelector('.current-day-dot')) {
            location.reload();
        }
    }
}

/**
 * Setup horizontal swipe detection for mobile
 */
export function setupHorizontalSwipe() {
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 80;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        // left => next month
        if (touchEndX < touchStartX - swipeThreshold) {
            showSwipeIndicator('left');
            import('./navigation.js').then(module => {
                module.jumpOneMonthForward();
            });
        }
        // right => previous month
        else if (touchEndX > touchStartX + swipeThreshold) {
            showSwipeIndicator('right');
            import('./navigation.js').then(module => {
                module.jumpOneMonthBackward();
            });
        }
    }

    function showSwipeIndicator(direction) {
        const indicator = document.createElement('div');
        indicator.style.position = 'fixed';
        indicator.style.top = '50%';
        indicator.style.padding = '10px 20px';
        indicator.style.background = 'rgba(0,0,0,0.7)';
        indicator.style.color = 'white';
        indicator.style.borderRadius = '20px';
        indicator.style.zIndex = '1000';
        indicator.style.transform = 'translateY(-50%)';

        if (direction === 'left') {
            indicator.textContent = 'Next Month →';
            indicator.style.right = '20px';
        } else {
            indicator.textContent = '← Previous Month';
            indicator.style.left = '20px';
        }

        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.3s';
            setTimeout(() => indicator.remove(), 300);
        }, 800);
    }
} 
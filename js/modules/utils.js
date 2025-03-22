/*
 * utils.js - Utility Functions
 * 
 * This module contains general utility functions used throughout the application.
 */

/**
 * Throttle a function to be called at most once per delay milliseconds
 */
export function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

/**
 * Debounce a function, only triggered after user stops activity for delay ms
 */
export function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Show/hide the "help" overlay
 */
export function showHelp() {
    document.getElementById("help").style.display = "block";
}

export function hideHelp() {
    document.getElementById("help").style.display = "none";
}

/**
 * Show/hide a loading spinner overlay
 */
export function showLoading() {
    document.getElementById('loadingIndicator').classList.add('active');
}

export function hideLoading() {
    document.getElementById('loadingIndicator').classList.remove('active');
}

/**
 * Shows a temporary message pop-up (toast) in the corner
 */
export function showToast(message, duration=3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => { toast.style.opacity = '1'; });

    // After "duration" ms, fade out
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, duration);
}

/**
 * Cross-browser ways to measure scroll position and total height
 */
export function documentScrollTop() {
    return Math.max(document.body.scrollTop, document.documentElement.scrollTop);
}

export function documentScrollHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

/**
 * A custom easing function for smooth scrolling
 */
export function curve(x) {
    // cubic-based easing: slow at start/end, faster in middle
    return (x < 0.5)
      ? (4 * x*x*x)
      : (1 - 4*(1 - x)*(1 - x)*(1 - x));
}

/**
 * Returns a vertical offset so element is near the vertical center of the viewport
 */
export function scrollPositionForElement(element) {
    let y = element.offsetTop;
    let node = element;
    while (node.offsetParent && node.offsetParent !== document.body) {
        node = node.offsetParent;
        y += node.offsetTop;
    }
    const clientHeight = element.clientHeight;
    return y - (window.innerHeight - clientHeight) / 2;
}

/**
 * Toggle dark mode and save preference
 */
export function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
    showToast(document.body.classList.contains("dark-mode") ? "Dark mode enabled" : "Light mode enabled");
} 
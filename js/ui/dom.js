// ui/dom.js

import { setCalendarTableElement } from './calendarfunctions.js';

// Function to set up UI elements
export function setupUI() {
  // Apply dark mode if previously enabled
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
  
  // Set up calendar table element
  const calendarTable = document.getElementById('calendarTable');
  if (calendarTable) {
    setCalendarTableElement(calendarTable);
  } else {
    console.error('Calendar table element not found');
    return false;
  }
  
  // Initialize date picker if present
  const datePicker = document.getElementById('date-picker');
  if (datePicker) {
    const today = new Date();
    datePicker.value = today.toISOString().split('T')[0];
  }
  
  // Set up sticky header if present
  const stickyHeader = document.getElementById('stickyMonthHeader');
  if (stickyHeader) {
    updateStickyMonthHeader();
  }

  return true;
}

export function showLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('active');
  }
}

export function hideLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.classList.remove('active');
  }
}

export function showToast(message, duration = 3000) {
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

  // After "duration" ms, fade out and remove the toast
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export function recalculateAllHeights() {
  document.querySelectorAll('textarea').forEach(ta => recalculateHeight(ta.id));
}

// Helper function to recalculate a single textarea's height
export function recalculateHeight(itemId) {
  const ta = document.getElementById(itemId);
  if (!ta) return;
  ta.style.height = "0";
  ta.style.height = (ta.scrollHeight + 5) + "px";
}

// Make this function available globally
window.recalculateHeight = recalculateHeight;

// Function to highlight keyboard-focused day
export function highlightKeyboardFocusedDay() {
  // Remove previous highlights
  document.querySelectorAll('.keyboard-focus').forEach(el => 
    el.classList.remove('keyboard-focus'));
  
  // Get the keyboard focus date from global state
  const keyboardFocusDate = window.keyboardFocusDate || null;
  if (!keyboardFocusDate) return;
  
  // Create ID for the date
  const id = idForDate(keyboardFocusDate);
  const elem = document.getElementById(id);
  
  if (elem) {
    elem.classList.add('keyboard-focus');
    elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Function to generate a new item (textarea) for a calendar day
export function generateItem(parentId, itemId) {
  const item = document.createElement("textarea");
  const parent = document.getElementById(parentId);
  if (!parent) return null; // offscreen items aren't generated
  parent.appendChild(item);
  item.id = itemId;
  item.spellcheck = false;
  // Add event listeners
  item.addEventListener("keydown", window.keydownHandler || function(){}); 
  item.addEventListener("blur", window.checkItem || function(){});
  return item;
}

// Process tags in notes (e.g., #hashtags, priorities)
export function processNoteTags(note) {
  if (!note || !note.value) return;
  
  // Implement tag processing from original calendar.js
  // Detect and mark up special syntax in notes
  const text = note.value;
  
  // Process priority markers
  if (text.includes("[#A]") || text.includes("[#1]")) {
    note.classList.add("priority-high");
  } else if (text.includes("[#B]") || text.includes("[#2]")) {
    note.classList.add("priority-medium");
  } else if (text.includes("[#C]") || text.includes("[#3]")) {
    note.classList.add("priority-low");
  } else {
    note.classList.remove("priority-high", "priority-medium", "priority-low");
  }
  
  // Process completed tasks
  if (text.startsWith("DONE ") || text.startsWith("✓ ")) {
    note.classList.add("done-item");
  } else {
    note.classList.remove("done-item");
  }
}

// Parse date from an ID string like "1_15_2023"
export function parseDateFromId(id) {
  if (!id || typeof id !== 'string') return null;
  
  const parts = id.split('_');
  if (parts.length !== 3) return null;
  
  // Format is month_day_year
  const month = parseInt(parts[0], 10);  // 0-11
  const day = parseInt(parts[1], 10);    // 1-31
  const year = parseInt(parts[2], 10);   // Full year
  
  // Check for valid parts
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

// --- New helper functions added for calendar functions ---

// Adjusts the day index: JS: Sunday = 0 becomes 6; Monday becomes 0, etc.
export function getAdjustedDayIndex(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

// Creates a unique id string for a given date (e.g. "2_14_2025")
export function idForDate(date) {
  return date.getMonth() + "_" + date.getDate() + "_" + date.getFullYear();
}

// Animates row insertion by adding and then removing CSS classes.
export function animateRowInsertion(row, direction = 'append') {
  row.classList.add('week-row-animate');
  row.classList.add(direction === 'append' ? 'append-animate' : 'prepend-animate');
  row.addEventListener('animationend', () => {
    row.classList.remove('week-row-animate', 'append-animate', 'prepend-animate');
  }, { once: true });
}

// Returns the current document scroll top position
export function documentScrollTop() {
  return Math.max(document.body.scrollTop, document.documentElement.scrollTop);
}

// Returns the total scrollable height of the document
export function documentScrollHeight() {
  return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

// Calculates the scroll position so that an element is vertically centered
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

// Updates the sticky month header based on the row nearest the top
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
    const monthIndex = parseInt(foundRow.dataset.monthIndex, 10);
    const year = parseInt(foundRow.dataset.year, 10);
    const monthsArr = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthsArr[monthIndex] || "???";
    const stickyElem = document.getElementById('stickyMonthHeader');
    if (stickyElem) {
      stickyElem.textContent = `${monthName} ${year}`;
      stickyElem.style.display = 'block';
    }
  }
}

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

// Debounce function to prevent rapid repeated calls
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Function to aid in smooth scrolling with easing
export function curve(t) {
    return (t < 0.5) ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Smooth scroll to a specific element with animation
export function smoothScrollToElement(element, duration = 500) {
    if (!element) return;
    
    const start = documentScrollTop();
    const target = scrollPositionForElement(element);
    const startTime = Date.now();
    
    function scroll() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed >= duration) {
            window.scrollTo(0, target);
            return;
        }
        
        const t = elapsed / duration;
        const ease = curve(t);
        const position = start + (target - start) * ease;
        
        window.scrollTo(0, position);
        requestAnimationFrame(scroll);
    }
    
    scroll();
}

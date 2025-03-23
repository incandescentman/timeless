// ui/dom.js

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
function recalculateHeight(itemId) {
  const ta = document.getElementById(itemId);
  if (!ta) return;
  ta.style.height = "0";
  ta.style.height = (ta.scrollHeight + 5) + "px";
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
